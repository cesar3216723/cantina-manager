# Task ID: 2-dashboard - Dashboard Agent

## Goal
Build the Dashboard module (overview with KPIs and charts) and its API.

## Plan
- READ worklog.md + prisma schema + lib/format + lib/api-client + sidebar + page.tsx + existing modules.
- Create `/api/dashboard/route.ts` GET with Prisma aggregations.
- Create `src/components/modules/dashboard.tsx` (`DashboardModule` named export).
- Lint & verify.
- APPEND section to worklog.md.

## Notes
- Other agents have created: sales, inventory, products, staff, expenses, credits, cash-closing modules.
- `reports.tsx` is referenced by page.tsx but not yet created by sibling agent — out of scope.
- Schema models available: Product, Staff, Sale, TokenSale, DailyInventory, Expense, Credit, StaffPayment, DailyCashClosing.
- Palette: amber/orange/emerald/rose/slate. NO indigo/blue.
- recharts is installed.

## Work log (final)

### Files created
1. `src/app/api/dashboard/route.ts` — GET (optional `?date=YYYY-MM-DD` defaults today). Runs 12 Prisma queries in parallel (Promise.all): 4 sales aggregates (total, PUBLICO, PERSONAL, complimentary count, salesCount), expense aggregate, credits pending aggregate, staffPayment aggregate, top-5 products via `groupBy(productId)` + parallel product fetch, week sales findMany for chart, active products count, and latest inventory findMany (ordered by date desc) for low-stock + valuation. Computes week daily buckets (last 7 days seeded oldest→newest), bestDay, avgDailySales, totalInventoryValue (sum of latest finalQty * product.purchasePrice), and alerts (pending credits, no sales today, expenses w/o sales, low stock critical/bajo, no inventory).
2. `src/components/modules/dashboard.tsx` — `"use client"` named export `DashboardModule`. Props `{ onNavigate? }`. Sections:
   - Amber→orange gradient hero with date + utilidad de hoy badge.
   - 4 KPI cards (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4): Ventas Hoy (amber, clickable→sales), Gastos Hoy (rose, clickable→expenses), Utilidad Neta (emerald if ≥0 else rose, icon swaps TrendingUp/TrendingDown), Creditos Pendientes (orange, clickable→credits). Each card has a gradient icon background, hover effect (when clickable) and a small arrow that appears on hover.
   - 2-col row (lg:grid-cols-3, chart spans 2): Sales chart (recharts BarChart, h-64 parent, amber bars with last-day bar in orange, tooltip formatted as currency with date label, "Sin datos" empty state) + Alerts panel (color-coded: amber/rose/slate, ScrollArea max-h-80, empty state "Todo en orden").
   - 2-col row: Top Products Today (ol with rank badges, category badges using CATEGORY_COLORS, horizontal bar visualization, link to sales) + Inventory Status (2 stat tiles — active products + inventory value, plus low-stock list with rose badges, ScrollArea max-h-56, "Stock suficiente" emerald state when none).
   - Quick Actions: 4 buttons (Registrar Venta→sales, Ver Inventario→inventory, Corte de Caja→cash-closing, Ver Reportes→reports), gradient icon backgrounds with accent variants.
3. `src/components/modules/reports.tsx` — **Placeholder stub** created so the dev server compiles (page.tsx imports `ReportsModule` but no sibling agent has shipped reports yet). Minimal "modulo en construccion" placeholder. Reports Agent should overwrite this file with the real implementation. This is NOT a modification to page.tsx — just providing the missing import target.

### Tech & design compliance
- shadcn/ui: Card, CardHeader, CardTitle, CardContent, Button, Badge, Skeleton, ScrollArea.
- lucide-react: ShoppingBag, Receipt, TrendingUp, TrendingDown, CreditCard, AlertTriangle, XCircle, Info, ArrowRight, Package, Wallet, BarChart3, Loader2 (unused, removed), ShoppingCart, Boxes, FileBarChart.
- recharts: BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell.
- @tanstack/react-query `useQuery` for `["dashboard"]` query.
- `@/lib/api-client` apiFetch, `@/lib/format` formatCurrency/formatNumber/formatDate/CATEGORY_COLORS.
- Spanish throughout. Mobile-first responsive (1→2→4 cols, stacked charts on mobile). Touch-friendly (h-11 quick action buttons). Amber/orange/emerald/rose/slate palette — NO indigo/blue. Loading skeletons everywhere. Semantic HTML (`section` with aria-label, `ol`/`li`, `button`).

### Lint & runtime verification
- `bun run lint` → exit 0, no errors/warnings.
- `bunx tsc --noEmit` filtered for dashboard files → no errors.
- `curl /api/dashboard` returns 200 with valid JSON: today.totalSales, topProducts[5], week.dailySales[7], bestDay, inventory totals, alerts[]. Confirmed Prisma aggregations execute correctly (visible in dev.log).
- `curl /` returns 200; grep confirms all 11 dashboard section labels render in HTML (Ventas Hoy, Gastos Hoy, Utilidad Neta, Creditos Pendientes, Bienvenido a tu Cantina, Ventas de la Semana, Top Productos de Hoy, Estado Inventario, Registrar Venta, Corte de Caja, Acciones rapidas).

### Summary
Dashboard module and API complete and lint-clean. Files:
- `src/app/api/dashboard/route.ts`
- `src/components/modules/dashboard.tsx`
- `src/components/modules/reports.tsx` (temporary placeholder for sibling agent — to be overwritten)
