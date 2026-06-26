import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

// GET /api/staff/payments
// Filtros:
//   ?date=YYYY-MM-DD            -> pagos de un dia especifico
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD -> rango de fechas
//   ?staffId=xxx                -> filtrar por miembro del personal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const staffId = searchParams.get("staffId");

    const where: {
      date?: { gte?: Date; lte?: Date };
      staffId?: string;
    } = {};

    if (date) {
      const d = new Date(date + "T00:00:00");
      if (!isNaN(d.getTime())) {
        where.date = {
          gte: startOfDay(d),
          lte: endOfDay(d),
        };
      }
    } else if (from || to) {
      const gte = from ? startOfDay(new Date(from + "T00:00:00")) : undefined;
      const lte = to ? endOfDay(new Date(to + "T00:00:00")) : undefined;
      where.date = {};
      if (gte) where.date.gte = gte;
      if (lte) where.date.lte = lte;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    const payments = await db.staffPayment.findMany({
      where,
      include: {
        staff: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("[GET /api/staff/payments] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener los pagos" },
      { status: 500 }
    );
  }
}

// POST /api/staff/payments
// Crea un StaffPayment. Calcula totalToPay = salary + commission - consumption
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const staffId = typeof body.staffId === "string" ? body.staffId : "";
    if (!staffId) {
      return NextResponse.json(
        { error: "El personal es obligatorio" },
        { status: 400 }
      );
    }

    const staff = await db.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return NextResponse.json(
        { error: "Personal no encontrado" },
        { status: 404 }
      );
    }

    // Fecha (default hoy)
    let date: Date;
    if (typeof body.date === "string" && body.date) {
      date = new Date(body.date + "T00:00:00");
    } else if (body.date instanceof Date) {
      date = body.date;
    } else {
      date = new Date();
    }
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    const salary =
      typeof body.salary === "number" && !isNaN(body.salary)
        ? body.salary
        : staff.salary;
    const commission =
      typeof body.commission === "number" && !isNaN(body.commission)
        ? body.commission
        : 0;
    const consumption =
      typeof body.consumption === "number" && !isNaN(body.consumption)
        ? body.consumption
        : 0;

    // totalToPay puede venir del cliente o calcularse
    const totalToPay =
      typeof body.totalToPay === "number" && !isNaN(body.totalToPay)
        ? body.totalToPay
        : salary + commission - consumption;

    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    const payment = await db.staffPayment.create({
      data: {
        date,
        staffId,
        salary,
        commission,
        consumption,
        totalToPay,
        notes,
      },
      include: {
        staff: true,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/staff/payments] Error:", error);
    return NextResponse.json(
      { error: "Error al registrar el pago" },
      { status: 500 }
    );
  }
}
