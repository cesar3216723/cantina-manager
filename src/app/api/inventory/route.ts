import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

// Helper: parse a YYYY-MM-DD string into a noon Date (avoid TZ issues)
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

// Compute derived fields
function computeFields(initialQty: number, entry: number, exit: number, physicalCount: number) {
  const finalQty = (initialQty || 0) + (entry || 0) - (exit || 0);
  const difference = (physicalCount || 0) - finalQty;
  return { finalQty, difference };
}

// GET /api/inventory
//   ?date=YYYY-MM-DD       -> inventory for that day (auto-init from prev day if none)
//   ?from=&to=             -> range filter
//   No filter              -> all records
// Always includes the related product.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: {
      date?: { gte?: Date; lte?: Date };
    } = {};

    if (date) {
      const d = parseDate(date);
      if (!d) {
        return NextResponse.json(
          { error: "Fecha invalida" },
          { status: 400 }
        );
      }
      where.date = { gte: startOfDay(d), lte: endOfDay(d) };
    } else if (from || to) {
      const filter: { gte?: Date; lte?: Date } = {};
      if (from) {
        const fd = parseDate(from);
        if (fd) filter.gte = startOfDay(fd);
      }
      if (to) {
        const td = parseDate(to);
        if (td) filter.lte = endOfDay(td);
      }
      if (Object.keys(filter).length > 0) where.date = filter;
    }

    const records = await db.dailyInventory.findMany({
      where,
      include: { product: true },
      orderBy: [{ date: "desc" }, { product: { sortOrder: "asc" } }],
    });

    // Auto-initialize when querying a single date with no records:
    // copy the previous day's finalQty as initialQty for active products.
    if (date && records.length === 0) {
      const d = parseDate(date);
      if (d) {
        const prev = new Date(d);
        prev.setDate(prev.getDate() - 1);
        const prevRecords = await db.dailyInventory.findMany({
          where: {
            date: { gte: startOfDay(prev), lte: endOfDay(prev) },
          },
          include: { product: true },
        });

        // Map of productId -> finalQty from previous day (defaults to 0)
        const prevMap = new Map<string, number>();
        for (const r of prevRecords) {
          prevMap.set(r.productId, r.finalQty);
        }

        const activeProducts = await db.product.findMany({
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });

        if (activeProducts.length > 0) {
          const created = await Promise.all(
            activeProducts.map((p) => {
              const initialQty = prevMap.get(p.id) ?? 0;
              const { finalQty, difference } = computeFields(
                initialQty,
                0,
                0,
                0
              );
              return db.dailyInventory.upsert({
                where: {
                  date_productId: { date: d, productId: p.id },
                },
                update: {},
                create: {
                  date: d,
                  productId: p.id,
                  initialQty,
                  entry: 0,
                  exit: 0,
                  finalQty,
                  physicalCount: 0,
                  difference,
                  observations: null,
                },
                include: { product: true },
              });
            })
          );
          return NextResponse.json(created);
        }
      }
    }

    return NextResponse.json(records);
  } catch (error) {
    console.error("[GET /api/inventory]", error);
    return NextResponse.json(
      { error: "Error al obtener el inventario" },
      { status: 500 }
    );
  }
}

// POST /api/inventory  (upsert by date+productId)
// Body: { date, productId, initialQty?, entry?, exit?, physicalCount?, observations? }
// Auto-calc: finalQty = initialQty + entry - exit; difference = physicalCount - finalQty
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, productId, initialQty, entry, exit, physicalCount, observations } = body;

    if (!date) {
      return NextResponse.json(
        { error: "La fecha es obligatoria" },
        { status: 400 }
      );
    }
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "El producto es obligatorio" },
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

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const initialQtyNum = Number(initialQty ?? 0) || 0;
    const entryNum = Number(entry ?? 0) || 0;
    const exitNum = Number(exit ?? 0) || 0;
    const physicalCountNum = Number(physicalCount ?? 0) || 0;
    const obs =
      typeof observations === "string" && observations.trim()
        ? observations.trim()
        : null;

    const { finalQty, difference } = computeFields(
      initialQtyNum,
      entryNum,
      exitNum,
      physicalCountNum
    );

    const record = await db.dailyInventory.upsert({
      where: {
        date_productId: { date: dateObj, productId },
      },
      update: {
        initialQty: initialQtyNum,
        entry: entryNum,
        exit: exitNum,
        finalQty,
        physicalCount: physicalCountNum,
        difference,
        observations: obs,
      },
      create: {
        date: dateObj,
        productId,
        initialQty: initialQtyNum,
        entry: entryNum,
        exit: exitNum,
        finalQty,
        physicalCount: physicalCountNum,
        difference,
        observations: obs,
      },
      include: { product: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[POST /api/inventory]", error);
    return NextResponse.json(
      { error: "Error al guardar el inventario" },
      { status: 500 }
    );
  }
}
