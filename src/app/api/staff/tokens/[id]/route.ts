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
