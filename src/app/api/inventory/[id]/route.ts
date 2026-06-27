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

// PUT /api/inventory/[id]
// Body: any subset of { date?, productId?, initialQty?, entry?, exit?, physicalCount?, observations? }
// Recalculates finalQty and difference based on the new values (or existing ones for unchanged fields).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.dailyInventory.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Registro de inventario no encontrado" },
        { status: 404 }
      );
    }

    // Build update data
    const data: {
      date?: Date;
      productId?: string;
      initialQty?: number;
      entry?: number;
      exit?: number;
      physicalCount?: number;
      observations?: string | null;
      finalQty?: number;
      difference?: number;
    } = {};

    if (body.date !== undefined) {
      const dateObj = parseDate(body.date);
      if (!dateObj) {
        return NextResponse.json(
          { error: "Fecha invalida" },
          { status: 400 }
        );
      }
      data.date = dateObj;
    }

    if (body.productId !== undefined) {
      if (typeof body.productId !== "string" || !body.productId) {
        return NextResponse.json(
          { error: "Producto invalido" },
          { status: 400 }
        );
      }
      const product = await db.product.findUnique({
        where: { id: body.productId },
      });
      if (!product) {
        return NextResponse.json(
          { error: "Producto no encontrado" },
          { status: 404 }
        );
      }
      data.productId = body.productId;
    }

    if (body.initialQty !== undefined) {
      data.initialQty = Number(body.initialQty) || 0;
    }
    if (body.entry !== undefined) {
      data.entry = Number(body.entry) || 0;
    }
    if (body.exit !== undefined) {
      data.exit = Number(body.exit) || 0;
    }
    if (body.physicalCount !== undefined) {
      data.physicalCount = Number(body.physicalCount) || 0;
    }
    if (body.observations !== undefined) {
      data.observations =
        typeof body.observations === "string" && body.observations.trim()
          ? body.observations.trim()
          : null;
    }

    // Recalculate derived fields using new or existing values
    const initialQty = data.initialQty ?? existing.initialQty;
    const entry = data.entry ?? existing.entry;
    const exit = data.exit ?? existing.exit;
    const physicalCount = data.physicalCount ?? existing.physicalCount;
    const { finalQty, difference } = computeFields(
      initialQty,
      entry,
      exit,
      physicalCount
    );
    data.finalQty = finalQty;
    data.difference = difference;

    const updated = await db.dailyInventory.update({
      where: { id },
      data,
      include: { product: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/inventory/[id]]", error);
    return NextResponse.json(
      { error: "Error al actualizar el inventario" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.dailyInventory.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Registro de inventario no encontrado" },
        { status: 404 }
      );
    }

    await db.dailyInventory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/inventory/[id]]", error);
    return NextResponse.json(
      { error: "Error al eliminar el inventario" },
      { status: 500 }
    );
  }
}
