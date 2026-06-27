import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

// Helper: parse "YYYY-MM-DD" -> Date at local noon (TZ-safe)
function parseDateAtNoon(value: string): Date | null {
  if (!value) return null;
  // Aceptar tanto "YYYY-MM-DD" como ISO completo
  const normalized = value.length === 10 ? value + "T12:00:00" : value;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// Helper: YYYY-MM-DD (local) desde Date
function toYMD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper: genera arreglo de YYYY-MM-DD entre from y to (inclusive)
function enumerateDays(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  // Safety limit: 400 dias
  let safety = 0;
  while (cursor <= end && safety < 400) {
    days.push(toYMD(cursor));
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }
  return days;
}

// GET /api/reports
// Query:
//   ?type=sales-by-period&from=YYYY-MM-DD&to=YYYY-MM-DD
//   ?type=products-by-period&from=&to=
//   ?type=categories-by-period&from=&to=
//   ?type=profit-by-period&from=&to=
//   ?type=staff-performance&from=&to=
//   ?type=summary&from=&to=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "summary";
    const fromStr = searchParams.get("from") || "";
    const toStr = searchParams.get("to") || "";

    const fromD = parseDateAtNoon(fromStr);
    const toD = parseDateAtNoon(toStr);

    if (!fromD || !toD) {
      return NextResponse.json(
        { error: "Los parametros from y to son obligatorios (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (fromD > toD) {
      return NextResponse.json(
        { error: "La fecha 'from' no puede ser mayor que 'to'" },
        { status: 400 }
      );
    }

    const rangeFilter = {
      date: { gte: startOfDay(fromD), lte: endOfDay(toD) },
    };
    const allDays = enumerateDays(fromD, toD);

    switch (type) {
      case "sales-by-period":
        return NextResponse.json(await getSalesByPeriod(rangeFilter, allDays));
      case "products-by-period":
        return NextResponse.json(await getProductsByPeriod(rangeFilter));
      case "categories-by-period":
        return NextResponse.json(await getCategoriesByPeriod(rangeFilter));
      case "profit-by-period":
        return NextResponse.json(await getProfitByPeriod(rangeFilter, allDays));
      case "staff-performance":
        return NextResponse.json(await getStaffPerformance(rangeFilter));
      case "summary":
        return NextResponse.json(await getSummary(rangeFilter, allDays));
      default:
        return NextResponse.json(
          { error: `Tipo de reporte desconocido: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[GET /api/reports]", error);
    return NextResponse.json(
      { error: "Error al generar el reporte" },
      { status: 500 }
    );
  }
}

// ============================================================
// 1) SALES BY PERIOD
// Devuelve totales diarios (publico, personal, total) + totales del periodo
// ============================================================
async function getSalesByPeriod(
  rangeFilter: { date: { gte: Date; lte: Date } },
  allDays: string[]
) {
  // Agrupar por dia (sin hora) y por saleType.
  const sales = await db.sale.findMany({
    where: rangeFilter,
    select: {
      date: true,
      saleType: true,
      total: true,
      isComplimentary: true,
    },
  });

  // Map: day -> { publico, personal }
  const byDay: Record<string, { publico: number; personal: number }> = {};
  for (const d of allDays) byDay[d] = { publico: 0, personal: 0 };

  let totalPublico = 0;
  let totalPersonal = 0;

  for (const s of sales) {
    const dayKey = toYMD(s.date);
    if (!byDay[dayKey]) byDay[dayKey] = { publico: 0, personal: 0 };
    // Cortesias no suman al total de ventas
    if (s.isComplimentary) continue;
    if (s.saleType === "PERSONAL") {
      byDay[dayKey].personal += s.total || 0;
      totalPersonal += s.total || 0;
    } else {
      byDay[dayKey].publico += s.total || 0;
      totalPublico += s.total || 0;
    }
  }

  const days = allDays.map((d) => ({
    date: d,
    publico: byDay[d]?.publico ?? 0,
    personal: byDay[d]?.personal ?? 0,
    total: (byDay[d]?.publico ?? 0) + (byDay[d]?.personal ?? 0),
  }));

  return {
    type: "sales-by-period",
    days,
    totals: {
      publico: totalPublico,
      personal: totalPersonal,
      total: totalPublico + totalPersonal,
    },
  };
}

// ============================================================
// 2) PRODUCTS BY PERIOD
// Por producto: cantidad, ingreso, costo, utilidad, margen % (ordenado por ingreso desc)
// ============================================================
async function getProductsByPeriod(rangeFilter: {
  date: { gte: Date; lte: Date };
}) {
  const sales = await db.sale.findMany({
    where: rangeFilter,
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      purchasePrice: true,
      total: true,
      isComplimentary: true,
      product: { select: { name: true, category: true } },
    },
  });

  type Row = {
    productId: string;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  };
  const map = new Map<string, Row>();

  for (const s of sales) {
    const qty = s.quantity || 0;
    const rev = s.isComplimentary ? 0 : s.total || 0;
    const cost = qty * (s.purchasePrice || 0);
    if (!map.has(s.productId)) {
      map.set(s.productId, {
        productId: s.productId,
        name: s.product?.name ?? "—",
        category: s.product?.category ?? "OTROS",
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      });
    }
    const r = map.get(s.productId)!;
    r.quantity += qty;
    r.revenue += rev;
    r.cost += cost;
    r.profit += rev - cost;
  }

  const rows = Array.from(map.values())
    .map((r) => ({
      ...r,
      margin: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    type: "products-by-period",
    products: rows,
    totals: {
      quantity: rows.reduce((s, r) => s + r.quantity, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
      cost: rows.reduce((s, r) => s + r.cost, 0),
      profit: rows.reduce((s, r) => s + r.profit, 0),
    },
  };
}

// ============================================================
// 3) CATEGORIES BY PERIOD
// Por categoria: cantidad, ingreso, costo, utilidad, margen %, % del total
// ============================================================
async function getCategoriesByPeriod(rangeFilter: {
  date: { gte: Date; lte: Date };
}) {
  const sales = await db.sale.findMany({
    where: rangeFilter,
    select: {
      quantity: true,
      unitPrice: true,
      purchasePrice: true,
      total: true,
      isComplimentary: true,
      product: { select: { category: true } },
    },
  });

  type Row = {
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  };
  const map = new Map<string, Row>();

  for (const s of sales) {
    const cat = s.product?.category ?? "OTROS";
    const qty = s.quantity || 0;
    const rev = s.isComplimentary ? 0 : s.total || 0;
    const cost = qty * (s.purchasePrice || 0);
    if (!map.has(cat)) {
      map.set(cat, {
        category: cat,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      });
    }
    const r = map.get(cat)!;
    r.quantity += qty;
    r.revenue += rev;
    r.cost += cost;
    r.profit += rev - cost;
  }

  const totalRevenue = Array.from(map.values()).reduce(
    (s, r) => s + r.revenue,
    0
  );

  const rows = Array.from(map.values())
    .map((r) => ({
      ...r,
      margin: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0,
      share: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    type: "categories-by-period",
    categories: rows,
    totals: {
      quantity: rows.reduce((s, r) => s + r.quantity, 0),
      revenue: totalRevenue,
      cost: rows.reduce((s, r) => s + r.cost, 0),
      profit: rows.reduce((s, r) => s + r.profit, 0),
    },
  };
}

// ============================================================
// 4) PROFIT BY PERIOD
// Por dia: totalRevenue, totalCost (qty*purchasePrice), profit, margin%
// ============================================================
async function getProfitByPeriod(
  rangeFilter: { date: { gte: Date; lte: Date } },
  allDays: string[]
) {
  const sales = await db.sale.findMany({
    where: rangeFilter,
    select: {
      date: true,
      quantity: true,
      purchasePrice: true,
      total: true,
      isComplimentary: true,
    },
  });

  const byDay: Record<string, { revenue: number; cost: number }> = {};
  for (const d of allDays) byDay[d] = { revenue: 0, cost: 0 };

  let totalRevenue = 0;
  let totalCost = 0;

  for (const s of sales) {
    const dayKey = toYMD(s.date);
    if (!byDay[dayKey]) byDay[dayKey] = { revenue: 0, cost: 0 };
    const qty = s.quantity || 0;
    const cost = qty * (s.purchasePrice || 0);
    byDay[dayKey].cost += cost;
    totalCost += cost;
    if (!s.isComplimentary) {
      const rev = s.total || 0;
      byDay[dayKey].revenue += rev;
      totalRevenue += rev;
    }
  }

  const days = allDays.map((d) => {
    const rev = byDay[d]?.revenue ?? 0;
    const cost = byDay[d]?.cost ?? 0;
    const profit = rev - cost;
    return {
      date: d,
      totalRevenue: rev,
      totalCost: cost,
      profit,
      margin: rev > 0 ? (profit / rev) * 100 : 0,
    };
  });

  const profit = totalRevenue - totalCost;
  return {
    type: "profit-by-period",
    days,
    totals: {
      totalRevenue,
      totalCost,
      profit,
      margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
    },
  };
}

// ============================================================
// 5) STAFF PERFORMANCE
// Por staff: totalTokenSales, commission, personalConsumption, payments
// ============================================================
async function getStaffPerformance(rangeFilter: {
  date: { gte: Date; lte: Date };
}) {
  // 1) Personal de la BD (tambien los inactivos para historico)
  const staffList = await db.staff.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true, salary: true },
  });

  // 2) Token sales agrupadas por staff
  const tokenSales = await db.tokenSale.findMany({
    where: rangeFilter,
    select: {
      staffId: true,
      total: true,
      commission: true,
      quantity: true,
    },
  });

  // 3) PERSONAL sales (consumo) agrupadas por staff
  const personalSales = await db.sale.findMany({
    where: { ...rangeFilter, saleType: "PERSONAL", isComplimentary: false },
    select: { staffId: true, total: true },
  });

  // 4) Staff payments agrupados por staff
  const payments = await db.staffPayment.findMany({
    where: rangeFilter,
    select: {
      staffId: true,
      salary: true,
      commission: true,
      consumption: true,
      totalToPay: true,
    },
  });

  type Row = {
    staffId: string;
    name: string;
    active: boolean;
    salary: number;
    totalTokenSales: number;
    commission: number;
    personalConsumption: number;
    payments: number;
    paymentsSalary: number;
    paymentsCommission: number;
    paymentsConsumption: number;
  };
  const map = new Map<string, Row>();
  for (const s of staffList) {
    map.set(s.id, {
      staffId: s.id,
      name: s.name,
      active: s.active,
      salary: s.salary,
      totalTokenSales: 0,
      commission: 0,
      personalConsumption: 0,
      payments: 0,
      paymentsSalary: 0,
      paymentsCommission: 0,
      paymentsConsumption: 0,
    });
  }

  for (const t of tokenSales) {
    if (!map.has(t.staffId)) continue;
    const r = map.get(t.staffId)!;
    r.totalTokenSales += t.total || 0;
    r.commission += t.commission || 0;
  }

  for (const ps of personalSales) {
    if (!ps.staffId || !map.has(ps.staffId)) continue;
    map.get(ps.staffId)!.personalConsumption += ps.total || 0;
  }

  for (const p of payments) {
    if (!map.has(p.staffId)) continue;
    const r = map.get(p.staffId)!;
    r.payments += p.totalToPay || 0;
    r.paymentsSalary += p.salary || 0;
    r.paymentsCommission += p.commission || 0;
    r.paymentsConsumption += p.consumption || 0;
  }

  const rows = Array.from(map.values());

  return {
    type: "staff-performance",
    staff: rows,
    totals: {
      totalTokenSales: rows.reduce((s, r) => s + r.totalTokenSales, 0),
      commission: rows.reduce((s, r) => s + r.commission, 0),
      personalConsumption: rows.reduce(
        (s, r) => s + r.personalConsumption,
        0
      ),
      payments: rows.reduce((s, r) => s + r.payments, 0),
    },
  };
}

// ============================================================
// 6) SUMMARY
// KPIs alto nivel del rango: totalSales, totalExpenses, totalProfit,
// totalStaffPayments, bestDay, worstDay, topProduct
// ============================================================
async function getSummary(
  rangeFilter: { date: { gte: Date; lte: Date } },
  allDays: string[]
) {
  // Paralelo: ventas, gastos, pagos staff
  const [sales, expenses, staffPayments] = await Promise.all([
    db.sale.findMany({
      where: rangeFilter,
      select: {
        date: true,
        productId: true,
        quantity: true,
        unitPrice: true,
        purchasePrice: true,
        total: true,
        isComplimentary: true,
        saleType: true,
        product: { select: { name: true } },
      },
    }),
    db.expense.findMany({
      where: rangeFilter,
      select: { amount: true },
    }),
    db.staffPayment.findMany({
      where: rangeFilter,
      select: { totalToPay: true },
    }),
  ]);

  // Totales por dia (para best/worst)
  const byDay: Record<string, number> = {};
  for (const d of allDays) byDay[d] = 0;

  let totalSales = 0;
  let totalCost = 0;

  type ProdAgg = { name: string; quantity: number; revenue: number };
  const prodMap = new Map<string, ProdAgg>();

  for (const s of sales) {
    const dayKey = toYMD(s.date);
    if (!byDay[dayKey]) byDay[dayKey] = 0;
    const qty = s.quantity || 0;
    totalCost += qty * (s.purchasePrice || 0);
    if (!s.isComplimentary) {
      const rev = s.total || 0;
      byDay[dayKey] += rev;
      totalSales += rev;
      // Agregado por producto
      if (!prodMap.has(s.productId)) {
        prodMap.set(s.productId, {
          name: s.product?.name ?? "—",
          quantity: 0,
          revenue: 0,
        });
      }
      const p = prodMap.get(s.productId)!;
      p.quantity += qty;
      p.revenue += rev;
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalStaffPayments = staffPayments.reduce(
    (s, p) => s + (p.totalToPay || 0),
    0
  );
  const totalProfit = totalSales - totalCost;

  // Best/worst day (con venta > 0)
  let bestDay: { date: string; total: number } | null = null;
  let worstDay: { date: string; total: number } | null = null;
  for (const d of allDays) {
    const total = byDay[d] ?? 0;
    if (total <= 0) continue;
    if (!bestDay || total > bestDay.total) bestDay = { date: d, total };
    if (!worstDay || total < worstDay.total) worstDay = { date: d, total };
  }

  // Top product by revenue
  let topProduct: {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  } | null = null;
  for (const [productId, p] of prodMap) {
    if (!topProduct || p.revenue > topProduct.revenue) {
      topProduct = { productId, ...p };
    }
  }

  return {
    type: "summary",
    totalSales,
    totalCost,
    totalProfit,
    margin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
    totalExpenses,
    totalStaffPayments,
    daysInRange: allDays.length,
    bestDay,
    worstDay,
    topProduct,
  };
}
