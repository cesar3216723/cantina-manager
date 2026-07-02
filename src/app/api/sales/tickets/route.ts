import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, getLocalDateInTimeZone } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/sales/tickets
// Devuelve las ventas del dia agrupadas por ticketId (cuentas/comandas).
// Filtros:
//   ?date=YYYY-MM-DD   (default: hoy)
//   ?saleType=PUBLICO|PERSONAL
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const saleType = searchParams.get("saleType");

    // Resolver fecha
    let target: Date;
    if (dateParam) {
      target = new Date(dateParam + "T00:00:00");
      if (isNaN(target.getTime())) target = getLocalDateInTimeZone();
    } else {
      target = getLocalDateInTimeZone();
    }

    const where: {
      date: { gte: Date; lte: Date };
      saleType?: string;
    } = {
      date: { gte: startOfDay(target), lte: endOfDay(target) },
    };

    if (saleType && (saleType === "PUBLICO" || saleType === "PERSONAL")) {
      where.saleType = saleType;
    }

    const sales = await db.sale.findMany({
      where,
      include: { product: true, staff: true },
      orderBy: [{ createdAt: "desc" }],
    });

    // Agrupar por ticketId
    const ticketsMap = new Map<
      string,
      {
        ticketId: string;
        items: typeof sales;
        total: number;
        itemCount: number;
        unitCount: number;
        createdAt: Date;
        saleType: string;
        staffId?: string | null;
        staffName?: string | null;
        complimentaryCount: number;
      }
    >();

    for (const sale of sales) {
      const key = sale.ticketId || sale.id; // fallback si no tiene ticketId
      if (!ticketsMap.has(key)) {
        ticketsMap.set(key, {
          ticketId: key,
          items: [],
          total: 0,
          itemCount: 0,
          unitCount: 0,
          createdAt: sale.createdAt,
          saleType: sale.saleType,
          staffId: sale.staffId,
          staffName: sale.staff?.name || null,
          complimentaryCount: 0,
        });
      }
      const t = ticketsMap.get(key)!;
      t.items.push(sale);
      t.itemCount += 1;
      t.unitCount += sale.quantity;
      t.total += sale.isComplimentary ? 0 : sale.total;
      if (sale.isComplimentary) t.complimentaryCount += 1;
    }

    // Convertir a array y ordenar por createdAt desc (mas reciente primero)
    const tickets = Array.from(ticketsMap.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Totales del dia
    const dayTotal = tickets.reduce((sum, t) => sum + t.total, 0);
    const dayUnitCount = tickets.reduce((sum, t) => sum + t.unitCount, 0);
    const dayComplimentary = tickets.reduce(
      (sum, t) => sum + t.complimentaryCount,
      0
    );

    return NextResponse.json({
      date: target.toISOString(),
      tickets,
      summary: {
        ticketCount: tickets.length,
        total: dayTotal,
        unitCount: dayUnitCount,
        complimentaryCount: dayComplimentary,
      },
    });
  } catch (error) {
    console.error("[GET /api/sales/tickets]", error);
    return NextResponse.json(
      { error: "Error al obtener las cuentas" },
      { status: 500 }
    );
  }
}
