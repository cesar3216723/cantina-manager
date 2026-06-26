# Task ID: 6-cash-closing
## Agent: Cash Closing Agent

### Summary
Built the Cash Closing module ("Corte de Caja") and its full API. The module replicates the Excel "RESUMEN DEL DIA" section, allowing the user to perform daily cash reconciliation: enter caja inicial/final, split sales into cash/electronic, view auto-calculated expenses/staff-payments/credits lists, and produce a final resumen with utilidad and caja difference.

### Files created
1. `src/app/api/cash-closing/route.ts` — GET (`?date=YYYY-MM-DD` returns single closing or null; `?from=&to=` returns array ordered desc; no filter returns all). POST performs an upsert (finds existing by date range, updates or creates). All numeric fields coerced via `num()` helper; date stored at noon to avoid TZ issues.
2. `src/app/api/cash-closing/[id]/route.ts` — GET (by id), PUT (partial update of any field), DELETE. Uses Next.js 16 async-params pattern (`params: Promise<{ id: string }>`).
3. `src/app/api/cash-closing/calculate/route.ts` — POST with `{date}`. Runs 6 queries in parallel via `Promise.all`: sales aggregate, expenses findMany, staff payments aggregate + findMany (with staff include), credits aggregate + findMany (paidDate in range, status=PAGADO). Returns computed totals (`totalSales`, `totalExpenses`, `cashExpenses`, `electronicExpenses`, `staffPayments`, `creditsPaid`, etc.) plus the lists (`expensesList`, `staffPaymentsList`, `creditsPaidList`) for display. **Does NOT save anything.** `electronicSales`/`cashSales` default to 0 (user decides split). Suggested final values are 0 in the response (UI computes them live from inputs).
4. `src/components/modules/cash-closing.tsx` — Client module `CashClosingModule` (named + default export).

### Component architecture (avoids setState-in-effect lint rule)
- **Outer** `CashClosingModule`: owns `selectedDate` state, renders inner with `key={selectedDate}` so it remounts on date change.
- **Inner** `CashClosingInner`: owns the two `useQuery` hooks (existing closing + calc). Waits for both to be loaded, then renders `CashClosingForm` with `key={date + "-" + (existing?.id ?? "new") + "-" + (existing?.updatedAt ?? "")}` so the form remounts whenever the saved record identity changes (first save, or any subsequent save where updatedAt bumps).
- **Form** `CashClosingForm`: initialises state via `useState(() => formFromClosing(existing))` (no useEffect needed). Only editable user inputs live in form state — derived values (`totalSales`, `totalExpenses`, `cashExpenses`, `electronicExpenses`, `staffPayments`, `creditsPaid`) are read directly from `calc` for both display and save payload.
- **Save mutation** `onSuccess`: optimistically updates `form.closed` if `closedValue` was supplied (so the UI flips to closed/open instantly), then invalidates `["cash-closing", date]` and `["cash-closing"]` queries. The refetch returns the updated record, the form's key changes, and it re-initialises from the freshly-saved data.
- **Calcular button** in `Toolbar`: calls `calcQuery.refetch()` to refresh derived values (e.g., when new sales/expenses were added since the page was opened). No form state is touched, so user edits are preserved.

### UI layout
- **Toolbar**: prev/next day + native date input + status badge (amber "Abierto" / emerald "Cerrado") + amber "Calcular" outline button.
- **Cerrar Corte / Abrir Corte button**: emerald "Cerrar Corte" when open, amber "Abrir Corte" when closed. Placed at top-right of the form area. Both also appear in the footer Save card for redundancy.
- **Main grid** (1 col mobile, 2 cols lg):
  - Left column: Venta del Dia (read-only total + cash/electronic inputs + amber Alert if split ≠ total), Caja Inicial, Caja Final (with dashed "sugerido" panel), Entregas (with total), Revision / Diferencias (audit difference with color-coded Sobrante/Faltante/Cuadra chip).
  - Right column: Gastos del Dia (table + 3-tile totals: Efectivo/Electronico/Total), Pagos a Personal (table with sueldo/comision/consumo/a pagar + footer total), Creditos Cobrados Hoy (table + total), Resumen Final (amber-bordered card with Ingresos, Egresos + sublabel breakdown, Utilidad separator-row, then Caja Efectivo comparison block with Esperada/Real/Diferencia color-coded).
- **Footer card**: Notas textarea + Guardar/Abrir Corte button.
- When `closed=true`: all inputs disabled, save button becomes "Abrir Corte".
- Color coding: emerald = positive/good, rose = negative/bad, amber = warnings/info, orange = electronic method, purple = credits section icon.

### shadcn/ui components used
Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Textarea, Badge, Table (Header/Body/Row/Head/Cell/Footer), Separator, Alert (Title/Description).

### lucide-react icons used
Wallet, Calculator, Lock, Unlock, Save, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Loader2, Banknote, CreditCard, Receipt, Users, Coins, Scale.

### Other libraries
- `@tanstack/react-query` (useQuery + useMutation + useQueryClient).
- `sonner` toast for feedback.
- `@/lib/api-client` `apiFetch`.
- `@/lib/format` `formatCurrency`, `formatDateInput`, `todayDateInput`.

### Design compliance
- Spanish language throughout.
- Mobile-first responsive (grid-cols-1 → lg:grid-cols-2, tables wrapped in `max-h-72 overflow-y-auto`).
- Touch-friendly: primary buttons `h-11` (44px), inputs `h-11`, icon buttons `h-9 w-9`.
- Amber/orange/emerald/rose/purple accents only — NO indigo or blue.
- Loading skeletons, empty states with dashed borders, color-coded badges.

### Schema
No schema changes — `DailyCashClosing` model already existed in `prisma/schema.prisma`. No `db:push` was required.

### Lint
- First lint attempt: hit `react-hooks/set-state-in-effect` error (calling setState in useEffect to sync form from existing/calc data). Refactored to key-based remount pattern + reading derived values directly from `calc` (no useEffect needed). Also hit a `Cannot redeclare block-scoped variable 'creditsPaid'` TypeScript error in calculate route (variable name collision between aggregation result and final sum) — renamed the destructured list to `creditsPaidListRows` and mapped it to `creditsPaidList`.
- Final `bun run lint` runs clean with zero errors and zero warnings.
- `bunx tsc --noEmit` shows no errors in cash-closing files (only sibling-module errors remain for parallel agents to resolve).

### Notes for sibling agents / future work
- The page.tsx already imports `CashClosingModule` from `@/components/modules/cash-closing` and renders it when `activeView === "cash-closing"` — no wiring needed.
- The dev server still fails to compile page.tsx because sibling modules (sales, inventory, dashboard, reports) are not yet present. Once those are delivered by their respective agents, the full app will compile.
- `DailyInventory` and `TokenSale` totals are NOT included in the cash-closing calculate endpoint (per spec — only Sale, Expense, StaffPayment, Credit). Token sales are reflected indirectly through StaffPayment.commission (which is sourced from token sales in the staff module).
