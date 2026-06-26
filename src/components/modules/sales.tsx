"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  Gift,
  TrendingUp,
  Calendar,
  User,
  Package,
  X,
  Minus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  todayDateInput,
  CATEGORY_COLORS,
} from "@/lib/format";

// ---------- Types ----------
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
}

interface Sale {
  id: string;
  date: string;
  productId: string;
  product: Product;
  saleType: string;
  staffId?: string | null;
  staff?: Staff | null;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  total: number;
  isComplimentary: boolean;
  createdAt: string;
}

// ---------- Main Module ----------
export function SalesModule() {
  const [activeTab, setActiveTab] = useState<"PUBLICO" | "PERSONAL">("PUBLICO");
  const [selectedDate, setSelectedDate] = useState(todayDateInput());

  return (
    <div className="space-y-5">
      {/* Header con fecha */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Label htmlFor="sale-date" className="text-xs text-muted-foreground">
              Fecha de venta
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                id="sale-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 w-auto"
              />
            </div>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {formatDate(selectedDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "PUBLICO" | "PERSONAL")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="PUBLICO">Venta al Publico</TabsTrigger>
          <TabsTrigger value="PERSONAL">Venta a Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="PUBLICO" className="mt-4">
          <SalesPOS
            key={`publico-${selectedDate}`}
            saleType="PUBLICO"
            selectedDate={selectedDate}
          />
        </TabsContent>

        <TabsContent value="PERSONAL" className="mt-4">
          <SalesPOS
            key={`personal-${selectedDate}`}
            saleType="PERSONAL"
            selectedDate={selectedDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- POS Component ----------
function SalesPOS({
  saleType,
  selectedDate,
}: {
  saleType: "PUBLICO" | "PERSONAL";
  selectedDate: string;
}) {
  const queryClient = useQueryClient();

  // Catalogo de productos
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products", "active"],
    queryFn: () =>
      apiFetch<Product[]>("/api/products?active=true"),
  });

  // Personal (solo para PERSONAL)
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff", "active"],
    queryFn: () => apiFetch<Staff[]>("/api/staff?active=true"),
    enabled: saleType === "PERSONAL",
  });

  // Ventas del dia
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["sales", selectedDate, saleType],
    queryFn: () => {
      const params = new URLSearchParams({
        date: selectedDate,
        saleType,
      });
      return apiFetch<Sale[]>(`/api/sales?${params.toString()}`);
    },
  });

  // Estado del formulario
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customUnitPrice, setCustomUnitPrice] = useState<number | null>(null);
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);

  // Precio unitario: usa el personalizado si se definio, si no el del producto
  const unitPrice = isComplimentary
    ? 0
    : customUnitPrice !== null
      ? customUnitPrice
      : selectedProduct?.salePrice ?? 0;

  // Filtrar productos por busqueda
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.presentation || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  // Agrupar productos por categoria
  const productsByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of filteredProducts) {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    }
    return groups;
  }, [filteredProducts]);

  // Totales del dia
  const totals = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + (s.isComplimentary ? 0 : s.total), 0);
    const units = sales.reduce((sum, s) => sum + s.quantity, 0);
    const complimentary = sales.filter((s) => s.isComplimentary).length;
    const recordCount = sales.length;
    return { total, units, complimentary, recordCount };
  }, [sales]);

  // Mutacion: registrar venta
  const registerMutation = useMutation({
    mutationFn: (data: {
      date: string;
      productId: string;
      saleType: string;
      staffId?: string;
      quantity: number;
      unitPrice: number;
      isComplimentary: boolean;
    }) => apiFetch<Sale>("/api/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sales", selectedDate, saleType],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Venta registrada");
      // Resetear formulario
      setSelectedProduct(null);
      setQuantity(1);
      setCustomUnitPrice(null);
      setIsComplimentary(false);
      if (saleType === "PERSONAL") setSelectedStaffId("");
      setSearch("");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Error al registrar la venta";
      toast.error(msg);
    },
  });

  // Mutacion: eliminar venta
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sales", selectedDate, saleType],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Venta eliminada");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Error al eliminar la venta"),
  });

  const handleRegister = () => {
    if (!selectedProduct) {
      toast.error("Selecciona un producto");
      return;
    }
    if (quantity < 1) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    if (saleType === "PERSONAL" && !selectedStaffId) {
      toast.error("Selecciona el empleado");
      return;
    }

    registerMutation.mutate({
      date: selectedDate,
      productId: selectedProduct.id,
      saleType,
      staffId: saleType === "PERSONAL" ? selectedStaffId : undefined,
      quantity,
      unitPrice: isComplimentary ? 0 : unitPrice,
      isComplimentary,
    });
  };

  const lineTotal = isComplimentary ? 0 : quantity * unitPrice;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* COLUMNA IZQUIERDA: Catalogo + Formulario (2/5) */}
      <div className="space-y-4 lg:col-span-2">
        {/* Buscador de productos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-amber-600" />
              Registrar Venta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Selector de empleado (solo PERSONAL) */}
            {saleType === "PERSONAL" && (
              <div>
                <Label className="text-xs">Empleado</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue placeholder="Selecciona empleado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                  aria-label="Limpiar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Lista de productos agrupados */}
            <ScrollArea className="h-64 rounded-md border">
              {loadingProducts ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Cargando productos...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No se encontraron productos
                </div>
              ) : (
                <div className="p-2">
                  {Object.entries(productsByCategory).map(([cat, items]) => (
                    <div key={cat} className="mb-2">
                      <div className="sticky top-0 z-10 bg-card px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                        {cat} · {items.length}
                      </div>
                      <div className="space-y-1">
                        {items.map((p) => {
                          const isSelected = selectedProduct?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setSelectedProduct(p)}
                              className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                isSelected
                                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                  : "border-transparent hover:bg-accent"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{p.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.presentation || p.category}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="font-semibold text-amber-700 dark:text-amber-400">
                                  {formatCurrency(p.salePrice)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Formulario de captura */}
        {selectedProduct && (
          <Card className="border-amber-500/50">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="truncate font-semibold">{selectedProduct.name}</span>
                  </div>
                  <Badge className={`mt-1 ${CATEGORY_COLORS[selectedProduct.category] || ""}`}>
                    {selectedProduct.category}
                  </Badge>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  aria-label="Quitar producto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cantidad */}
              <div>
                <Label className="text-xs">Cantidad</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Restar"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setQuantity(isNaN(v) || v < 1 ? 1 : v);
                    }}
                    className="h-10 text-center text-lg font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Sumar"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Precio unitario */}
              <div>
                <Label className="text-xs">
                  Precio unitario{" "}
                  {customUnitPrice !== null && (
                    <button
                      type="button"
                      onClick={() => setCustomUnitPrice(null)}
                      className="ml-1 text-amber-600 underline hover:text-amber-700"
                    >
                      restaurar
                    </button>
                  )}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setCustomUnitPrice(isNaN(v) || v < 0 ? 0 : v);
                  }}
                  className="mt-1 h-10"
                  disabled={isComplimentary}
                />
              </div>

              {/* Cortesia */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-sm font-medium">Cortesia</div>
                    <div className="text-xs text-muted-foreground">
                      Cuenta como unidad, sin costo
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isComplimentary}
                  onCheckedChange={setIsComplimentary}
                />
              </div>

              {/* Total de la linea */}
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(lineTotal)}
                </span>
              </div>

              {/* Boton registrar */}
              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="h-12 w-full bg-amber-600 text-base font-semibold hover:bg-amber-700"
              >
                {registerMutation.isPending ? (
                  "Registrando..."
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Registrar Venta
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* COLUMNA DERECHA: Ventas del dia (3/5) */}
      <div className="lg:col-span-3">
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-amber-600" />
                Ventas del Dia
              </CardTitle>
              <Badge variant="outline" className="capitalize">
                {saleType === "PUBLICO" ? "Publico" : "Personal"}
              </Badge>
            </div>
          </CardHeader>

          {/* KPIs del dia */}
          <div className="grid grid-cols-3 gap-2 px-6 pb-3">
            <div className="rounded-lg border bg-amber-50 p-3 text-center dark:bg-amber-900/20">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400">
                {formatCurrency(totals.total)}
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">Productos</div>
              <div className="mt-1 text-lg font-bold">{totals.units}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">Cortesias</div>
              <div className="mt-1 text-lg font-bold text-purple-600">
                {totals.complimentary}
              </div>
            </div>
          </div>

          <CardContent className="flex-1 p-0">
            {loadingSales ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Cargando ventas...
              </div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No hay ventas registradas para este dia.
                </p>
                <p className="text-xs text-muted-foreground">
                  Selecciona un producto y registra la primera venta.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-22rem)] min-h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Producto</TableHead>
                      {saleType === "PERSONAL" && <TableHead>Empleado</TableHead>}
                      <TableHead className="text-center">Cant</TableHead>
                      <TableHead className="text-right">P. Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale, idx) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {sale.product.name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className={`h-4 px-1 text-[10px] ${CATEGORY_COLORS[sale.product.category] || ""}`}
                                >
                                  {sale.product.category}
                                </Badge>
                                {sale.isComplimentary && (
                                  <Badge className="h-4 px-1 text-[10px] bg-purple-500">
                                    <Gift className="mr-0.5 h-2.5 w-2.5" /> Cortesia
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {saleType === "PERSONAL" && (
                          <TableCell className="text-sm">
                            {sale.staff?.name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-center font-medium">
                          {sale.quantity}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {sale.isComplimentary
                            ? "-"
                            : formatCurrency(sale.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {sale.isComplimentary ? (
                            <span className="text-purple-600">$0</span>
                          ) : (
                            formatCurrency(sale.total)
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                            onClick={() => setDeleteTarget(sale)}
                            aria-label="Eliminar venta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>

          {/* Total acumulado */}
          {sales.length > 0 && (
            <div className="border-t bg-amber-50 p-4 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold">TOTAL DEL DIA</span>
                </div>
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(totals.total)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{totals.recordCount} ventas registradas</span>
                <span>{totals.units} unidades · {totals.complimentary} cortesias</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Dialog de confirmacion de borrado */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
            <AlertDialogDescription>
              Seguro que deseas eliminar la venta de{" "}
              <strong>{deleteTarget?.product.name}</strong> (
              {deleteTarget?.quantity} u.)? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SalesModule;
