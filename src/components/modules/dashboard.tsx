"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Receipt,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  XCircle,
  Info,
  ArrowRight,
  Package,
  Wallet,
  BarChart3,
  ShoppingCart,
  Boxes,
  FileBarChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { apiFetch } from "@/lib/api-client";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  CATEGORY_COLORS,
} from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---------------- Types ----------------
type ViewKey =
  | "dashboard"
  | "sales"
  | "inventory"
  | "products"
  | "staff"
  | "expenses"
  | "credits"
  | "cash-closing"
  | "reports";

interface DashboardData {
  date: string;
  today: {
    totalSales: number;
    publicSales: number;
    personalSales: number;
    complimentaryCount: number;
    salesCount: number;
    totalExpenses: number;
    creditsPending: number;
    creditsPendingAmount: number;
    staffPayments: number;
    topProducts: Array<{
      name: string;
      quantity: number;
      total: number;
      category: string;
    }>;
  };
  week: {
    dailySales: Array<{
      date: string;
      total: number;
      publicSales: number;
      personalSales: number;
    }>;
    totalSales: number;
    avgDailySales: number;
    bestDay: { date: string; total: number } | null;
  };
  inventory: {
    totalProducts: number;
    lowStockProducts: Array<{
      name: string;
      finalQty: number;
      category: string;
    }>;
    totalInventoryValue: number;
  };
  alerts: Array<{ type: "warning" | "error" | "info"; message: string }>;
}

interface DashboardModuleProps {
  onNavigate?: (view: ViewKey) => void;
}

// ---------------- Helpers ----------------
const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function dayShortLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  if (isNaN(d.getTime())) return isoDate;
  return WEEKDAY_SHORT[d.getDay()];
}

function dayMonthLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// ---------------- Component ----------------
export function DashboardModule({ onNavigate }: DashboardModuleProps) {
  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
  });

  const d = data;
  const netProfit = d
    ? d.today.totalSales - d.today.totalExpenses - d.today.staffPayments
    : 0;

  const chartData = (d?.week.dailySales ?? []).map((s) => ({
    label: dayShortLabel(s.date),
    fullDate: s.date,
    total: s.total,
    publicSales: s.publicSales,
    personalSales: s.personalSales,
  }));

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header banner */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold leading-tight sm:text-2xl">
              Bienvenido a tu Cantina
            </h2>
            <p className="mt-0.5 text-sm text-amber-50/90">
              {d ? formatDate(d.date) : "Cargando fecha..."}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm sm:self-auto">
            <Wallet className="h-5 w-5" />
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-wide text-amber-50/80">
                Utilidad de hoy
              </div>
              <div className="text-base font-bold tabular-nums sm:text-lg">
                {d ? formatCurrency(netProfit) : "—"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isError ? (
        <Card className="border-rose-200 p-6 text-center text-sm text-rose-700 dark:border-rose-900/50 dark:text-rose-300">
          Error al cargar el resumen. Revisa la conexion e intenta de nuevo.
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <section
            aria-label="Indicadores principales"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"
          >
            <KpiCard
              label="Ventas Hoy"
              value={isLoading ? null : formatCurrency(d?.today.totalSales ?? 0)}
              subtitle={
                isLoading
                  ? null
                  : `${d?.today.salesCount ?? 0} producto${
                      (d?.today.salesCount ?? 0) === 1 ? "" : "s"
                    } vendido${
                      (d?.today.salesCount ?? 0) === 1 ? "" : "s"
                    }`
              }
              icon={<ShoppingBag className="h-5 w-5" />}
              accent="amber"
              clickable={!!onNavigate}
              onClick={() => onNavigate?.("sales")}
            />
            <KpiCard
              label="Gastos Hoy"
              value={
                isLoading ? null : formatCurrency(d?.today.totalExpenses ?? 0)
              }
              subtitle={
                isLoading ? null : "Gastos del dia registrados"
              }
              icon={<Receipt className="h-5 w-5" />}
              accent="rose"
              clickable={!!onNavigate}
              onClick={() => onNavigate?.("expenses")}
            />
            <KpiCard
              label="Utilidad Neta"
              value={isLoading ? null : formatCurrency(netProfit)}
              subtitle={isLoading ? null : "Ventas - Gastos - Pagos"}
              icon={
                netProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )
              }
              accent={netProfit >= 0 ? "emerald" : "rose"}
            />
            <KpiCard
              label="Creditos Pendientes"
              value={
                isLoading
                  ? null
                  : formatCurrency(d?.today.creditsPendingAmount ?? 0)
              }
              subtitle={
                isLoading
                  ? null
                  : `${d?.today.creditsPending ?? 0} credito${
                      (d?.today.creditsPending ?? 0) === 1 ? "" : "s"
                    }`
              }
              icon={<CreditCard className="h-5 w-5" />}
              accent="orange"
              clickable={!!onNavigate}
              onClick={() => onNavigate?.("credits")}
            />
          </section>

          {/* Chart + Alerts */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-5">
            {/* Sales chart - 2/3 width */}
            <Card className="lg:col-span-2 gap-0 p-0">
              <CardHeader className="border-b px-5 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-base">
                      Ventas de la Semana
                    </CardTitle>
                  </div>
                  {d && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Total:{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(d.week.totalSales)}
                        </span>
                      </span>
                      <span>
                        Promedio:{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(d.week.avgDailySales)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-5">
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : chartData.length === 0 ||
                  chartData.every((c) => c.total === 0) ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-10 w-10 opacity-40" />
                    <span>Sin datos de ventas esta semana.</span>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="currentColor"
                          className="text-border/40"
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          width={56}
                          tickFormatter={(v: number) =>
                            v >= 1000
                              ? `$${(v / 1000).toFixed(1)}k`
                              : `$${v}`
                          }
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                            color: "hsl(var(--card-foreground))",
                            fontSize: 12,
                            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                          }}
                          labelFormatter={(_v, payload) => {
                            const item = payload?.[0]?.payload as
                              | { fullDate?: string }
                              | undefined;
                            return item?.fullDate
                              ? dayMonthLabel(item.fullDate)
                              : "";
                          }}
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === "total"
                              ? "Total"
                              : name === "publicSales"
                              ? "Publico"
                              : "Personal",
                          ]}
                        />
                        <Bar
                          dataKey="total"
                          name="total"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={56}
                        >
                          {chartData.map((entry, i) => {
                            const isToday = i === chartData.length - 1;
                            return (
                              <Cell
                                key={`bar-${entry.fullDate}`}
                                fill={isToday ? "#ea580c" : "#f59e0b"}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {d?.week.bestDay && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Mejor dia:{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {dayMonthLabel(d.week.bestDay.date)}
                    </span>{" "}
                    con{" "}
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(d.week.bestDay.total)}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Alerts panel - 1/3 width */}
            <Card className="gap-0 p-0">
              <CardHeader className="border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-base">Alertas</CardTitle>
                  {d && d.alerts.length > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      {d.alerts.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : !d || d.alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                    <TrendingUp className="h-10 w-10 text-emerald-500 opacity-70" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Todo en orden
                    </span>
                    <span className="text-xs">
                      No hay alertas pendientes.
                    </span>
                  </div>
                ) : (
                  <ScrollArea className="max-h-80 pr-1">
                    <ul className="space-y-2">
                      {d.alerts.map((alert, idx) => (
                        <AlertItem key={idx} alert={alert} />
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Top products + Inventory status */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-5">
            {/* Top products */}
            <Card className="gap-0 p-0">
              <CardHeader className="border-b px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-base">
                      Top Productos de Hoy
                    </CardTitle>
                  </div>
                  {onNavigate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300"
                      onClick={() => onNavigate("sales")}
                    >
                      Ver ventas
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-5">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !d || d.today.topProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 opacity-40" />
                    <span>Sin productos vendidos hoy.</span>
                  </div>
                ) : (
                  <TopProductsList items={d.today.topProducts} />
                )}
              </CardContent>
            </Card>

            {/* Inventory status */}
            <Card className="gap-0 p-0">
              <CardHeader className="border-b px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base">Estado Inventario</CardTitle>
                  </div>
                  {onNavigate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-orange-700 hover:text-orange-800 dark:text-orange-300"
                      onClick={() => onNavigate("inventory")}
                    >
                      Ver inventario
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-5">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !d ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-900/40 dark:bg-orange-900/10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Package className="h-4 w-4 text-orange-600" />
                          Productos activos
                        </div>
                        <div className="mt-1 text-xl font-bold tabular-nums">
                          {formatNumber(d.inventory.totalProducts)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Wallet className="h-4 w-4 text-amber-600" />
                          Valor inventario
                        </div>
                        <div className="mt-1 text-xl font-bold tabular-nums">
                          {formatCurrency(d.inventory.totalInventoryValue)}
                        </div>
                      </div>
                    </div>

                    {d.inventory.lowStockProducts.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-300">
                        <TrendingUp className="h-4 w-4" />
                        Stock suficiente en todos los productos.
                      </div>
                    ) : (
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-rose-700 dark:text-rose-300">
                            Stock bajo (menos de 5 unidades)
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                          >
                            {d.inventory.lowStockProducts.length}
                          </Badge>
                        </div>
                        <ScrollArea className="max-h-56 pr-1">
                          <ul className="space-y-1.5">
                            {d.inventory.lowStockProducts.map((p) => (
                              <li
                                key={p.name}
                                className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50/40 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-900/10"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`shrink-0 ${
                                      CATEGORY_COLORS[p.category] ??
                                      CATEGORY_COLORS.OTROS
                                    }`}
                                  >
                                    {p.category}
                                  </Badge>
                                  <span className="truncate text-sm font-medium">
                                    {p.name}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`shrink-0 tabular-nums ${
                                    p.finalQty <= 0
                                      ? "bg-rose-600 text-white dark:bg-rose-700"
                                      : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                                  }`}
                                >
                                  {p.finalQty} u.
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Quick actions */}
          <section aria-label="Acciones rapidas">
            <Card className="gap-0 p-0">
              <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
                <QuickAction
                  label="Registrar Venta"
                  description="Captura ventas del dia"
                  icon={<ShoppingCart className="h-5 w-5" />}
                  accent="amber"
                  onClick={() => onNavigate?.("sales")}
                  disabled={!onNavigate}
                />
                <QuickAction
                  label="Ver Inventario"
                  description="Controla existencias"
                  icon={<Boxes className="h-5 w-5" />}
                  accent="orange"
                  onClick={() => onNavigate?.("inventory")}
                  disabled={!onNavigate}
                />
                <QuickAction
                  label="Corte de Caja"
                  description="Cierra el dia"
                  icon={<Wallet className="h-5 w-5" />}
                  accent="emerald"
                  onClick={() => onNavigate?.("cash-closing")}
                  disabled={!onNavigate}
                />
                <QuickAction
                  label="Ver Reportes"
                  description="Analisis y tendencias"
                  icon={<FileBarChart className="h-5 w-5" />}
                  accent="slate"
                  onClick={() => onNavigate?.("reports")}
                  disabled={!onNavigate}
                />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

// ---------------- Sub-components ----------------
type Accent = "amber" | "emerald" | "orange" | "rose" | "slate";

const ACCENT_STYLES: Record<
  Accent,
  {
    border: string;
    iconBg: string;
    iconText: string;
    ring: string;
    hover: string;
    bar: string;
  }
> = {
  amber: {
    border: "border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    iconText: "text-white",
    ring: "hover:ring-amber-300/60",
    hover: "hover:border-amber-300",
    bar: "bg-amber-500",
  },
  orange: {
    border: "border-orange-200 dark:border-orange-900/50",
    iconBg: "bg-gradient-to-br from-orange-400 to-orange-600",
    iconText: "text-white",
    ring: "hover:ring-orange-300/60",
    hover: "hover:border-orange-300",
    bar: "bg-orange-500",
  },
  emerald: {
    border: "border-emerald-200 dark:border-emerald-900/50",
    iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    iconText: "text-white",
    ring: "hover:ring-emerald-300/60",
    hover: "hover:border-emerald-300",
    bar: "bg-emerald-500",
  },
  rose: {
    border: "border-rose-200 dark:border-rose-900/50",
    iconBg: "bg-gradient-to-br from-rose-400 to-rose-600",
    iconText: "text-white",
    ring: "hover:ring-rose-300/60",
    hover: "hover:border-rose-300",
    bar: "bg-rose-500",
  },
  slate: {
    border: "border-slate-200 dark:border-slate-800",
    iconBg: "bg-gradient-to-br from-slate-500 to-slate-700",
    iconText: "text-white",
    ring: "hover:ring-slate-300/60",
    hover: "hover:border-slate-300",
    bar: "bg-slate-500",
  },
};

function KpiCard({
  label,
  value,
  subtitle,
  icon,
  accent,
  clickable,
  onClick,
}: {
  label: string;
  value: string | null;
  subtitle: string | null;
  icon: React.ReactNode;
  accent: Accent;
  clickable?: boolean;
  onClick?: () => void;
}) {
  const a = ACCENT_STYLES[accent];
  const Comp = clickable ? "button" : "div";
  return (
    <Comp
      onClick={clickable ? onClick : undefined}
      type={clickable ? "button" : undefined}
      className={[
        "group relative flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-all sm:p-5",
        a.border,
        clickable
          ? `cursor-pointer ${a.hover} hover:shadow-md focus-visible:outline-none focus-visible:ring-2 ${a.ring}`
          : "",
      ].join(" ")}
      aria-label={clickable ? `Ir a ${label}` : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${a.iconBg} ${a.iconText}`}
        >
          {icon}
        </span>
      </div>
      <div>
        {value === null ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <div className="text-2xl font-bold tabular-nums sm:text-3xl">
            {value}
          </div>
        )}
        {subtitle === null ? (
          <Skeleton className="mt-2 h-3.5 w-24" />
        ) : (
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {clickable && (
        <ArrowRight className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      )}
    </Comp>
  );
}

function AlertItem({
  alert,
}: {
  alert: { type: "warning" | "error" | "info"; message: string };
}) {
  const config = {
    warning: {
      icon: AlertTriangle,
      box: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10",
      iconC: "text-amber-600 dark:text-amber-400",
      text: "text-amber-900 dark:text-amber-200",
    },
    error: {
      icon: XCircle,
      box: "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-900/10",
      iconC: "text-rose-600 dark:text-rose-400",
      text: "text-rose-900 dark:text-rose-200",
    },
    info: {
      icon: Info,
      box: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30",
      iconC: "text-slate-600 dark:text-slate-400",
      text: "text-slate-800 dark:text-slate-200",
    },
  } as const;
  const c = config[alert.type];
  const Icon = c.icon;
  return (
    <li
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${c.box}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${c.iconC}`} />
      <span className={`text-xs leading-snug ${c.text}`}>{alert.message}</span>
    </li>
  );
}

function TopProductsList({
  items,
}: {
  items: Array<{
    name: string;
    quantity: number;
    total: number;
    category: string;
  }>;
}) {
  const max = Math.max(...items.map((i) => i.total), 1);
  return (
    <ol className="space-y-2.5">
      {items.map((p, idx) => {
        const pct = Math.max(4, Math.round((p.total / max) * 100));
        return (
          <li
            key={`${p.name}-${idx}`}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${
                      CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.OTROS
                    }`}
                  >
                    {p.category}
                  </Badge>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(p.total)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {p.quantity} u.
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function QuickAction({
  label,
  description,
  icon,
  accent,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: Accent;
  onClick: () => void;
  disabled?: boolean;
}) {
  const a = ACCENT_STYLES[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 ${a.border} ${a.hover} ${a.ring} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm ${a.iconBg} ${a.iconText}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{label}</div>
        <div className="truncate text-xs text-muted-foreground">
          {description}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export default DashboardModule;
