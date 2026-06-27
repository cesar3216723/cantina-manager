import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/staff/payments/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.staffPayment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    await db.staffPayment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/staff/payments/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al eliminar el pago" },
      { status: 500 }
    );
  }
}
