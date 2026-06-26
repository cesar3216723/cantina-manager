import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function computeFields(
  initialQty: number,
  entry: number,
  exit: number,
  physicalCount: number
) {
  const finalQty = (initialQty || 0) + (entry || 0) - (exit || 0);
  const difference = (physicalCount || 0) - finalQty;
  return { finalQty, difference };
}

interface BatchItem {
  productId: string;
  initialQty?: number;
  entry?: number;
  exit?: number;
  physicalCount?: number;
  observations?: string | null;
}

// POST /api/inventory/batch
// Body: { date: "YYYY-MM-DD", items: BatchItem[] }
// Upserts each item for the given date. Returns the resulting records.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, items } = body || ({} as { date?: string; items?: BatchItem[] });

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
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items debe ser un arreglo" },
        { status: 400 }
      );
    }

    // Validate productIds upfront
    const productIds = items
      .map((i: BatchItem) => i.productId)
      .filter((id: unknown) => typeof id === "string" && id);
    if (productIds.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron productos validos" },
        { status: 400 }
      );
    }

    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validIds = new Set(products.map((p) => p.id));
    const invalid = productIds.filter((id: string) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Productos no encontrados: ${invalid.join(", ")}` },
        { status: 404 }
      );
    }

    // Upsert each item within a transaction for atomicity
    const results = await db.$transaction(
      items.map((item: BatchItem) => {
        const initialQtyNum = Number(item.initialQty ?? 0) || 0;
        const entryNum = Number(item.entry ?? 0) || 0;
        const exitNum = Number(item.exit ?? 0) || 0;
        const physicalCountNum = Number(item.physicalCount ?? 0) || 0;
        const obs =
          typeof item.observations === "string" && item.observations.trim()
            ? item.observations.trim()
            : null;

        const { finalQty, difference } = computeFields(
          initialQtyNum,
          entryNum,
          exitNum,
          physicalCountNum
        );

        return db.dailyInventory.upsert({
          where: {
            date_productId: { date: dateObj, productId: item.productId },
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
            productId: item.productId,
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
      })
    );

    return NextResponse.json(
      { success: true, count: results.length, records: results },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/inventory/batch]", error);
    return NextResponse.json(
      { error: "Error al guardar el lote de inventario" },
      { status: 500 }
    );
  }
}
