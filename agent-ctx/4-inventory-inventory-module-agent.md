# Task 4-inventory — Inventory Module Agent

## Task
Build the Inventory module (daily stock management with physical count) and its API. Replicates the Excel "INVENTARIO" section.

## Work Log

### Context review
- Read `/home/z/my-project/worklog.md` to understand context and conventions used by sibling agents (Products, Staff, Expenses & Credits).
- Read `prisma/schema.prisma`: confirmed `DailyInventory` model already exists with all required fields (id, date, productId, initialQty, entry, exit, finalQty, physicalCount, difference, observations) and `@@unique([date, productId])` + `@@index([date])`. No schema changes needed.
- Read `src/lib/db.ts`, `src/lib/format.ts`, `src/lib/api-client.ts` to follow project conventions.
- Read existing routes (`/api/expenses/route.ts`, `/api/expenses/[id]/route.ts`, `/api/products/route.ts`) for the Next.js 16 async-params pattern and date handling.
- Read `src/components/modules/expenses.tsx` and `staff.tsx` for component conventions (shadcn/ui, react-query, sonner toast, amber palette).
- Verified `db:push` — schema already in sync; no migration required.

### API routes created
1. **`src/app/api/inventory/route.ts`**
   - `GET /api/inventory` with filters `?date=YYYY-MM-DD` (single day) or `?from=&to=` (range), includes product, ordered by date desc then product sortOrder.
   - **Auto-init from previous day**: when a single `?date=` is requested and there are zero records for that date, it copies each active product's previous-day `finalQty` as `initialQty`, computes `finalQty`/`difference` (physicalCount=0), and returns the freshly upserted records. Lets the UI render a populated grid on first visit.
   - `POST` (upsert by `date_productId`): accepts `date, productId, initialQty, entry, exit, physicalCount, observations`; auto-calculates `finalQty = initialQty + entry - exit` and `difference = physicalCount - finalQty`. Validates date (noon parse) and product existence.
2. **`src/app/api/inventory/[id]/route.ts`** — `PUT` (partial update; recalculates derived fields using new-or-existing values) and `DELETE`. Uses `params: Promise<{ id: string }>` (Next.js 16 pattern).
3. **`src/app/api/inventory/batch/route.ts`** — `POST { date, items: [{productId, initialQty, entry, exit, physicalCount, observations}] }`. Validates all productIds upfront, then upserts each item inside a `db.$transaction` for atomicity. Returns `{ success, count, records }`.
4. **`src/app/api/inventory/init/route.ts`** — `POST { date }`. **Idempotent**: finds existing records for the date (skips them), copies previous day's `finalQty` as `initialQty` for the rest of the active products, creates the missing records inside a transaction, then returns ALL records for the date (existing + created) ordered by category/sortOrder/name. Response shape `{ success, created, skipped, records }`.

### UI component
**`src/components/modules/inventory.tsx`** — `"use client"`, named export `InventoryModule`.

- **State**: `selectedDate` (default today), `overrides` (per-product partial edits), `dirty` flag. Avoids `useEffect`+`setState` cascades (which the React Compiler lint rule forbids in sibling modules) by merging server data with local overrides via `useMemo`.
- **Toolbar**: prev/next day icon buttons + native date input + "Inicializar Inventario" button (calls `/api/inventory/init`, toast on success) + "Guardar" button (disabled when not dirty; calls `/api/inventory/batch`).
- **Summary cards (4)**: Productos (count), Valor Inventario (Σ finalQty × purchasePrice), Diferencias Totales (Σ difference, signed), Valor Diferencia (Σ difference × purchasePrice). Icons and accents adapt to the sign (emerald=0, rose<0, amber>0).
- **Main table** (grouped by category with subheader rows showing category badge + count):
  - Columns: Producto (name + presentation), $ Compra, $ Venta, Inicial (editable), Entrada (editable, emerald ring), Salida (editable, rose ring), Final (read-only, amber-tinted background), $ Compra Total (hidden on `<lg`), $ Venta Total (hidden on `<lg`), Conteo Fisico (editable), Diferencia (badge, color-coded), Observaciones (editable text input).
  - **Live calculation**: `finalQty` and `difference` are computed on every render from current row state — the user sees updates instantly while typing.
  - **Footer**: totals row (Inicial, Entrada, Salida, Final, $ Compra Total, $ Venta Total, Diferencia) with color-coded difference.
  - **Dirty hint**: amber strip below the table reminding the user to save when there are unsaved changes.
- **Loading**: 8 skeleton rows while queries are pending.
- **Empty / error states** with helpful messaging.
- **Day navigation** clears overrides + dirty flag so the new date loads cleanly.

### Design compliance
- Spanish language throughout.
- Mobile-first responsive: 2-col summary cards on mobile → 4-col on `lg`; table wraps in `overflow-x-auto`; $ totals columns hidden on `<lg`.
- Touch-friendly inputs: `h-9` number inputs with `w-[72px]`, `h-9` icon buttons, `h-10` primary actions.
- Palette: amber/orange/emerald/rose only — NO indigo, NO blue.
- Color-coded difference: emerald (0), rose (negative), amber (positive). Same scheme reused in summary cards and footer.
- Used `@/lib/format` (formatCurrency, formatDateInput, todayDateInput, CATEGORY_COLORS).
- Used `@/lib/api-client` (apiFetch) for all API calls.
- @tanstack/react-query for server state, sonner toasts for feedback.
- shadcn/ui components used: Button, Input, Badge, Card, Table* (incl. TableFooter), Skeleton.
- lucide-react icons: Package, Boxes, Save, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Loader2.

### Lint
- Ran `bunx eslint src/app/api/inventory/ src/components/modules/inventory.tsx` → clean (no errors, no warnings).
- `bunx tsc --noEmit` shows zero errors in any inventory-owned file (remaining errors in dev.log are for sibling modules being developed by parallel agents: dashboard, cash-closing, reports, and a pre-existing lint error in `sales.tsx`).

### Files created
- `src/app/api/inventory/route.ts`
- `src/app/api/inventory/[id]/route.ts`
- `src/app/api/inventory/batch/route.ts`
- `src/app/api/inventory/init/route.ts`
- `src/components/modules/inventory.tsx`

## Stage Summary
The Inventory module is complete and lint-clean. All 5 required files are created with full CRUD + batch + idempotent init. The UI renders a category-grouped editable grid with live calculation of `finalQty` and `difference`, totals in the footer, color-coded differences, and a save button that POSTs the whole grid in a single transactional batch call. Auto-initialization from the previous day's `finalQty` happens both on `GET ?date=` (transparent, when no records exist) and on demand via the `/api/inventory/init` button. The module plugs into `src/app/page.tsx` (which already imports `InventoryModule` from `@/components/modules/inventory`).
