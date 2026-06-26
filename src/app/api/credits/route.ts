import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/credits?status=PENDIENTE|PAGADO|CANCELADO
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: { status?: string } = {};
    const validStatuses = ["PENDIENTE", "PAGADO", "CANCELADO"];
    if (status && validStatuses.includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const credits = await db.credit.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(credits);
  } catch (error) {
    console.error("[GET /api/credits]", error);
    return NextResponse.json(
      { error: "Error al obtener los creditos" },
      { status: 500 }
    );
  }
}

// POST /api/credits
// Body: { date, customerName, description, amount, notes? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { date, customerName, description, amount, notes } = body;

    if (!date) {
      return NextResponse.json(
        { error: "La fecha es obligatoria" },
        { status: 400 }
      );
    }
    if (
      !customerName ||
      typeof customerName !== "string" ||
      !customerName.trim()
    ) {
      return NextResponse.json(
        { error: "El nombre del cliente es obligatorio" },
        { status: 400 }
      );
    }
    if (
      !description ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return NextResponse.json(
        { error: "La descripcion es obligatoria" },
        { status: 400 }
      );
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: "El monto es obligatorio" },
        { status: 400 }
      );
    }

    const dateObj = new Date(date + "T12:00:00");
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: "Fecha invalida" },
        { status: 400 }
      );
    }

    const credit = await db.credit.create({
      data: {
        date: dateObj,
        customerName: customerName.trim(),
        description: description.trim(),
        amount: Number(amount),
        status: "PENDIENTE",
        notes:
          typeof notes === "string" && notes.trim()
            ? notes.trim()
            : null,
      },
    });

    return NextResponse.json(credit, { status: 201 });
  } catch (error) {
    console.error("[POST /api/credits]", error);
    return NextResponse.json(
      { error: "Error al crear el credito" },
      { status: 500 }
    );
  }
}
