import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/expenses
// Query params:
//   ?date=YYYY-MM-DD   -> expenses for that single day
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD -> range filter
//   No filter -> all expenses
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: {
      date?: { gte?: Date; lte?: Date };
    } = {};

    if (date) {
      const d = new Date(date + "T00:00:00");
      if (!isNaN(d.getTime())) {
        where.date = { gte: startOfDay(d), lte: endOfDay(d) };
      }
    } else if (from || to) {
      const filter: { gte?: Date; lte?: Date } = {};
      if (from) {
        const fd = new Date(from + "T00:00:00");
        if (!isNaN(fd.getTime())) filter.gte = startOfDay(fd);
      }
      if (to) {
        const td = new Date(to + "T00:00:00");
        if (!isNaN(td.getTime())) filter.lte = endOfDay(td);
      }
      if (Object.keys(filter).length > 0) where.date = filter;
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("[GET /api/expenses]", error);
    return NextResponse.json(
      { error: "Error al obtener los gastos" },
      { status: 500 }
    );
  }
}

// POST /api/expenses
// Body: { date, description, amount, paymentMethod?, category? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { date, description, amount, paymentMethod, category } = body;

    if (!date) {
      return NextResponse.json(
        { error: "La fecha es obligatoria" },
        { status: 400 }
      );
    }
    if (!description || typeof description !== "string" || !description.trim()) {
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

    const validMethods = ["EFECTIVO", "ELECTRONICO"];
    const validCategories = ["SUELDO", "COMISION", "COMPRA", "SERVICIO", "GENERAL"];

    const method = validMethods.includes(paymentMethod) ? paymentMethod : "EFECTIVO";
    const cat = validCategories.includes(category) ? category : "GENERAL";

    // Parse date: store at noon to avoid TZ issues
    const dateObj = new Date(date + "T12:00:00");
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: "Fecha invalida" },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        date: dateObj,
        description: description.trim(),
        amount: Number(amount),
        paymentMethod: method,
        category: cat,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("[POST /api/expenses]", error);
    return NextResponse.json(
      { error: "Error al crear el gasto" },
      { status: 500 }
    );
  }
}
