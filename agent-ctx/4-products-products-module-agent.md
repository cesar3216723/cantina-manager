# Task 4-products — Products Module Agent

## Task
Build the Products module (catalog CRUD) and its API.

## Files Created
- `src/app/api/products/route.ts` — GET (list with category/active filters, ordered by sortOrder asc) + POST (create with validation).
- `src/app/api/products/[id]/route.ts` — GET single, PUT update, DELETE hard delete with dependency guard (returns 409 if product has sales/inventory/tokenSales).
- `src/components/modules/products.tsx` — `ProductsModule` named export, client component.

## Work Log
- Read worklog.md and project structure (page.tsx, sidebar.tsx, schema.prisma, format.ts, api-client.ts).
- Confirmed Prisma `Product` model already exists; did not modify schema.prisma.
- Created list/create API route with category whitelist (CERVEZA, BOTANA, REFRESCO, MIX, SERVICIO, OTROS), name uniqueness check (409), and safe defaults.
- Created `[id]` API route: GET/PUT/DELETE. DELETE checks Sale, DailyInventory, TokenSale counts and returns 409 with descriptive message; also wraps in try/catch fallback for FK constraint.
- Built `ProductsModule` UI with:
  - Summary cards (total products, active, avg margin %).
  - Search by name/presentation, active filter (Select), category filter chips using CATEGORY_COLORS.
  - Responsive: desktop table (Nombre, Categoria, Presentacion, $ Compra, $ Venta, Margen, Estado, Acciones) + mobile card list.
  - Profit margin column with color coding (emerald/amber/orange/destructive) and live preview in form.
  - Create/Edit Dialog with name, category (Select), presentation, purchasePrice, salePrice, sortOrder, active (Switch).
  - Delete confirmation with AlertDialog.
  - Toast notifications via sonner.
  - React Query (useQuery + useMutation + invalidateQueries).
  - Amber/orange gradient accents; no indigo/blue; touch-friendly 11px (h-11) buttons.
  - All labels and messages in Spanish.
- Ran `bun run lint` — no errors in my files (exit 0).

## Stage Summary
- Products module is fully functional: list, search, filter by category/active, create, edit, delete with FK guard.
- API routes use `import { db } from "@/lib/db"` and follow Next.js 16 route handler conventions (`params: Promise<{id}>`).
- UI is mobile-first responsive with amber/orange cantina theme.
- Awaiting sibling agents to create the remaining modules (staff, etc.) so the full page compiles.
