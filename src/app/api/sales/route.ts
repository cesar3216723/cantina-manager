import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// GET /api/sales
// Filtros:
//   ?date=YYYY-MM-DD                -> ventas de un dia especifico
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD  -> rango de fechas
//   ?saleType=PUBLICO|PERSONAL
//   ?staffId=xxx
// Incluye product y staff relacionados
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const saleType = searchParams.get("saleType");
    const staffId = searchParams.get("staffId");

    const where: {
      date?: { gte?: Date; lte?: Date };
      saleType?: string;
      staffId?: string;
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

    if (saleType && (saleType === "PUBLICO" || saleType === "PERSONAL")) {
      where.saleType = saleType;
    }
    if (staffId) {
      where.staffId = staffId;
    }

    const sales = await db.sale.findMany({
      where,
      include: {
        product: true,
        staff: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("[GET /api/sales]", error);
    return NextResponse.json(
      { error: "Error al obtener las ventas" },
      { status: 500 }
    );
  }
}

// POST /api/sales
// Acepta un objeto (una venta) o un array (lote/cuenta con varios productos).
// Si es un lote, se genera un ticketId comun para agruparlos como una sola cuenta.
// Cada venta: { date, productId, saleType?, staffId?, quantity?, unitPrice?, purchasePrice?, isComplimentary?, ticketId? }
// Si no viene unitPrice/purchasePrice, se obtienen del producto actual.
// total = quantity * unitPrice (0 si es cortesia)
type SaleInput = {
  date?: string;
  productId?: string;
  saleType?: string;
  staffId?: string | null;
  quantity?: number;
  unitPrice?: number;
  purchasePrice?: number;
  isComplimentary?: boolean;
  ticketId?: string;
  paymentMethod?: string;
};

async function buildSaleData(item: SaleInput, ticketId: string) {
  if (!item.productId || typeof item.productId !== "string") {
    throw new Error("El producto es obligatorio");
  }
  const product = await db.product.findUnique({
    where: { id: item.productId },
  });
  if (!product) {
    throw new Error("Producto no encontrado");
  }

  let date: Date;
  const raw = typeof item.date === "string" && item.date ? item.date : "";
  if (raw) {
    const normalized = raw.length === 10 ? raw + "T12:00:00" : raw;
    date = new Date(normalized);
    if (isNaN(date.getTime())) date = new Date();
  } else {
    date = new Date();
  }

  const saleType = item.saleType === "PERSONAL" ? "PERSONAL" : "PUBLICO";

  const staffId =
    saleType === "PERSONAL" && typeof item.staffId === "string" && item.staffId
      ? item.staffId
      : null;

  if (saleType === "PERSONAL" && !staffId) {
    throw new Error("Las ventas de personal requieren un miembro del staff");
  }

  const quantity =
    typeof item.quantity === "number" && !isNaN(item.quantity)
      ? Math.max(0, Math.floor(item.quantity))
      : 0;

  const unitPrice =
    typeof item.unitPrice === "number" && !isNaN(item.unitPrice)
      ? item.unitPrice
      : product.salePrice;

  const purchasePrice =
    typeof item.purchasePrice === "number" && !isNaN(item.purchasePrice)
      ? item.purchasePrice
      : product.purchasePrice;

  const isComplimentary = Boolean(item.isComplimentary);
  const total = isComplimentary ? 0 : quantity * unitPrice;
  const paymentMethod = typeof item.paymentMethod === "string" ? item.paymentMethod : "EFECTIVO";

  return {
    date,
    ticketId,
    productId: product.id,
    saleType,
    staffId,
    quantity,
    unitPrice,
    purchasePrice,
    total,
    isComplimentary,
    paymentMethod,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const items: SaleInput[] = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No hay registros para crear" },
        { status: 400 }
      );
    }

    // Generar un ticketId comun para todo el lote (la cuenta)
    const ticketId =
      (typeof body === "object" && !Array.isArray(body) && body.ticketId) ||
      randomUUID();

    // Lote: crea todos en paralelo con el mismo ticketId
    if (items.length > 1) {
      const results = await Promise.all(
        items.map(async (item) => {
          const data = await buildSaleData(item, ticketId);
          return db.sale.create({
            data,
            include: { product: true, staff: true },
          });
        })
      );
      return NextResponse.json(
        { ticketId, sales: results, count: results.length },
        { status: 201 }
      );
    }

    // Registro unico
    const data = await buildSaleData(items[0], ticketId);
    const sale = await db.sale.create({
      data,
      include: { product: true, staff: true },
    });
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("[POST /api/sales]", error);
    const message =
      error instanceof Error ? error.message : "Error al crear la venta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
