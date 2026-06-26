"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  ShoppingCart,
  Users,
  Gift,
  AlertCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import {
  formatCurrency,
  formatDateInput,
  todayDateInput,
  CATEGORY_COLORS,
} from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------- Types ----------------
interface Product {
  id: string;
  name: string;
  category: string;
  presentation?: string | null;
  purchasePrice: number;
  salePrice: number;
  active: boolean;
  sortOrder: number;
}

interface Staff {
  id: string;
  name: string;
  salary: number;
  active: boolean;
  sortOrder: number;
}

interface Sale {
  id: string;
  date: string;
  productId: string;
  product?: Product;
  saleType: string;
  staffId?: string | null;
  staff?: Staff | null;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  total: number;
  isComplimentary: boolean;
}

// ---------------- Constants ----------------
const CATEGORY_ORDER = [
  "CERVEZA",
  "BOTANA",
  "REFRESCO",
  "MIX",
  "SERVICIO",
  "OTROS",
];

const CATEGORY_HEADER_BG: Record<string, string> = {
  CERVEZA: "bg-amber-50 dark:bg-amber-950/30",
  BOTANA: "bg-orange-50 dark:bg-orange-950/30",
  REFRESCO: "bg-emerald-50 dark:bg-emerald-950/30",
  MIX: "bg-pink-50 dark:bg-pink-950/30",
  SERVICIO: "bg-purple-50 dark:bg-purple-950/30",
  OTROS: "bg-slate-50 dark:bg-slate-900/40",
};

// ---------------- Helpers ----------------
function buildQtyMap(sales: Sale[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of sales) m[s.productId] = s.quantity;
  return m;
}

function buildCortesiaMap(sales: Sale[]): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const s of sales) if (s.isComplimentary) m[s.productId] = true;
  return m;
}

function buildPersonalQtyMap(
  sales: Sale[]
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of sales) {
    if (!s.staffId) continue;
    const key = `${s.productId}|${s.staffId}`;
    m[key] = s.quantity;
  }
  return m;
}

function buildPersonalCortesiaMap(
  sales: Sale[]
): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const s of sales) {
    if (!s.staffId) continue;
    if (s.isComplimentary) m[`${s.productId}|${s.staffId}`] = true;
  }
  return m;
}

// ---------------- Main Component ----------------
export function SalesModule() {
  const [selectedDate, setSelectedDate] = useState<string>(todayDateInput());

  // ---------------- Queries ----------------
  const productsQuery = useQuery<Product[]>({
    queryKey: ["products", "active"],
    queryFn: () => apiFetch<Product[]>("/api/products?active=true"),
  });

  const staffQuery = useQuery<Staff[]>({
    queryKey: ["staff", "active"],
    queryFn: () => apiFetch<Staff[]>("/api/staff?active=true"),
  });

  const salesPublicoQuery = useQuery<Sale[]>({
    queryKey: ["sales", selectedDate, "PUBLICO"],
    queryFn: () =>
      apiFetch<Sale[]>(
        `/api/sales?date=${selectedDate}&saleType=PUBLICO`
      ),
    enabled: !!selectedDate,
  });

  const salesPersonalQuery = useQuery<Sale[]>({
    queryKey: ["sales", selectedDate, "PERSONAL"],
    queryFn: () =>
      apiFetch<Sale[]>(
        `/api/sales?date=${selectedDate}&saleType=PERSONAL`
      ),
    enabled: !!selectedDate,
  });

  const products = useMemo(
    () =>
      (productsQuery.data ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [productsQuery.data]
  );

  const activeStaff = useMemo(
    () =>
      (staffQuery.data ?? [])
        .filter((s) => s.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [staffQuery.data]
  );

  const isLoadingProducts = productsQuery.isLoading;
  const isLoadingStaff = staffQuery.isLoading;
  const isLoadingSales =
    salesPublicoQuery.isLoading || salesPersonalQuery.isLoading;

  // ---------------- Date handlers ----------------
  function handlePrevDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateInput(d));
  }
  function handleNextDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateInput(d));
  }
  function handleToday() {
    setSelectedDate(todayDateInput());
  }

  const dataReady =
    !isLoadingProducts &&
    !isLoadingSales &&
    !!salesPublicoQuery.data &&
    !!salesPersonalQuery.data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toolbar fecha */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            aria-label="Dia anterior"
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative flex items-center">
            <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-[170px] pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            aria-label="Dia siguiente"
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-9"
          >
            Hoy
          </Button>
        </div>

        <div className="hidden text-right text-xs text-muted-foreground sm:block">
          {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {isLoadingProducts || isLoadingStaff || isLoadingSales ? (
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : dataReady ? (
        <SalesEditor
          key={selectedDate}
          date={selectedDate}
          products={products}
          staff={activeStaff}
          initialPublico={salesPublicoQuery.data as Sale[]}
          initialPersonal={salesPersonalQuery.data as Sale[]}
        />
      ) : (
        <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No se pudieron cargar los datos. Intenta de nuevo.
          </p>
        </Card>
      )}
    </div>
  );
}

// ---------------- Editor (mounted per-date via key) ----------------
function SalesEditor({
  date,
  products,
  staff,
  initialPublico,
  initialPersonal,
}: {
  date: string;
  products: Product[];
  staff: Staff[];
  initialPublico: Sale[];
  initialPersonal: Sale[];
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"PUBLICO" | "PERSONAL">("PUBLICO");

  // Draft state initialized from server data (per-date remount via key)
  const [publicoQtys, setPublicoQtys] = useState<Record<string, number>>(
    () => buildQtyMap(initialPublico)
  );
  const [publicoCortesia, setPublicoCortesia] = useState<
    Record<string, boolean>
  >(() => buildCortesiaMap(initialPublico));
  const [personalQtys, setPersonalQtys] = useState<Record<string, number>>(
    () => buildPersonalQtyMap(initialPersonal)
  );
  const [personalCortesia, setPersonalCortesia] = useState<
    Record<string, boolean>
  >(() => buildPersonalCortesiaMap(initialPersonal));

  // ---------------- Save mutation ----------------
  const saveMutation = useMutation({
    mutationFn: (payload: {
      date: string;
      items: Array<{
        productId: string;
        saleType: string;
        quantity: number;
        isComplimentary: boolean;
        staffId?: string;
      }>;
    }) =>
      apiFetch<{
        summary: {
          created: number;
          updated: number;
          deleted: number;
          skipped: number;
        };
      }>("/api/sales/batch", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      const s = data?.summary;
      toast.success(
        `Ventas guardadas (${s?.created ?? 0} nuevas, ${s?.updated ?? 0} actualizadas, ${s?.deleted ?? 0} eliminadas)`
      );
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "Error al guardar las ventas"),
  });

  // ---------------- Derived data ----------------
  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const cat of CATEGORY_ORDER) map[cat] = [];
    for (const p of products) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [products]);

  const publicoTotals = useMemo(() => {
    let total = 0;
    let cortesiasCount = 0;
    let cortesiasQty = 0;
    for (const p of products) {
      const qty = publicoQtys[p.id] || 0;
      const isComp = !!publicoCortesia[p.id];
      if (qty > 0) {
        if (isComp) {
          cortesiasCount += 1;
          cortesiasQty += qty;
        } else {
          total += qty * p.salePrice;
        }
      }
    }
    return { total, cortesiasCount, cortesiasQty };
  }, [products, publicoQtys, publicoCortesia]);

  const personalTotals = useMemo(() => {
    const perStaff: Record<string, number> = {};
    const perStaffCortesia: Record<string, number> = {};
    let grandTotal = 0;
    for (const p of products) {
      for (const s of staff) {
        const key = `${p.id}|${s.id}`;
        const qty = personalQtys[key] || 0;
        const isComp = !!personalCortesia[key];
        if (qty > 0) {
          if (isComp) {
            perStaffCortesia[s.id] = (perStaffCortesia[s.id] || 0) + qty;
          } else {
            const lineTotal = qty * p.salePrice;
            perStaff[s.id] = (perStaff[s.id] || 0) + lineTotal;
            grandTotal += lineTotal;
          }
        }
      }
    }
    return { perStaff, perStaffCortesia, grandTotal };
  }, [products, staff, personalQtys, personalCortesia]);

  // ---------------- Handlers ----------------
  function setPublicoQty(productId: string, qty: number) {
    setPublicoQtys((prev) => ({ ...prev, [productId]: qty }));
  }
  function togglePublicoCortesia(productId: string, checked: boolean) {
    setPublicoCortesia((prev) => {
      const next = { ...prev };
      if (checked) next[productId] = true;
      else delete next[productId];
      return next;
    });
  }
  function setPersonalQty(productId: string, staffId: string, qty: number) {
    const key = `${productId}|${staffId}`;
    setPersonalQtys((prev) => ({ ...prev, [key]: qty }));
  }
  function togglePersonalCortesia(
    productId: string,
    staffId: string,
    checked: boolean
  ) {
    const key = `${productId}|${staffId}`;
    setPersonalCortesia((prev) => {
      const next = { ...prev };
      if (checked) next[key] = true;
      else delete next[key];
      return next;
    });
  }

  function handleSavePublico() {
    const items = products.map((p) => ({
      productId: p.id,
      saleType: "PUBLICO" as const,
      quantity: publicoQtys[p.id] || 0,
      isComplimentary: !!publicoCortesia[p.id],
    }));
    saveMutation.mutate({ date, items });
  }

  function handleSavePersonal() {
    const items: Array<{
      productId: string;
      saleType: string;
      quantity: number;
      isComplimentary: boolean;
      staffId: string;
    }> = [];
    for (const p of products) {
      for (const s of staff) {
        const key = `${p.id}|${s.id}`;
        const qty = personalQtys[key] || 0;
        items.push({
          productId: p.id,
          saleType: "PERSONAL",
          staffId: s.id,
          quantity: qty,
          isComplimentary: !!personalCortesia[key],
        });
      }
    }
    if (items.length === 0) {
      toast.info("No hay personal ni productos para guardar");
      return;
    }
    saveMutation.mutate({ date, items });
  }

  function handleClearPublico() {
    setPublicoQtys({});
    setPublicoCortesia({});
    toast.info("Cantidades limpiadas (usa Guardar para aplicar)");
  }
  function handleClearPersonal() {
    setPersonalQtys({});
    setPersonalCortesia({});
    toast.info("Cantidades limpiadas (usa Guardar para aplicar)");
  }

  const isSaving = saveMutation.isPending;

  const totalCortesiasQty =
    publicoTotals.cortesiasQty +
    Object.values(personalTotals.perStaffCortesia).reduce(
      (a, b) => a + b,
      0
    );
  const totalCortesiasItems =
    publicoTotals.cortesiasCount +
    Object.values(personalTotals.perStaffCortesia).filter((v) => v > 0)
      .length;

  // ---------------- Render ----------------
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Venta Publico"
          value={formatCurrency(publicoTotals.total)}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="amber"
          subtitle={`${publicoTotals.cortesiasCount} cortesia(s)`}
        />
        <SummaryCard
          label="Venta Personal"
          value={formatCurrency(personalTotals.grandTotal)}
          icon={<Users className="h-5 w-5" />}
          accent="orange"
          subtitle={`${staff.length} personal`}
        />
        <SummaryCard
          label="Cortesias del dia"
          value={`${totalCortesiasQty} pzs`}
          icon={<Gift className="h-5 w-5" />}
          accent="emerald"
          subtitle={`${totalCortesiasItems} items`}
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "PUBLICO" | "PERSONAL")}
      >
        <TabsList className="h-auto">
          <TabsTrigger value="PUBLICO" className="px-4 py-1.5">
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            Venta Publico
          </TabsTrigger>
          <TabsTrigger value="PERSONAL" className="px-4 py-1.5">
            <Users className="mr-1.5 h-4 w-4" />
            Venta Personal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="PUBLICO" className="mt-4">
          <PublicoTab
            products={products}
            productsByCategory={productsByCategory}
            qtys={publicoQtys}
            cortesias={publicoCortesia}
            totals={publicoTotals}
            onQtyChange={setPublicoQty}
            onCortesiaToggle={togglePublicoCortesia}
            onSave={handleSavePublico}
            onClear={handleClearPublico}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="PERSONAL" className="mt-4">
          <PersonalTab
            products={products}
            staff={staff}
            qtys={personalQtys}
            cortesias={personalCortesia}
            perStaffTotals={personalTotals.perStaff}
            perStaffCortesia={personalTotals.perStaffCortesia}
            grandTotal={personalTotals.grandTotal}
            onQtyChange={setPersonalQty}
            onCortesiaToggle={togglePersonalCortesia}
            onSave={handleSavePersonal}
            onClear={handleClearPersonal}
            isSaving={isSaving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Sub-components ----------------
function SummaryCard({
  label,
  value,
  icon,
  accent,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "amber" | "orange" | "emerald";
  subtitle?: string;
}) {
  const accentClasses: Record<
    typeof accent,
    { bg: string; icon: string }
  > = {
    amber: {
      bg: "border-amber-200 dark:border-amber-900/50",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    orange: {
      bg: "border-orange-200 dark:border-orange-900/50",
      icon: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    },
    emerald: {
      bg: "border-emerald-200 dark:border-emerald-900/50",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
  };
  const a = accentClasses[accent];
  return (
    <Card className={`gap-2 p-4 ${a.bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.icon}`}
        >
          {icon}
        </span>
      </div>
      <div className="text-xl font-bold tabular-nums sm:text-2xl">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </Card>
  );
}

// ---------------- Publico Tab ----------------
function PublicoTab({
  products,
  productsByCategory,
  qtys,
  cortesias,
  totals,
  onQtyChange,
  onCortesiaToggle,
  onSave,
  onClear,
  isSaving,
}: {
  products: Product[];
  productsByCategory: Record<string, Product[]>;
  qtys: Record<string, number>;
  cortesias: Record<string, boolean>;
  totals: { total: number; cortesiasCount: number; cortesiasQty: number };
  onQtyChange: (productId: string, qty: number) => void;
  onCortesiaToggle: (productId: string, checked: boolean) => void;
  onSave: () => void;
  onClear: () => void;
  isSaving: boolean;
}) {
  if (products.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No hay productos activos. Crea productos primero en el modulo de
          Productos.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Captura de venta al publico</h3>
          <p className="text-xs text-muted-foreground">
            Captura las cantidades vendidas. Las cortesias cuentan como
            unidades pero no como ingreso.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={isSaving}
            className="h-9"
          >
            Limpiar
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="h-9 bg-amber-600 text-white hover:bg-amber-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="min-w-[180px]">Producto</TableHead>
              <TableHead className="text-right">$ Compra</TableHead>
              <TableHead className="text-right">$ Venta</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
              <TableHead className="text-right">$ Total</TableHead>
              <TableHead className="text-center">Cortesia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CATEGORY_ORDER.map((cat) => {
              const list = productsByCategory[cat] ?? [];
              if (list.length === 0) return null;
              const catTotal = list.reduce((sum, p) => {
                const qty = qtys[p.id] || 0;
                const isComp = !!cortesias[p.id];
                if (qty > 0 && !isComp) return sum + qty * p.salePrice;
                return sum;
              }, 0);
              return (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  products={list}
                  qtys={qtys}
                  cortesias={cortesias}
                  onQtyChange={onQtyChange}
                  onCortesiaToggle={onCortesiaToggle}
                  catTotal={catTotal}
                />
              );
            })}
          </TableBody>
          <TableFooter className="sticky bottom-0 z-10 bg-amber-50 dark:bg-amber-950/40">
            <TableRow className="border-t-2 border-amber-300 dark:border-amber-800 text-base font-bold">
              <TableCell colSpan={4} className="text-right uppercase">
                Total de venta
              </TableCell>
              <TableCell className="text-right tabular-nums text-amber-800 dark:text-amber-200">
                {formatCurrency(totals.total)}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  <Gift className="mr-1 h-3 w-3" />
                  {totals.cortesiasCount} ({totals.cortesiasQty} pzs)
                </Badge>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Card>
  );
}

function CategoryGroup({
  category,
  products,
  qtys,
  cortesias,
  onQtyChange,
  onCortesiaToggle,
  catTotal,
}: {
  category: string;
  products: Product[];
  qtys: Record<string, number>;
  cortesias: Record<string, boolean>;
  onQtyChange: (productId: string, qty: number) => void;
  onCortesiaToggle: (productId: string, checked: boolean) => void;
  catTotal: number;
}) {
  return (
    <>
      <TableRow
        className={`${CATEGORY_HEADER_BG[category] ?? "bg-muted/40"} hover:bg-muted/40`}
      >
        <TableCell colSpan={4} className="py-2">
          <Badge
            variant="outline"
            className={
              CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTROS
            }
          >
            {category}
          </Badge>
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {products.length} producto{products.length === 1 ? "" : "s"}
          </span>
        </TableCell>
        <TableCell className="py-2 text-right text-xs font-semibold tabular-nums">
          {formatCurrency(catTotal)}
        </TableCell>
        <TableCell />
      </TableRow>
      {products.map((p) => {
        const qty = qtys[p.id] || 0;
        const isComp = !!cortesias[p.id];
        const lineTotal = isComp ? 0 : qty * p.salePrice;
        return (
          <TableRow key={p.id}>
            <TableCell className="font-medium">
              <div className="flex flex-col">
                <span className="text-sm">{p.name}</span>
                {p.presentation && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {p.presentation}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
              {formatCurrency(p.purchasePrice)}
            </TableCell>
            <TableCell className="text-right text-sm font-medium tabular-nums">
              {formatCurrency(p.salePrice)}
            </TableCell>
            <TableCell className="text-center">
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={qty === 0 ? "" : String(qty)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  onQtyChange(p.id, isNaN(v) || v < 0 ? 0 : v);
                }}
                placeholder="0"
                className="h-9 w-16 text-center tabular-nums"
                aria-label={`Cantidad de ${p.name}`}
              />
            </TableCell>
            <TableCell className="text-right text-sm font-semibold tabular-nums">
              {isComp ? (
                <span className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(qty * p.salePrice)}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    CORTESIA
                  </Badge>
                </span>
              ) : (
                formatCurrency(lineTotal)
              )}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={isComp}
                onCheckedChange={(checked) =>
                  onCortesiaToggle(p.id, Boolean(checked))
                }
                aria-label={`Marcar ${p.name} como cortesia`}
                className="data-[state=checked]:bg-emerald-600"
              />
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

// ---------------- Personal Tab ----------------
function PersonalTab({
  products,
  staff,
  qtys,
  cortesias,
  perStaffTotals,
  perStaffCortesia,
  grandTotal,
  onQtyChange,
  onCortesiaToggle,
  onSave,
  onClear,
  isSaving,
}: {
  products: Product[];
  staff: Staff[];
  qtys: Record<string, number>;
  cortesias: Record<string, boolean>;
  perStaffTotals: Record<string, number>;
  perStaffCortesia: Record<string, number>;
  grandTotal: number;
  onQtyChange: (productId: string, staffId: string, qty: number) => void;
  onCortesiaToggle: (
    productId: string,
    staffId: string,
    checked: boolean
  ) => void;
  onSave: () => void;
  onClear: () => void;
  isSaving: boolean;
}) {
  if (products.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No hay productos activos para registrar consumo de personal.
        </p>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No hay personal activo. Agrega personal en el modulo de Personal.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Consumo de personal
          </h3>
          <p className="text-xs text-muted-foreground">
            Captura las cantidades consumidas por cada miembro del personal.
            Desliza horizontalmente para ver mas columnas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={isSaving}
            className="h-9"
          >
            Limpiar
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="h-9 bg-amber-600 text-white hover:bg-amber-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="sticky left-0 z-20 min-w-[160px] bg-card">
                Producto
              </TableHead>
              <TableHead className="text-right">$ Venta</TableHead>
              {staff.map((s) => (
                <TableHead
                  key={s.id}
                  className="min-w-[110px] text-center"
                >
                  {s.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {CATEGORY_ORDER.flatMap((cat) => {
              const list = products.filter((p) => p.category === cat);
              if (list.length === 0) return [];
              const headerRow = (
                <TableRow
                  key={`cat-${cat}`}
                  className={`${CATEGORY_HEADER_BG[cat] ?? "bg-muted/40"} hover:bg-muted/40`}
                >
                  <TableCell
                    colSpan={2 + staff.length}
                    className="py-2"
                  >
                    <Badge
                      variant="outline"
                      className={
                        CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.OTROS
                      }
                    >
                      {cat}
                    </Badge>
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      {list.length} producto{list.length === 1 ? "" : "s"}
                    </span>
                  </TableCell>
                </TableRow>
              );
              const productRows = list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="sticky left-0 z-10 min-w-[160px] bg-card font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm">{p.name}</span>
                      {p.presentation && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {p.presentation}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">
                    {formatCurrency(p.salePrice)}
                  </TableCell>
                  {staff.map((s) => {
                    const key = `${p.id}|${s.id}`;
                    const qty = qtys[key] || 0;
                    const isComp = !!cortesias[key];
                    return (
                      <TableCell
                        key={s.id}
                        className="text-center align-top"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={qty === 0 ? "" : String(qty)}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              onQtyChange(
                                p.id,
                                s.id,
                                isNaN(v) || v < 0 ? 0 : v
                              );
                            }}
                            placeholder="0"
                            className="h-9 w-16 text-center tabular-nums"
                            aria-label={`Cantidad de ${p.name} para ${s.name}`}
                          />
                          {qty > 0 && (
                            <label className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                              <Checkbox
                                checked={isComp}
                                onCheckedChange={(checked) =>
                                  onCortesiaToggle(
                                    p.id,
                                    s.id,
                                    Boolean(checked)
                                  )
                                }
                                className="data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                              />
                              C
                            </label>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ));
              return [headerRow, ...productRows];
            })}
          </TableBody>
          <TableFooter className="sticky bottom-0 z-10 bg-amber-50 dark:bg-amber-950/40">
            <TableRow className="border-t-2 border-amber-300 dark:border-amber-800 text-sm font-bold">
              <TableCell
                colSpan={2}
                className="sticky left-0 z-10 bg-amber-50 dark:bg-amber-950/40 uppercase"
              >
                Total por personal
              </TableCell>
              {staff.map((s) => (
                <TableCell
                  key={s.id}
                  className="text-center align-top"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="tabular-nums text-amber-800 dark:text-amber-200">
                      {formatCurrency(perStaffTotals[s.id] || 0)}
                    </span>
                    {perStaffCortesia[s.id] > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      >
                        <Gift className="mr-1 h-3 w-3" />
                        {perStaffCortesia[s.id]} c
                      </Badge>
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
            <TableRow className="bg-amber-100 dark:bg-amber-900/50 text-base font-bold">
              <TableCell
                colSpan={2}
                className="sticky left-0 z-10 bg-amber-100 dark:bg-amber-900/50 uppercase"
              >
                Gran total
              </TableCell>
              <TableCell
                colSpan={staff.length}
                className="text-right tabular-nums text-amber-900 dark:text-amber-100"
              >
                {formatCurrency(grandTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Card>
  );
}

export default SalesModule;
