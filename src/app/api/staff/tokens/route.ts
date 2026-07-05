import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

// GET /api/staff/tokens
// Filtros:
//   ?date=YYYY-MM-DD                -> fichas de un dia especifico
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD  -> rango de fechas
//   ?staffId=xxx                    -> filtrar por miembro del personal
// Incluye product y staff relacionados
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

    const tokens = await db.tokenSale.findMany({
      where,
      include: {
        product: true,
        staff: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(tokens);
  } catch (error) {
    console.error("[GET /api/staff/tokens] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener las fichas" },
      { status: 500 }
    );
  }
}

// POST /api/staff/tokens
// Crea una TokenSale. Calcula total = quantity * unitPrice y
// comision (si no viene en el body) como quantity * unitPrice / 6
// (ej. unitPrice 60 => 10 por ficha)
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
    const productId = typeof body.productId === "string" ? body.productId : "";
    if (!productId) {
      return NextResponse.json(
        { error: "El producto es obligatorio" },
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
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
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

    const quantity =
      typeof body.quantity === "number" && !isNaN(body.quantity)
        ? Math.max(0, Math.floor(body.quantity))
        : 0;
    const unitPrice =
      typeof body.unitPrice === "number" && !isNaN(body.unitPrice)
        ? body.unitPrice
        : 120;

    // total = quantity * unitPrice (override si viene en el body)
    const total =
      typeof body.total === "number" && !isNaN(body.total)
        ? body.total
        : quantity * unitPrice;

    // Comision: si el body trae un numero especifico se usa; si no, se calcula
    // usando la regla de negocio: ficha 1 a 15 la empleada recibe $60 de comision, de la 16 en adelante recibe $80
    let commission: number;
    if (
      typeof body.commission === "number" &&
      !isNaN(body.commission)
    ) {
      commission = body.commission;
    } else {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Sumar fichas previas de la empleada en el dia
      const currentTokensSum = await db.tokenSale.aggregate({
        where: {
          staffId,
          date: { gte: dayStart, lte: dayEnd },
        },
        _sum: {
          quantity: true,
        },
      });
      const existingQuantity = currentTokensSum._sum.quantity ?? 0;

      let totalCommission = 0;
      for (let i = 1; i <= quantity; i++) {
        const tokenNumber = existingQuantity + i;
        const staffCut = tokenNumber <= 15 ? 60 : 80;
        totalCommission += Math.min(unitPrice, staffCut);
      }
      commission = totalCommission;
    }

    const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod : "EFECTIVO";

    const tokenSale = await db.tokenSale.create({
      data: {
        date,
        staffId,
        productId,
        quantity,
        unitPrice,
        total,
        commission,
        paymentMethod,
      },
      include: {
        product: true,
        staff: true,
      },
    });

    return NextResponse.json(tokenSale, { status: 201 });
  } catch (error) {
    console.error("[POST /api/staff/tokens] Error:", error);
    return NextResponse.json(
      { error: "Error al registrar la ficha" },
      { status: 500 }
    );
  }
}
