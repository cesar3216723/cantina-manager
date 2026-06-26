# Task 5-staff — Staff Module Agent

## Task
Build the **Staff module** (employees management with salaries and commissions) and its API for the Mexican cantina/bar management system.

## Files Created / Modified
- `src/app/api/staff/route.ts` — GET (list ordered by sortOrder asc) + POST (create with unique-name check).
- `src/app/api/staff/[id]/route.ts` — GET, PUT (partial update + unique-name check), DELETE (hard delete, FK errors -> 409).
- `src/app/api/staff/payments/route.ts` — GET (filters: `?date=`, `?from=&to=`, `?staffId=`, includes staff) + POST (auto-calculates `totalToPay = salary + commission - consumption`).
- `src/app/api/staff/tokens/route.ts` — GET (same filters, includes product + staff) + POST (auto-calculates `total = quantity * unitPrice` and `commission = quantity * unitPrice / 6`).
- `src/app/api/staff/tokens/[id]/route.ts` — DELETE (bonus, needed by UI delete button).
- `src/app/api/staff/payments/[id]/route.ts` — DELETE (bonus, for parity / cleanup).
- `src/components/modules/staff.tsx` — `StaffModule` named export ("use client").

## Design Decisions
- **Commission model**: When POSTing a TokenSale without an explicit `commission`, the API uses `quantity * unitPrice / 6` (i.e. $10 commission per $60 ficha, ~$13.33 per $80 ficha). The UI shows this calculation as a live preview.
- **Personal-sales consumption**: `PaymentsTab` calls `/api/sales?saleType=PERSONAL&date=YYYY-MM-DD`. To remain resilient if the sales API is not implemented yet (parallel agent's task), the query uses `.catch(() => [])` so consumption simply reads as 0.
- **Form state reset**: Instead of `useEffect` + `setState` (forbidden by the project's `react-hooks/set-state-in-effect` lint rule), the form is a child `StaffForm` component remounted via `key={editing?.id ?? "new"}` so it picks up fresh initial state on each open.
- **FK-safe delete**: `DELETE /api/staff/[id]` catches Prisma `P2003` (foreign-key violation) and returns 409 with a helpful message suggesting to deactivate instead.
- **Colors**: Amber/orange/emerald accents only (no indigo/blue). Commission values use emerald, consumption values use orange, "Pagado" badge uses emerald.

## Validation
- `bun run lint` — passes with zero errors.
- `tsc --noEmit` — no staff-related errors (remaining errors are for sibling modules being developed in parallel).

## UI Summary
Two tabs:
1. **Personal** — staff table (Nombre, Sueldo diario, Estado, Acciones) with "Nuevo" button, Dialog form (name, salary, sortOrder, active switch), AlertDialog delete confirmation.
2. **Pagos y Fichas** — date picker (default today) + two cards:
   - **Venta de Fichas**: form (personal, producto, cantidad, precio ficha) with live total/commission preview; table with delete + totals footer.
   - **Pago de Personal**: per-staff table (Sueldo, Comision from today's tokens, Consumo from today's PERSONAL sales, A Pagar = sueldo + comision - consumo), "Registrar Pago" button creates StaffPayment, "Pagado"/"Pendiente" badge reflects existing payments for the day.
