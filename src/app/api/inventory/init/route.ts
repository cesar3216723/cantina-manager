import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function computeFields(initialQty: number, entry: number, exit: number) {
  const finalQty = (initialQty || 0) + (entry || 0) - (exit || 0);
  const difference = 0 - finalQty; // physicalCount (0) - finalQty
  return { finalQty, difference };
}

// POST /api/inventory/init
// Body: { date: "YYYY-MM-DD" }
// Idempotently initializes inventory for the date by copying the previous
// day's finalQty as initialQty for all active products. Records that already
// exist for the date are left untouched.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date } = body || ({} as { date?: string });

    if (!date) {
      return NextResponse.json(
        { error: "La fecha es obligatoria" },
        { status: 400 }
      );
    }

    const dateObj = parseDate(date);
    if (!dateObj) {
      return NextResponse.json(
        { error: "Fecha invalida" },
        { status: 400 }
      );
    }

    // 1. Find active products
    const activeProducts = await db.product.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    if (activeProducts.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: 0,
        records: [],
      });
    }

    // 2. Existing records for the date (idempotency: skip these)
    const existingForDate = await db.dailyInventory.findMany({
      where: {
        date: { gte: startOfDay(dateObj), lte: endOfDay(dateObj) },
      },
      include: { product: true },
    });
    const existingMap = new Map(existingForDate.map((r) => [r.productId, r]));

    // 3. Previous day's records (for initialQty = prevDay.finalQty)
    const prevDay = new Date(dateObj);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevRecords = await db.dailyInventory.findMany({
      where: {
        date: { gte: startOfDay(prevDay), lte: endOfDay(prevDay) },
      },
    });
    const prevMap = new Map(prevRecords.map((r) => [r.productId, r.finalQty]));

    // Obtener las ventas del dia para setear las salidas correctas
    const salesGrouped = await db.sale.groupBy({
      by: ['productId'],
      where: {
        date: { gte: startOfDay(dateObj), lte: endOfDay(dateObj) }
      },
      _sum: {
        quantity: true
      }
    });
    const salesMap = new Map(salesGrouped.map((s) => [s.productId, s._sum.quantity ?? 0]));

    // 4. Create missing records
    const toCreate = activeProducts.filter(
      (p) => !existingMap.has(p.id)
    );

    const created: Awaited<
      ReturnType<typeof db.dailyInventory.create>
    >[] = [];

    if (toCreate.length > 0) {
      // Use a transaction so the operation is atomic
      const txResults = await db.$transaction(
        toCreate.map((p) => {
          const initialQty = prevMap.get(p.id) ?? 0;
          const exit = salesMap.get(p.id) ?? 0;
          const { finalQty, difference } = computeFields(initialQty, 0, exit);
          return db.dailyInventory.create({
            data: {
              date: dateObj,
              productId: p.id,
              initialQty,
              entry: 0,
              exit,
              finalQty,
              physicalCount: 0,
              difference,
              observations: null,
            },
            include: { product: true },
          });
        })
      );
      created.push(...txResults);
    }

    // 5. Return all records for the date (existing + created) sorted by category/name
    const allForDate = await db.dailyInventory.findMany({
      where: {
        date: { gte: startOfDay(dateObj), lte: endOfDay(dateObj) },
      },
      include: { product: true },
      orderBy: [
        { product: { category: "asc" } },
        { product: { sortOrder: "asc" } },
        { product: { name: "asc" } },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        created: created.length,
        skipped: existingForDate.length,
        records: allForDate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/inventory/init]", error);
    return NextResponse.json(
      { error: "Error al inicializar el inventario" },
      { status: 500 }
    );
  }
}
