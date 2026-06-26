import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT /api/sales/[id]
// Body: { quantity?, unitPrice?, isComplimentary?, staffId?, saleType?, date? }
// Recalcula total = quantity * unitPrice
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    const data: {
      quantity?: number;
      unitPrice?: number;
      purchasePrice?: number;
      isComplimentary?: boolean;
      staffId?: string | null;
      saleType?: string;
      date?: Date;
    } = {};

    if (body.quantity !== undefined) {
      const q = Number(body.quantity);
      if (isNaN(q) || q < 0) {
        return NextResponse.json(
          { error: "Cantidad invalida" },
          { status: 400 }
        );
      }
      data.quantity = Math.floor(q);
    }

    if (body.unitPrice !== undefined) {
      const up = Number(body.unitPrice);
      if (isNaN(up) || up < 0) {
        return NextResponse.json(
          { error: "Precio de venta invalido" },
          { status: 400 }
        );
      }
      data.unitPrice = up;
    }

    if (body.purchasePrice !== undefined) {
      const pp = Number(body.purchasePrice);
      if (!isNaN(pp) && pp >= 0) {
        data.purchasePrice = pp;
      }
    }

    if (body.isComplimentary !== undefined) {
      data.isComplimentary = Boolean(body.isComplimentary);
    }

    if (body.saleType !== undefined) {
      if (body.saleType === "PUBLICO" || body.saleType === "PERSONAL") {
        data.saleType = body.saleType;
        if (body.saleType === "PUBLICO") {
          data.staffId = null;
        }
      }
    }

    if (body.staffId !== undefined) {
      data.staffId =
        typeof body.staffId === "string" && body.staffId ? body.staffId : null;
    }

    if (body.date !== undefined) {
      const raw =
        typeof body.date === "string"
          ? body.date.length === 10
            ? body.date + "T12:00:00"
            : body.date
          : "";
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          data.date = d;
        }
      }
    }

    // Recalcular total con valores nuevos o existentes
    const quantity = data.quantity ?? existing.quantity;
    const unitPrice = data.unitPrice ?? existing.unitPrice;
    const isComp =
      data.isComplimentary !== undefined
        ? data.isComplimentary
        : existing.isComplimentary;
    const newTotal = isComp ? 0 : quantity * unitPrice;

    const updated = await db.sale.update({
      where: { id },
      data: { ...data, total: newTotal },
      include: { product: true, staff: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/sales/[id]]", error);
    return NextResponse.json(
      { error: "Error al actualizar la venta" },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    await db.sale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/sales/[id]]", error);
    return NextResponse.json(
      { error: "Error al eliminar la venta" },
      { status: 500 }
    );
  }
}
