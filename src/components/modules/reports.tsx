"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Package,
  Users,
  PieChart as PieIcon,
  DollarSign,
  Percent,
  Loader2,
  Receipt,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import {
  formatCurrency,
  formatNumber,
  formatDateShort,
  formatDateInput,
  todayDateInput,
  CATEGORY_COLORS,
} from "@/lib/format";
import { toast } from "sonner";

// ---------- Types ----------
interface SummaryData {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  margin: number;
  totalExpenses: number;
  totalStaffPayments: number;
  daysInRange: number;
  bestDay: { date: string; total: number } | null;
  worstDay: { date: string; total: number } | null;
  topProduct: { name: string; quantity: number; revenue: number } | null;
}

interface SalesByDay {
  date: string;
  publico: number;
  personal: number;
  total: number;
}

interface ProductReport {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CategoryReport {
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  share: number;
}

interface ProfitByDay {
  date: string;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
}

interface StaffReport {
  staffId: string;
  name: string;
  active: boolean;
  salary: number;
  totalTokenSales: number;
  commission: number;
  personalConsumption: number;
  payments: number;
}

interface ReportsBundle {
  summary: SummaryData;
  salesByPeriod: { days: SalesByDay[]; totals: { publico: number; personal: number; total: number } };
  productsByPeriod: { products: ProductReport[] };
  categoriesByPeriod: { categories: CategoryReport[] };
  profitByPeriod: { days: ProfitByDay[]; totals: { totalRevenue: number; totalCost: number; profit: number; margin: number } };
  staffPerformance: { staff: StaffReport[] };
}

// ---------- Chart colors ----------
const CHART_COLORS = ["#f59e0b", "#f97316", "#10b981", "#e11d48", "#a855f7", "#ec4899", "#eab308", "#64748b"];

const CATEGORY_CHART_COLOR: Record<string, string> = {
  CERVEZA: "#f59e0b",
  BOTANA: "#f97316",
  REFRESCO: "#10b981",
  MIX: "#ec4899",
  SERVICIO: "#a855f7",
  OTROS: "#64748b",
};

// ---------- Helpers ----------
function last30Days(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function thisWeek(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: formatDateInput(monday), to: formatDateInput(sunday) };
}

function thisMonth(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function todayRange(): { from: string; to: string } {
  const t = todayDateInput();
  return { from: t, to: t };
}

async function fetchAllReports(from: string, to: string): Promise<ReportsBundle> {
  const params = `from=${from}&to=${to}`;
  const [summary, salesByPeriod, productsByPeriod, categoriesByPeriod, profitByPeriod, staffPerformance] =
    await Promise.all([
      apiFetch<SummaryData>(`/api/reports?type=summary&${params}`),
      apiFetch<{ days: SalesByDay[]; totals: { publico: number; personal: number; total: number } }>(
        `/api/reports?type=sales-by-period&${params}`
      ),
      apiFetch<{ products: ProductReport[] }>(`/api/reports?type=products-by-period&${params}`),
      apiFetch<{ categories: CategoryReport[] }>(`/api/reports?type=categories-by-period&${params}`),
      apiFetch<{
        days: ProfitByDay[];
        totals: { totalRevenue: number; totalCost: number; profit: number; margin: number };
      }>(`/api/reports?type=profit-by-period&${params}`),
      apiFetch<{ staff: StaffReport[] }>(`/api/reports?type=staff-performance&${params}`),
    ]);

  return {
    summary,
    salesByPeriod,
    productsByPeriod,
    categoriesByPeriod,
    profitByPeriod,
    staffPerformance,
  };
}

// ---------- Sub-components ----------
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MarginBadge({ margin }: { margin: number }) {
  const color =
    margin >= 60
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : margin >= 30
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        : margin >= 0
          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300";
  return <Badge className={color}>{margin.toFixed(1)}%</Badge>;
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.OTROS;
  return <Badge className={color}>{category}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------- Export CSV ----------
function exportCsv(filename: string, rows: string[][]) {
  const BOM = "\uFEFF";
  const csv = BOM + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exportado");
}

// ---------- Main Module ----------
export function ReportsModule() {
  const initial = useMemo(() => last30Days(), []);
  const [draftFrom, setDraftFrom] = useState(initial.from);
  const [draftTo, setDraftTo] = useState(initial.to);
  const [committedFrom, setCommittedFrom] = useState(initial.from);
  const [committedTo, setCommittedTo] = useState(initial.to);
  const [activeTab, setActiveTab] = useState("sales");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", committedFrom, committedTo],
    queryFn: () => fetchAllReports(committedFrom, committedTo),
    staleTime: 30 * 1000,
  });

  const handleGenerate = () => {
    setCommittedFrom(draftFrom);
    setCommittedTo(draftTo);
  };

  const handleQuickRange = (range: { from: string; to: string }) => {
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setCommittedFrom(range.from);
    setCommittedTo(range.to);
  };

  const handleExport = () => {
    if (!data) return;
    if (activeTab === "sales") {
      const rows: string[][] = [["Fecha", "Publico", "Personal", "Total"]];
      data.salesByPeriod.days.forEach((d) =>
        rows.push([d.date, String(d.publico), String(d.personal), String(d.total)])
      );
      exportCsv(`ventas-${committedFrom}-${committedTo}.csv`, rows);
    } else if (activeTab === "products") {
      const rows: string[][] = [["Producto", "Categoria", "Cantidad", "Ingreso", "Costo", "Utilidad", "Margen %"]];
      data.productsByPeriod.products.forEach((p) =>
        rows.push([p.name, p.category, String(p.quantity), String(p.revenue), String(p.cost), String(p.profit), p.margin.toFixed(2)])
      );
      exportCsv(`productos-${committedFrom}-${committedTo}.csv`, rows);
    } else if (activeTab === "categories") {
      const rows: string[][] = [["Categoria", "Cantidad", "Ingreso", "Costo", "Utilidad", "Margen %", "Share %"]];
      data.categoriesByPeriod.categories.forEach((c) =>
        rows.push([c.category, String(c.quantity), String(c.revenue), String(c.cost), String(c.profit), c.margin.toFixed(2), c.share.toFixed(2)])
      );
      exportCsv(`categorias-${committedFrom}-${committedTo}.csv`, rows);
    } else if (activeTab === "profit") {
      const rows: string[][] = [["Fecha", "Ingreso", "Costo", "Utilidad", "Margen %"]];
      data.profitByPeriod.days.forEach((d) =>
        rows.push([d.date, String(d.totalRevenue), String(d.totalCost), String(d.profit), d.margin.toFixed(2)])
      );
      exportCsv(`utilidad-${committedFrom}-${committedTo}.csv`, rows);
    } else if (activeTab === "staff") {
      const rows: string[][] = [["Nombre", "Fichas", "Comision", "Consumo", "Sueldo", "Pagos"]];
      data.staffPerformance.staff.forEach((s) =>
        rows.push([s.name, String(s.totalTokenSales), String(s.commission), String(s.personalConsumption), String(s.salary), String(s.payments)])
      );
      exportCsv(`personal-${committedFrom}-${committedTo}.csv`, rows);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="from-date" className="text-xs">Desde</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="mt-1 h-10 w-40"
                />
              </div>
              <div>
                <Label htmlFor="to-date" className="text-xs">Hasta</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="mt-1 h-10 w-40"
                />
              </div>
              <Button onClick={handleGenerate} className="h-10">
                <Calendar className="mr-2 h-4 w-4" /> Generar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickRange(todayRange())}>Hoy</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickRange(thisWeek())}>Esta semana</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickRange(thisMonth())}>Este mes</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickRange(last30Days())}>Ultimos 30 dias</Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
                <Download className="mr-1 h-3.5 w-3.5" /> Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Error al cargar los reportes. Intenta de nuevo.</CardContent></Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Ventas Totales"
              value={formatCurrency(data.summary.totalSales)}
              subtitle={`${data.summary.daysInRange} dias en el rango`}
              icon={DollarSign}
              accent="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            />
            <KpiCard
              title="Costo Total"
              value={formatCurrency(data.summary.totalCost)}
              subtitle="Costo de productos vendidos"
              icon={TrendingDown}
              accent="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
            />
            <KpiCard
              title="Utilidad Bruta"
              value={formatCurrency(data.summary.totalProfit)}
              subtitle={`Margen ${data.summary.margin.toFixed(1)}%`}
              icon={TrendingUp}
              accent={data.summary.totalProfit >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}
            />
            <KpiCard
              title="Gastos Operativos"
              value={formatCurrency(data.summary.totalExpenses + data.summary.totalStaffPayments)}
              subtitle="Gastos + Pagos a personal"
              icon={Receipt}
              accent="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full flex-wrap gap-1 h-auto">
              <TabsTrigger value="sales" className="flex-1 min-w-0">Ventas por Dia</TabsTrigger>
              <TabsTrigger value="products" className="flex-1 min-w-0">Top Productos</TabsTrigger>
              <TabsTrigger value="categories" className="flex-1 min-w-0">Por Categoria</TabsTrigger>
              <TabsTrigger value="profit" className="flex-1 min-w-0">Utilidad</TabsTrigger>
              <TabsTrigger value="staff" className="flex-1 min-w-0">Personal</TabsTrigger>
            </TabsList>

            {/* Tab: Sales by day */}
            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Ventas Diarias</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.salesByPeriod.days}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tickFormatter={(v) => formatDateShort(v).split(" ").slice(0, 2).join(" ")} fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          labelFormatter={(l) => formatDateShort(String(l))}
                        />
                        <Legend />
                        <Bar dataKey="publico" name="Publico" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="personal" name="Personal" stackId="a" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Publico</TableHead>
                          <TableHead className="text-right">Personal</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">% del total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.salesByPeriod.days.map((d) => {
                          const pct = data.salesByPeriod.totals.total > 0 ? (d.total / data.salesByPeriod.totals.total) * 100 : 0;
                          const isBest = data.summary.bestDay?.date === d.date;
                          const isWorst = data.summary.worstDay?.date === d.date;
                          return (
                            <TableRow key={d.date} className={isBest ? "bg-emerald-50 dark:bg-emerald-900/20" : isWorst ? "bg-rose-50 dark:bg-rose-900/20" : ""}>
                              <TableCell className="font-medium">
                                {formatDateShort(d.date)}
                                {isBest && <Badge className="ml-2 bg-emerald-500">Mejor</Badge>}
                                {isWorst && <Badge className="ml-2 bg-rose-500">Peor</Badge>}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(d.publico)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.personal)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(d.total)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{pct.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Products */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Top 15 Productos por Ingreso</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.productsByPeriod.products.slice(0, 15)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" fontSize={11} tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="name" width={140} fontSize={10} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="revenue" name="Ingreso" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Ingreso</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                          <TableHead className="text-right">Utilidad</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.productsByPeriod.products.map((p) => (
                          <TableRow key={p.productId}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell><CategoryBadge category={p.category} /></TableCell>
                            <TableCell className="text-right">{formatNumber(p.quantity)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(p.profit)}</TableCell>
                            <TableCell className="text-right"><MarginBadge margin={p.margin} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Categories */}
            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Ingreso por Categoria</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categoriesByPeriod.categories}
                          dataKey="revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(e) => `${e.category}: ${formatCurrency(Number(e.revenue))}`}
                          labelLine={false}
                        >
                          {data.categoriesByPeriod.categories.map((c) => (
                            <Cell key={c.category} fill={CATEGORY_CHART_COLOR[c.category] || "#64748b"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Ingreso</TableHead>
                          <TableHead className="text-right">Utilidad</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                          <TableHead className="text-right">% Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.categoriesByPeriod.categories.map((c) => (
                          <TableRow key={c.category}>
                            <TableCell><CategoryBadge category={c.category} /></TableCell>
                            <TableCell className="text-right">{formatNumber(c.quantity)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(c.revenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(c.profit)}</TableCell>
                            <TableCell className="text-right"><MarginBadge margin={c.margin} /></TableCell>
                            <TableCell className="text-right text-muted-foreground">{c.share.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Profit */}
            <TabsContent value="profit" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Ingreso, Costo y Utilidad</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.profitByPeriod.days}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tickFormatter={(v) => formatDateShort(v).split(" ").slice(0, 2).join(" ")} fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          labelFormatter={(l) => formatDateShort(String(l))}
                        />
                        <Legend />
                        <Bar dataKey="totalRevenue" name="Ingreso" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalCost" name="Costo" fill="#f97316" radius={[4, 4, 0, 0]} />
                        <Line dataKey="profit" name="Utilidad" stroke="#10b981" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Ingreso</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                          <TableHead className="text-right">Utilidad</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.profitByPeriod.days.map((d) => (
                          <TableRow key={d.date}>
                            <TableCell className="font-medium">{formatDateShort(d.date)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(d.totalRevenue)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(d.totalCost)}</TableCell>
                            <TableCell className={`text-right font-semibold ${d.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(d.profit)}</TableCell>
                            <TableCell className="text-right"><MarginBadge margin={d.margin} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Staff */}
            <TabsContent value="staff" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Desempeno del Personal</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.staffPerformance.staff}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `$${v}`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="totalTokenSales" name="Fichas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="commission" name="Comisiones" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="payments" name="Pagos" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-right">Fichas</TableHead>
                          <TableHead className="text-right">Comisiones</TableHead>
                          <TableHead className="text-right">Consumo</TableHead>
                          <TableHead className="text-right">Sueldo</TableHead>
                          <TableHead className="text-right">Pagos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.staffPerformance.staff.map((s) => (
                          <TableRow key={s.staffId}>
                            <TableCell className="font-medium">
                              {s.name}
                              {!s.active && <Badge className="ml-2 bg-slate-400">Inactivo</Badge>}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(s.totalTokenSales)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(s.commission)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(s.personalConsumption)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(s.salary)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(s.payments)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}

// Default export for convenience
export default ReportsModule;
