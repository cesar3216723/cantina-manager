import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT /api/expenses/[id]
// Body: { date?, description?, amount?, paymentMethod?, category? }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    const data: {
      date?: Date;
      description?: string;
      amount?: number;
      paymentMethod?: string;
      category?: string;
    } = {};

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

    const validMethods = ["EFECTIVO", "ELECTRONICO"];
    const validCategories = [
      "SUELDO",
      "COMISION",
      "COMPRA",
      "SERVICIO",
      "GENERAL",
    ];

    if (body.paymentMethod !== undefined) {
      if (!validMethods.includes(body.paymentMethod)) {
        return NextResponse.json(
          { error: "Metodo de pago invalido" },
          { status: 400 }
        );
      }
      data.paymentMethod = body.paymentMethod;
    }

    if (body.category !== undefined) {
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { error: "Categoria invalida" },
          { status: 400 }
        );
      }
      data.category = body.category;
    }

    const updated = await db.expense.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/expenses/[id]]", error);
    return NextResponse.json(
      { error: "Error al actualizar el gasto" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    await db.expense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/expenses/[id]]", error);
    return NextResponse.json(
      { error: "Error al eliminar el gasto" },
      { status: 500 }
    );
  }
}
