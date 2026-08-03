import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/cash-closing/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const closing = await db.dailyCashClosing.findUnique({ where: { id } });
    if (!closing) {
      return NextResponse.json(
        { error: "Corte no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(closing);
  } catch (error) {
    console.error("[GET /api/cash-closing/[id]]", error);
    return NextResponse.json(
      { error: "Error al obtener el corte" },
      { status: 500 }
    );
  }
}

// PUT /api/cash-closing/[id]
// Same body fields as POST (without requiring date).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.dailyCashClosing.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Corte no encontrado" },
        { status: 404 }
      );
    }

    const num = (v: unknown): number => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return isNaN(n) ? 0 : n;
    };

    const data: Record<string, unknown> = {};

    if (body.date !== undefined) {
      const dateObj = new Date(body.date + "T12:00:00");
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: "Fecha invalida" },
          { status: 400 }
        );
      }
      data.date = dateObj;
    }

    const numericFields = [
      "totalSales",
      "electronicSales",
      "cashSales",
      "initialCash",
      "initialElectronic",
      "finalCash",
      "finalElectronic",
      "totalExpenses",
      "cashExpenses",
      "electronicExpenses",
      "deliveries",
      "cashDeliveries",
      "electronicDeliveries",
      "auditDifference",
    ];

    for (const f of numericFields) {
      if (body[f] !== undefined) data[f] = num(body[f]);
    }

    if (body.notes !== undefined) {
      data.notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null;
    }

    if (body.closed !== undefined) {
      data.closed = body.closed === true;
    }

    const updated = await db.dailyCashClosing.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/cash-closing/[id]]", error);
    return NextResponse.json(
      { error: "Error al actualizar el corte" },
      { status: 500 }
    );
  }
}

// DELETE /api/cash-closing/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.dailyCashClosing.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Corte no encontrado" },
        { status: 404 }
      );
    }

    await db.dailyCashClosing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/cash-closing/[id]]", error);
    return NextResponse.json(
      { error: "Error al eliminar el corte" },
      { status: 500 }
    );
  }
}
