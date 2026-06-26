import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT /api/credits/[id]
// Body: { date?, customerName?, description?, amount?, status?, paidDate?, paymentMethod?, notes? }
// When marking as paid: { status: "PAGADO", paidDate, paymentMethod }
// When cancelling: { status: "CANCELADO" }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.credit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Credito no encontrado" },
        { status: 404 }
      );
    }

    const data: {
      date?: Date;
      customerName?: string;
      description?: string;
      amount?: number;
      status?: string;
      paidDate?: Date | null;
      paymentMethod?: string | null;
      notes?: string | null;
    } = {};

    const validStatuses = ["PENDIENTE", "PAGADO", "CANCELADO"];
    const validMethods = ["EFECTIVO", "ELECTRONICO"];

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

    if (body.customerName !== undefined) {
      if (
        typeof body.customerName !== "string" ||
        !body.customerName.trim()
      ) {
        return NextResponse.json(
          { error: "El nombre del cliente no puede estar vacio" },
          { status: 400 }
        );
      }
      data.customerName = body.customerName.trim();
    }

    if (body.description !== undefined) {
      if (
        typeof body.description !== "string" ||
        !body.description.trim()
      ) {
        return NextResponse.json(
          { error: "La descripcion no puede estar vacia" },
          { status: 400 }
        );
      }
      data.description = body.description.trim();
    }

    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (isNaN(amt)) {
        return NextResponse.json(
          { error: "Monto invalido" },
          { status: 400 }
        );
      }
      data.amount = amt;
    }

    if (body.status !== undefined) {
      const st = String(body.status).toUpperCase();
      if (!validStatuses.includes(st)) {
        return NextResponse.json(
          { error: "Estado invalido" },
          { status: 400 }
        );
      }
      data.status = st;

      // If reverting to PENDIENTE, clear paid fields
      if (st === "PENDIENTE") {
        data.paidDate = null;
        data.paymentMethod = null;
      }
      // If cancelling, clear paid fields too
      if (st === "CANCELADO") {
        data.paidDate = null;
        data.paymentMethod = null;
      }
    }

    if (body.paidDate !== undefined && body.paidDate !== null) {
      const pd = new Date(body.paidDate + "T12:00:00");
      if (isNaN(pd.getTime())) {
        return NextResponse.json(
          { error: "Fecha de pago invalida" },
          { status: 400 }
        );
      }
      data.paidDate = pd;
    } else if (body.paidDate === null) {
      data.paidDate = null;
    }

    if (body.paymentMethod !== undefined) {
      if (body.paymentMethod === null) {
        data.paymentMethod = null;
      } else if (validMethods.includes(body.paymentMethod)) {
        data.paymentMethod = body.paymentMethod;
      } else {
        return NextResponse.json(
          { error: "Metodo de pago invalido" },
          { status: 400 }
        );
      }
    }

    if (body.notes !== undefined) {
      data.notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null;
    }

    const updated = await db.credit.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/credits/[id]]", error);
    return NextResponse.json(
      { error: "Error al actualizar el credito" },
      { status: 500 }
    );
  }
}

// DELETE /api/credits/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.credit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Credito no encontrado" },
        { status: 404 }
      );
    }

    await db.credit.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/credits/[id]]", error);
    return NextResponse.json(
      { error: "Error al eliminar el credito" },
      { status: 500 }
    );
  }
}
