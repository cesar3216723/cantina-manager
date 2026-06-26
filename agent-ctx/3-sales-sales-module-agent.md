# Task ID: 3-sales
**Agent:** Sales Module Agent

## Goal
Build the Sales module (daily sales capture: PUBLICO, PERSONAL) and its API. This is the CORE module of the cantina system - it replicates the Excel "VENTA PUBLICO" and "VENTA PERSONAL" sections.

## Files Created

### API routes

1. **`src/app/api/sales/route.ts`** — GET + POST
   - GET: filters `?date=`, `?saleType=PUBLICO|PERSONAL`, `?staffId=`, `?from=&to=`. Date parsed at noon to avoid TZ issues. Includes `product` and `staff` relations. Ordered by date desc then createdAt desc.
   - POST: accepts single sale object OR array (batch). Looks up product to get current `salePrice`/`purchasePrice` if not provided. Calculates `total = quantity * unitPrice`. Validates `staffId` required for PERSONAL. Returns 201 with created record(s) including relations.

2. **`src/app/api/sales/[id]/route.ts`** — PUT + DELETE
   - PUT: partial update of `quantity`, `unitPrice`, `purchasePrice`, `isComplimentary`, `staffId`, `saleType`, `date`. Recalculates `total` (0 if isComplimentary). Uses Next.js 16 async params pattern `params: Promise<{ id: string }>`.
   - DELETE: hard delete with existence check (404 if not found).

3. **`src/app/api/sales/batch/route.ts`** — POST (critical grid-save endpoint)
   - Body: `{ date: "YYYY-MM-DD", items: [{productId, saleType, quantity, isComplimentary, staffId?}] }` (also accepts raw array of items each with own date).
   - Loads all referenced products/staff and the day's existing sales in parallel for fast lookups.
   - For each item builds composite key: `${productId}|${saleType}|${staffId ?? ""}`.
   - If `quantity > 0`: upserts (update if exists, create if not) — refreshes `unitPrice`/`purchasePrice` from product, recalculates `total` (0 if cortesia).
   - If `quantity === 0`: deletes existing record if any (silent skip if not exists).
   - Returns `{ date, results[], records[], summary: { created, updated, deleted, skipped } }`.

### UI module

4. **`src/components/modules/sales.tsx`** — `SalesModule` (named export)
   - **Outer `SalesModule`**: Date toolbar (prev/today/next + native date input) + queries for products, staff, and sales (PUBLICO + PERSONAL) for the selected date. While loading shows skeleton; once data ready renders `<SalesEditor key={selectedDate} ... />`. The `key` pattern remounts the editor when the date changes — this gives fresh draft state from server data without violating the React Compiler `set-state-in-effect` rule.
   - **Inner `SalesEditor`**: holds all draft state (initialized from server data via `useState(() => ...)`), summary cards, and Tabs.
   - **Summary cards**: Venta Publico, Venta Personal, Cortesias del dia (computed live from draft).
   - **Tab "Venta Publico"**: Table grouped by category (CERVEZA, BOTANA, REFRESCO, MIX, SERVICIO, OTROS) with subheader rows. Columns: Producto / $ Compra / $ Venta / Cantidad (editable number input) / $ Total (auto-calc, shows strikethrough + "CORTESIA" badge when cortesia) / Cortesia (Switch). Sticky header/footer. Footer shows TOTAL DE VENTA + cortesia badge.
   - **Tab "Venta Personal"**: Matrix of products (rows) × staff (columns). Sticky product column + sticky header + sticky footer. Each cell has quantity input + conditional "C" cortesia checkbox (only when qty > 0). Footer shows per-staff totals + cortesia counts + Grand Total row.
   - **Guardar** button per tab calls `/api/sales/batch` with all items (qty=0 triggers delete on backend). Shows toast with summary on success. **Limpiar** button clears draft for the active tab.
   - **Empty states** for no products / no staff.

## Design compliance
- Spanish language throughout.
- Amber/orange/emerald accent palette — NO indigo or blue.
- Mobile-first responsive: tables scroll horizontally + vertically (max-h-[70vh]); sticky headers/footers; sticky product column in the personal matrix.
- Touch-friendly: inputs h-9, icon buttons h-9 w-9, primary Guardar buttons h-9.
- Loading skeletons; clear toast feedback on save.
- Used `@/lib/format` (formatCurrency, formatDateInput, todayDateInput, CATEGORY_COLORS).
- Used `@/lib/api-client` (apiFetch).
- @tanstack/react-query for server state; sonner for toasts; shadcn/ui (Tabs, Card, Button, Input, Table*, Switch, Checkbox, Badge, Skeleton); lucide-react icons.

## Key engineering decisions
- **Avoiding `set-state-in-effect`**: Split into outer fetcher + inner `SalesEditor` keyed by `selectedDate`. Draft state is initialized from server data via `useState(() => buildMap(...))` so changing date remounts the editor with fresh state — no effect-based syncing needed. After save, only `invalidateQueries({ queryKey: ["sales"] })` is called so the parent cache is fresh for the next date navigation; the editor's local draft already matches the saved server state.
- **Batch upsert logic**: composite key `(productId|saleType|staffId)` lets the backend find existing records without a DB unique constraint (the Prisma `Sale` model has no `@@unique`). Single round-trip to load all existing sales for the day, then per-item create/update/delete.
- **Cortesia handling**: when `isComplimentary=true`, `total` is set to 0; UI shows strikethrough original amount + "CORTESIA" badge so user sees both the value and the zero.
- **Date handling**: backend parses `YYYY-MM-DD` as `T12:00:00` to avoid TZ shift; frontend uses same convention.

## Lint / type check
- `bun run lint` on sales files: 0 errors, 0 warnings.
- `bunx tsc --noEmit` on sales files: 0 errors.
- Project-wide lint/tsc errors remain for sibling-agent modules (`dashboard`, `inventory`, `reports`, `cash-closing.tsx` has a set-state-in-effect issue) — out of scope for this task.

## Stage Summary
All 4 required files created and lint-clean. The Sales module replicates the Excel VENTA PUBLICO and VENTA PERSONAL sheets with inline editing, batch save with upsert/delete-on-zero semantics, and live totals. It wires directly into the existing sidebar/page routing (page.tsx already imports `SalesModule`). The Prisma schema already contained the `Sale` model, so no DB migration was required. The `/api/sales/batch` endpoint provides the diff-based save the UI needs; the `/api/sales` GET with date+saleType filters supports both this module and the Staff module's personal-consumption lookup.
