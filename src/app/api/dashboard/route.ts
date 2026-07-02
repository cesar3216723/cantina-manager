import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, formatDateInput, getLocalDateInTimeZone } from "@/lib/format";

export const dynamic = "force-dynamic";

// Parse a YYYY-MM-DD string into a noon Date (avoid TZ issues).
function parseDateNoon(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/dashboard
//   ?date=YYYY-MM-DD   (default: today)
// Returns the overview payload: today + week + inventory + alerts.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const today = dateParam
      ? parseDateNoon(dateParam) ?? getLocalDateInTimeZone()
      : getLocalDateInTimeZone();

    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Week window: today - 6 ... today (7 days inclusive)
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    // ---- Run all aggregations in parallel ----
    const [
      salesTotalAgg,
      publicSalesAgg,
      personalSalesAgg,
      complimentaryAgg,
      salesCountAgg,
      expenseAgg,
      creditsPendingAgg,
      staffPaymentAgg,
      topProductsRaw,
      weekSalesRaw,
      activeProductsCount,
      allInventory,
    ] = await Promise.all([
      // Total sales for today (all types, include complimentary)
      db.sale.aggregate({
        where: { date: { gte: dayStart, lte: dayEnd } },
        _sum: { total: true },
      }),
      // PUBLICO total
      db.sale.aggregate({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          saleType: "PUBLICO",
        },
        _sum: { total: true },
      }),
      // PERSONAL total
      db.sale.aggregate({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          saleType: "PERSONAL",
        },
        _sum: { total: true },
      }),
      // Complimentary count
      db.sale.aggregate({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          isComplimentary: true,
        },
        _count: true,
      }),
      // Sales records count today
      db.sale.aggregate({
        where: { date: { gte: dayStart, lte: dayEnd } },
        _count: true,
      }),
      // Expenses
      db.expense.aggregate({
        where: { date: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
        _count: true,
      }),
      // Credits pending
      db.credit.aggregate({
        where: { status: "PENDIENTE" },
        _sum: { amount: true },
        _count: true,
      }),
      // Staff payments today
      db.staffPayment.aggregate({
        where: { date: { gte: dayStart, lte: dayEnd } },
        _sum: { totalToPay: true },
      }),
      // Top 5 products by total today (groupBy productId)
      db.sale.groupBy({
        by: ["productId"],
        where: { date: { gte: dayStart, lte: dayEnd } },
        _sum: { total: true, quantity: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),
      // All sales for the last 7 days (for week chart)
      db.sale.findMany({
        where: { date: { gte: weekStart, lte: dayEnd } },
        select: { date: true, total: true, saleType: true },
      }),
      // Active products count
      db.product.count({ where: { active: true } }),
      // Latest inventory per active product (for low-stock + valuation)
      db.dailyInventory.findMany({
        where: { product: { active: true } },
        include: { product: true },
        orderBy: { date: "desc" },
      }),
    ]);

    // Fetch product details for top products
    const topProductIds = topProductsRaw.map((g) => g.productId);
    const topProductsData = topProductIds.length
      ? await db.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true, category: true },
        })
      : [];
    const productMap = new Map(topProductsData.map((p) => [p.id, p]));

    const topProducts = topProductsRaw.map((g) => {
      const p = productMap.get(g.productId);
      return {
        name: p?.name ?? "Desconocido",
        quantity: g._sum.quantity ?? 0,
        total: g._sum.total ?? 0,
        category: p?.category ?? "OTROS",
      };
    });

    // ---- Week chart: group sales by day ----
    const dailyMap = new Map<
      string,
      { total: number; publicSales: number; personalSales: number }
    >();
    // Seed 7-day window (oldest -> newest)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dayStart);
      d.setDate(d.getDate() - i);
      dailyMap.set(formatDateInput(d), {
        total: 0,
        publicSales: 0,
        personalSales: 0,
      });
    }
    for (const s of weekSalesRaw) {
      const key = formatDateInput(s.date);
      const entry = dailyMap.get(key);
      if (entry) {
        entry.total += s.total || 0;
        if (s.saleType === "PUBLICO") entry.publicSales += s.total || 0;
        else if (s.saleType === "PERSONAL") entry.personalSales += s.total || 0;
      }
    }
    const dailySales = Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      total: v.total,
      publicSales: v.publicSales,
      personalSales: v.personalSales,
    }));
    const weekTotalSales = dailySales.reduce((s, d) => s + d.total, 0);
    const avgDailySales = weekTotalSales / 7;
    const bestDayEntry = dailySales.reduce(
      (best, d) => (d.total > (best?.total ?? -Infinity) ? d : best),
      null as { date: string; total: number } | null
    );
    const bestDay =
      bestDayEntry && bestDayEntry.total > 0
        ? { date: bestDayEntry.date, total: bestDayEntry.total }
        : null;

    // ---- Latest inventory per product ----
    const latestByProduct = new Map<
      string,
      (typeof allInventory)[number]
    >();
    for (const inv of allInventory) {
      if (!latestByProduct.has(inv.productId)) {
        latestByProduct.set(inv.productId, inv);
      }
    }
    const latestList = Array.from(latestByProduct.values());
    const lowStockProducts = latestList
      .filter((inv) => inv.finalQty < 5)
      .map((inv) => ({
        name: inv.product.name,
        finalQty: inv.finalQty,
        category: inv.product.category,
      }))
      .sort((a, b) => a.finalQty - b.finalQty);
    const totalInventoryValue = latestList.reduce(
      (s, inv) => s + inv.finalQty * inv.product.purchasePrice,
      0
    );

    // ---- Compose today payload ----
    const todayPayload = {
      totalSales: salesTotalAgg._sum.total ?? 0,
      publicSales: publicSalesAgg._sum.total ?? 0,
      personalSales: personalSalesAgg._sum.total ?? 0,
      complimentaryCount: complimentaryAgg._count ?? 0,
      salesCount: salesCountAgg._count ?? 0,
      totalExpenses: expenseAgg._sum.amount ?? 0,
      creditsPending: creditsPendingAgg._count ?? 0,
      creditsPendingAmount: creditsPendingAgg._sum.amount ?? 0,
      staffPayments: staffPaymentAgg._sum.totalToPay ?? 0,
      topProducts,
    };

    // ---- Alerts ----
    const alerts: Array<{
      type: "warning" | "error" | "info";
      message: string;
    }> = [];

    if (todayPayload.creditsPending > 0) {
      alerts.push({
        type: "warning",
        message: `${todayPayload.creditsPending} credito${
          todayPayload.creditsPending === 1 ? "" : "s"
        } pendiente${
          todayPayload.creditsPending === 1 ? "" : "s"
        } por ${new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
          minimumFractionDigits: 0,
        }).format(todayPayload.creditsPendingAmount)}`,
      });
    }
    if (todayPayload.totalSales === 0) {
      alerts.push({
        type: "info",
        message: "Aun no hay ventas registradas hoy.",
      });
    }
    if (todayPayload.totalExpenses > 0 && todayPayload.totalSales === 0) {
      alerts.push({
        type: "warning",
        message: "Tienes gastos registrados sin ventas hoy.",
      });
    }
    const lowStockCritical = lowStockProducts.filter((p) => p.finalQty <= 0);
    if (lowStockCritical.length > 0) {
      alerts.push({
        type: "error",
        message: `${lowStockCritical.length} producto${
          lowStockCritical.length === 1 ? "" : "s"
        } sin stock: ${lowStockCritical
          .slice(0, 3)
          .map((p) => p.name)
          .join(", ")}${
          lowStockCritical.length > 3
            ? ` y ${lowStockCritical.length - 3} mas`
            : ""
        }.`,
      });
    } else if (lowStockProducts.length > 0) {
      alerts.push({
        type: "warning",
        message: `${lowStockProducts.length} producto${
          lowStockProducts.length === 1 ? "" : "s"
        } con stock bajo (menos de 5 unidades).`,
      });
    }
    if (latestList.length === 0) {
      alerts.push({
        type: "info",
        message: "No hay inventario registrado. Inicializa el dia.",
      });
    }

    return NextResponse.json({
      date: formatDateInput(today),
      today: todayPayload,
      week: {
        dailySales,
        totalSales: weekTotalSales,
        avgDailySales,
        bestDay,
      },
      inventory: {
        totalProducts: activeProductsCount,
        lowStockProducts,
        totalInventoryValue,
      },
      alerts,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { error: "Error al obtener el resumen" },
      { status: 500 }
    );
  }
}
