# Task ID: 8-reports
**Agent name:** Reports Agent

## Task
Build the Reports module (analytics and trends) and its API.

## Work log
- Read worklog.md and existing context: prisma/schema.prisma, src/lib/db.ts, src/lib/format.ts, src/lib/api-client.ts, src/app/page.tsx, src/app/api/sales/route.ts, src/app/api/expenses/route.ts, src/app/api/staff/route.ts, src/components/modules/expenses.tsx, src/components/ui (table, tabs, card).
- Confirmed Prisma models already exist (Product, Staff, Sale, TokenSale, DailyInventory, Expense, Credit, StaffPayment, DailyCashClosing). No schema changes.
- Created `src/app/api/reports/route.ts` (NextResponse, dynamic = "force-dynamic"). GET endpoint dispatches by `?type=` query param. All six report types implemented:
  - `sales-by-period`: per-day { publico, personal, total } + totals. Cortesias excluded from totals. Uses `db.sale.findMany` + in-memory aggregation per YYYY-MM-DD.
  - `products-by-period`: per-product { quantity, revenue, cost, profit, margin% } sorted by revenue desc. Includes product name + category via `select: { product: { select: ... } }`.
  - `categories-by-period`: per-category aggregates with share %.
  - `profit-by-period`: per-day { totalRevenue, totalCost, profit, margin% } + totals. cost = sum(quantity * purchasePrice).
  - `staff-performance`: per-staff { totalTokenSales, commission, personalConsumption, payments, paymentsSalary, paymentsCommission, paymentsConsumption } joining staff + tokenSale + personal sales + staffPayment. Uses `db.tokenSale` (singular model name in Prisma).
  - `summary`: KPIs (totalSales, totalCost, totalProfit, margin%, totalExpenses, totalStaffPayments, daysInRange, bestDay, worstDay, topProduct) — Promise.all of three queries for efficiency.
- Helper functions: `parseDateAtNoon`, `toYMD`, `enumerateDays` (with 400-day safety limit). Range queries use `gte: startOfDay(from), lte: endOfDay(to)`.
- Created `src/components/modules/reports.tsx` ("use client", named export `ReportsModule`, also default export):
  - State: `draftRange` (editing), `committedRange` (fetched), `activeTab`. Default range = last 30 days. On mount, `committedRange` is already set so the first useQuery fires immediately — page isn't empty.
  - Header Card with two date inputs (Desde / Hasta) + "Generar" button (sets `committedRange` from `draftRange`) + quick range buttons (Hoy, Esta semana, Este mes, Ultimos 30 dias) + "Exportar Excel" CSV button.
  - Single `useQuery(["reports", from, to], fetchAll)` that Promise.alls all 6 endpoints and returns a `ReportsBundle`. `staleTime: 30s` to prevent refetch storms on tab switches.
  - KPI row (4 cards): Ventas Totales, Costo Total, Utilidad Bruta (margin color-coded via subtitle), Gastos Operativos (Expenses + StaffPayments). Each card has icon + accent color (amber/orange/emerald/rose).
  - 5 Tabs:
    - **Ventas por Dia**: stacked BarChart (Publico amber + Personal emerald) + scrollable table with best/worst day highlighted (emerald/rose rows + badges), footer with totals.
    - **Top Productos**: horizontal BarChart (layout=vertical) of top 15 by revenue with Ingreso+Utilidad bars; table with Producto/Categoria/Cantidad/Ingreso/Costo/Utilidad/Margen (color-coded MarginBadge).
    - **Por Categoria**: PieChart with per-category colors (CATEGORY_CHART_COLOR mapping) + detail table with share %.
    - **Utilidad**: ComposedChart with bars for Ingreso/Costo + line for Utilidad; table with per-day Margen badge.
    - **Personal**: BarChart comparing Fichas/Comisiones/Sueldos per staff + table with Nombre/Fichas/Comisiones/Consumo personal/Sueldos pagados/Neto a pagar (badge for inactive staff). All tables use `max-h-96 overflow-y-auto` with sticky header/footer.
  - CSV export: builds CSV string based on `activeTab`, creates Blob (with BOM for Spanish Excel), triggers anchor download. Filename includes tab name + date range.
- Sub-components: `KpiCard`, `CategoryBadge`, `MarginBadge` (color-coded: >=60 emerald, >=30 amber, >=0 orange, <0 rose), `EmptyState`.
- Design compliance:
  - Spanish language throughout.
  - NO indigo / NO blue. Palette: amber (#f59e0b), orange (#f97316), emerald (#10b981), rose (#e11d48), purple (#a855f7), pink (#ec4899), yellow (#eab308), slate (#64748b).
  - Mobile-first: charts `h-56 sm:h-72`, KPI grid 1 -> 2 -> 4 cols, tabs list flex-wraps, tables use `max-h-96 overflow-y-auto`.
  - Touch-friendly: primary buttons h-10, quick-range buttons h-8 text-xs, date inputs h-10.
  - Charts have fixed-height parent containers (h-56 / h-64 / h-72 / h-80). ResponsiveContainer fills 100%.
  - Loading skeletons for KPIs and main tab area; error card on isError; empty states per tab when no data.
  - shadcn/ui: Card, Button, Input, Label, Badge, Table (+Header/Body/Row/Head/Cell/Footer), Tabs (+List/Trigger/Content), Skeleton.
  - lucide-react: BarChart3, TrendingUp, TrendingDown, Download, Calendar, Package, Users, PieChart, DollarSign, Percent, Loader2, Sparkles.
  - recharts: BarChart, Bar, LineChart, Line, PieChart (as RechartsPie), Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart.
  - @tanstack/react-query for server state, sonner toasts.
  - `@/lib/api-client` (apiFetch) + `@/lib/format` (formatCurrency, formatNumber, formatDateShort, formatDateInput, todayDateInput).

## Lint / TypeScript
- Initial `bunx tsc --noEmit` flagged one error: `Property 'tokenSales' does not exist on type 'PrismaClient'. Did you mean 'tokenSale'?` — Prisma model accessors are singular. Renamed `db.tokenSales` -> `db.tokenSale` in the staff-performance handler. Clean after fix.
- `bun run lint` runs with zero errors and zero warnings.
- `bunx tsc --noEmit` shows no errors in reports files (remaining tsc errors are for sibling example/skills folders unrelated to this task).
- Verified endpoints via curl: `?type=summary`, `?type=sales-by-period`, `?type=staff-performance` all return 200 with expected JSON structure.

## Summary
The Reports module and its API are complete and lint-clean. The API route `/api/reports?type=<report>&from=&to=` serves all six required report types using efficient `findMany` + in-memory aggregation (no N+1 queries — each report type issues 1-3 Prisma queries total). The UI ships with date range + quick presets, 4 KPI cards, and 5 detailed tabs each pairing a recharts visualization with a scrollable table, plus a CSV export button that exports the active tab's data. The module is already wired into `src/app/page.tsx` (renders `ReportsModule` when `activeView === "reports"`). No schema migration was required.

Files created:
- `src/app/api/reports/route.ts`
- `src/components/modules/reports.tsx`
