# Task 7-expenses-credits — Expenses & Credits Agent

## Scope
Build the Expenses module + Credits module with full CRUD APIs for a Mexican cantina/bar management system (Next.js 16, App Router, Prisma/SQLite, shadcn/ui, @tanstack/react-query, sonner).

## Files created
- `src/app/api/expenses/route.ts` — GET (filter by `?date=` or `?from=&to=`) + POST
- `src/app/api/expenses/[id]/route.ts` — PUT + DELETE
- `src/app/api/credits/route.ts` — GET (filter by `?status=`) + POST
- `src/app/api/credits/[id]/route.ts` — PUT (mark-as-paid / cancel / edit) + DELETE
- `src/components/modules/expenses.tsx` — `ExpensesModule` (named + default export)
- `src/components/modules/credits.tsx` — `CreditsModule` (named + default export)

## Key implementation details
- Next.js 16 async params pattern used: `params: Promise<{ id: string }>` with `await params`.
- Dates stored at noon (`T12:00:00`) to avoid TZ edge cases.
- `Expense.paymentMethod` validated against EFECTIVO/ELECTRONICO; `category` against SUELDO/COMISION/COMPRA/SERVICIO/GENERAL.
- `Credit.status` validated against PENDIENTE/PAGADO/CANCELADO. Reverting status to PENDIENTE or CANCELADO auto-clears `paidDate` and `paymentMethod`.
- CreditsModule fetches ALL credits once (no status filter) so it can compute summary cards (total pendiente, pagado este mes, count pendiente) and applies the active tab filter client-side.
- ExpensesModule uses `?date=` filter for single-day view and no filter when "Todas" toggle is on.

## Design
- Amber/orange/emerald/rose accents only (NO indigo/blue).
- Spanish UI labels.
- Mobile-first responsive; tables scroll horizontally on mobile.
- Touch-friendly icon buttons (h-9 w-9); primary CTAs h-10.
- Badge colors per category/status.

## Lint
- `bun run lint` runs clean (zero errors) after fixing one React Compiler warning about `useMemo` memoization in credits.tsx (replaced with direct derived expression).

## Dependencies on other agents
- `page.tsx` already imports both modules — they resolve correctly now.
- The Prisma schema (already present) contains the `Expense` and `Credit` models matching the spec.
- The remaining missing-module errors in dev.log (`staff`, `inventory`, `products`, `cash-closing`, `dashboard`, `reports`, `sales`) belong to other agents and are not part of this task.
