import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

// POST /api/cash-closing/calculate
// Body: { date: "YYYY-MM-DD" }
// Returns a computed summary pulling from sales, expenses, staff payments, credits.
// Does NOT save anything.
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

    const d = new Date(date + "T00:00:00");
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Fecha invalida" },
        { status: 400 }
      );
    }

    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);

    const eloy = await db.staff.findFirst({
      where: { name: { equals: "ELOY", mode: "insensitive" } },
    });
    const eloyId = eloy?.id;

    const salesWhere: any = {
      date: { gte: dayStart, lte: dayEnd },
    };
    if (eloyId) {
      salesWhere.OR = [
        { staffId: null },
        { staffId: { not: eloyId } }
      ];
    }

    // Run all aggregations in parallel for speed
    const [
      salesAgg,
      salesRows,
      expenses,
      staffPaymentsAgg,
      staffPayments,
      creditsPaidAgg,
      creditsPaidListRows,
      tokenSales,
    ] = await Promise.all([
      // Total sales for the day (all types, include complimentary)
      db.sale.aggregate({
        where: salesWhere,
        _sum: { total: true },
      }),
      // Sales details to calculate payment method splits
      db.sale.findMany({
        where: salesWhere,
      }),
      // Expenses for the day
      db.expense.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        orderBy: { createdAt: "desc" },
      }),
      // Staff payments totals for the day
      db.staffPayment.aggregate({
        where: { date: { gte: dayStart, lte: dayEnd } },
        _sum: { totalToPay: true, salary: true, commission: true, consumption: true },
      }),
      // Staff payments list (include staff name)
      db.staffPayment.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        include: { staff: true },
        orderBy: { createdAt: "desc" },
      }),
      // Credits paid totals for the day
      db.credit.aggregate({
        where: {
          status: "PAGADO",
          paidDate: { gte: dayStart, lte: dayEnd },
        },
        _sum: { amount: true },
      }),
      // Credits paid list for the day
      db.credit.findMany({
        where: {
          status: "PAGADO",
          paidDate: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { paidDate: "desc" },
      }),
      // Token sales (fichas) for the day
      db.tokenSale.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    // Fichas values by payment method
    const cashTokens = tokenSales
      .filter((t) => t.paymentMethod === "EFECTIVO")
      .reduce((acc, t) => acc + (t.total || 0), 0);

    const electronicTokens = tokenSales
      .filter((t) => t.paymentMethod === "TARJETA" || t.paymentMethod === "TRANSFERENCIA")
      .reduce((acc, t) => acc + (t.total || 0), 0);

    const tokensTotalSales = tokenSales.reduce((acc, t) => acc + (t.total || 0), 0);

    const totalSales = (salesAgg._sum.total ?? 0) + tokensTotalSales;

    const cashSales = salesRows
      .filter((s) => s.paymentMethod === "EFECTIVO")
      .reduce((acc, s) => acc + (s.total || 0), 0) + cashTokens;

    const electronicSales = salesRows
      .filter((s) => s.paymentMethod === "TARJETA" || s.paymentMethod === "TRANSFERENCIA")
      .reduce((acc, s) => acc + (s.total || 0), 0) + electronicTokens;

    const totalExpenses = expenses.reduce(
      (s, e) => s + (e.amount || 0),
      0
    );
    const cashExpenses = expenses
      .filter((e) => e.paymentMethod === "EFECTIVO")
      .reduce((s, e) => s + (e.amount || 0), 0);
    const electronicExpenses = expenses
      .filter((e) => e.paymentMethod === "ELECTRONICO")
      .reduce((s, e) => s + (e.amount || 0), 0);

    const staffPaymentsTotal = staffPaymentsAgg._sum.totalToPay ?? 0;
    const staffSalary = staffPaymentsAgg._sum.salary ?? 0;
    const staffCommission = staffPaymentsAgg._sum.commission ?? 0;
    const staffConsumption = staffPaymentsAgg._sum.consumption ?? 0;

    const creditsPaid = creditsPaidAgg._sum.amount ?? 0;
    const creditsPaidList = creditsPaidListRows.map((c) => ({
      id: c.id,
      date: c.date,
      customerName: c.customerName,
      description: c.description,
      amount: c.amount,
      paidDate: c.paidDate,
      paymentMethod: c.paymentMethod,
    }));

    return NextResponse.json({
      date,
      // Sales
      totalSales,
      electronicSales,
      cashSales,
      // Expenses (split by method)
      totalExpenses,
      cashExpenses,
      electronicExpenses,
      // Staff payments
      staffPayments: staffPaymentsTotal,
      staffSalary,
      staffCommission,
      staffConsumption,
      // Credits
      creditsPaid,
      // Deliveries (manual - default 0)
      deliveries: 0,
      cashDeliveries: 0,
      electronicDeliveries: 0,
      // Initial cash/electronic default to 0 (user fills from previous close)
      initialCash: 0,
      initialElectronic: 0,
      // Suggested final values (assuming defaults)
      suggestedFinalCash: 0, // initialCash + cashSales - cashExpenses - cashDeliveries
      suggestedFinalElectronic: 0, // initialElectronic + electronicSales - electronicExpenses - electronicDeliveries
      // Lists for display
      expensesList: expenses.map((e) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        category: e.category,
      })),
      staffPaymentsList: staffPayments.map((p) => ({
        id: p.id,
        date: p.date,
        staffId: p.staffId,
        staffName: p.staff?.name ?? "N/A",
        salary: p.salary,
        commission: p.commission,
        consumption: p.consumption,
        totalToPay: p.totalToPay,
        notes: p.notes,
      })),
      creditsPaidList,
    });
  } catch (error) {
    console.error("[POST /api/cash-closing/calculate]", error);
    return NextResponse.json(
      { error: "Error al calcular el corte" },
      { status: 500 }
    );
  }
}
