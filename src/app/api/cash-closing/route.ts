import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/cash-closing
//   ?date=YYYY-MM-DD   -> closing for that single date (returns null if none)
//   ?from=&to=         -> range filter (array ordered by date asc)
//   No filter          -> all closings ordered desc
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (date) {
      const d = new Date(date + "T00:00:00");
      if (!isNaN(d.getTime())) {
        const closing = await db.dailyCashClosing.findFirst({
          where: {
            date: { gte: startOfDay(d), lte: endOfDay(d) },
          },
        });
        return NextResponse.json(closing);
      }
    }

    const where: { date?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
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

    const closings = await db.dailyCashClosing.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(closings);
  } catch (error) {
    console.error("[GET /api/cash-closing]", error);
    return NextResponse.json(
      { error: "Error al obtener el corte de caja" },
      { status: 500 }
    );
  }
}

// POST /api/cash-closing (upsert by date)
// Body fields:
//   date (required), totalSales, electronicSales, cashSales,
//   initialCash, initialElectronic, finalCash, finalElectronic,
//   totalExpenses, cashExpenses, electronicExpenses,
//   deliveries, cashDeliveries, electronicDeliveries,
//   auditDifference, notes, closed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { date } = body;
    if (!date) {
      return NextResponse.json(
        { error: "La fecha es obligatoria" },
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

    const num = (v: unknown): number => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return isNaN(n) ? 0 : n;
    };

    const data = {
      totalSales: num(body.totalSales),
      electronicSales: num(body.electronicSales),
      cashSales: num(body.cashSales),
      initialCash: num(body.initialCash),
      initialElectronic: num(body.initialElectronic),
      finalCash: num(body.finalCash),
      finalElectronic: num(body.finalElectronic),
      totalExpenses: num(body.totalExpenses),
      cashExpenses: num(body.cashExpenses),
      electronicExpenses: num(body.electronicExpenses),
      deliveries: num(body.deliveries),
      cashDeliveries: num(body.cashDeliveries),
      electronicDeliveries: num(body.electronicDeliveries),
      auditDifference: num(body.auditDifference),
      notes:
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null,
      closed: body.closed === true,
    };

    // Find existing by date range ( noon to noon to be TZ-safe )
    const dayStart = startOfDay(dateObj);
    const dayEnd = endOfDay(dateObj);
    const existing = await db.dailyCashClosing.findFirst({
      where: { date: { gte: dayStart, lte: dayEnd } },
    });

    let closing;
    if (existing) {
      closing = await db.dailyCashClosing.update({
        where: { id: existing.id },
        data,
      });
    } else {
      closing = await db.dailyCashClosing.create({
        data: {
          date: dateObj,
          ...data,
        },
      });
    }

    return NextResponse.json(closing);
  } catch (error) {
    console.error("[POST /api/cash-closing]", error);
    return NextResponse.json(
      { error: "Error al guardar el corte de caja" },
      { status: 500 }
    );
  }
}
