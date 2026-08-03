import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/sales/tickets/[ticketId]
// Elimina todas las ventas que pertenecen a una misma cuenta/comanda.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;

    const deleted = await db.sale.deleteMany({
      where: { ticketId },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error("[DELETE /api/sales/tickets/[ticketId]]", error);
    return NextResponse.json(
      { error: "Error al eliminar la cuenta" },
      { status: 500 }
    );
  }
}
