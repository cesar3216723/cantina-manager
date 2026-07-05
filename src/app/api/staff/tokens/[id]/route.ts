import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/staff/tokens/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.tokenSale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Ficha no encontrada" },
        { status: 404 }
      );
    }

    await db.tokenSale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/staff/tokens/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al eliminar la ficha" },
      { status: 500 }
    );
  }
}

// PUT /api/staff/tokens/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.tokenSale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Ficha no encontrada" },
        { status: 404 }
      );
    }

    const commission = typeof body.commission === "number" && !isNaN(body.commission)
      ? body.commission
      : existing.commission;

    const quantity = typeof body.quantity === "number" && !isNaN(body.quantity)
      ? body.quantity
      : existing.quantity;

    const unitPrice = typeof body.unitPrice === "number" && !isNaN(body.unitPrice)
      ? body.unitPrice
      : existing.unitPrice;

    const total = typeof body.total === "number" && !isNaN(body.total)
      ? body.total
      : quantity * unitPrice;

    const updated = await db.tokenSale.update({
      where: { id },
      data: {
        commission,
        quantity,
        unitPrice,
        total,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/staff/tokens/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar la ficha" },
      { status: 500 }
    );
  }
}
