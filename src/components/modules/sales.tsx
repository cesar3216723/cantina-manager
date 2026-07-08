"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Receipt,
  Gift,
  TrendingUp,
  Calendar,
  Package,
  X,
  Minus,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User,
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  tokenCommissionType?: string;
  tokenCommissionValue?: number;
  active: boolean;
}

interface TokenSale {
  id: string;
  date: string;
  staffId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  commission: number;
  paymentMethod?: string;
  staff?: Staff;
  product?: Product;
}

interface Sale {
  id: string;
  date: string;
  ticketId?: string | null;
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

interface Ticket {
  ticketId: string;
  items: Sale[];
  total: number;
  itemCount: number;
  unitCount: number;
  createdAt: string;
  saleType: string;
  staffId?: string | null;
  staffName?: string | null;
  complimentaryCount: number;
  paymentMethod?: string;
}

interface TicketsResponse {
  date: string;
  tickets: Ticket[];
  summary: {
    ticketCount: number;
    total: number;
    unitCount: number;
    complimentaryCount: number;
  };
}

// ---------- Cart Line ----------
interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
  isComplimentary: boolean;
}

// ---------- Main Module ----------
export function SalesModule({
  initialDate,
  onDateHandled,
}: {
  initialDate?: string;
  onDateHandled?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"PUBLICO" | "PERSONAL" | "FICHAS">("PUBLICO");
  const [selectedDate, setSelectedDate] = useState(todayDateInput());

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
      if (onDateHandled) onDateHandled();
    }
  }, [initialDate, onDateHandled]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateInput(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateInput(d));
  };

  return (
    <div className="space-y-5">
      {/* Header con fecha */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Label htmlFor="sale-date" className="text-xs text-muted-foreground">
              Fecha
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePrevDay}
                aria-label="Dia anterior"
                className="h-10 w-10 shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="relative flex items-center">
                <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sale-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 w-auto pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                aria-label="Dia siguiente"
                className="h-10 w-10 shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {formatDate(selectedDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "PUBLICO" | "PERSONAL" | "FICHAS")}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="PUBLICO">Venta al Publico</TabsTrigger>
          <TabsTrigger value="PERSONAL">Venta a Personal</TabsTrigger>
          <TabsTrigger value="FICHAS">Fichas (Personal)</TabsTrigger>
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

        <TabsContent value="FICHAS" className="mt-4">
          <TokensPOS
            key={`fichas-${selectedDate}`}
            selectedDate={selectedDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const STAFF_PRICES: Record<string, number> = {
  "MEDIA LAGER": 14,
  "MEDIA ROJA": 14,
  "MEDIA AZUL": 14,
  "MEDIA VICTORIA": 17,
  "MEDIA CORONA": 17,
  "MEDIA INDIO": 17,
  "MEGA LAGER": 37,
  "MEGA ROJA": 35,
  "MEGA AZUL": 35,
  "MEGA VICTORIA": 41,
  "MEGA CORONA": 41,
  "MEGA INDIO": 41,
  "CLAMATO (Botella)": 27,
  "COCA 355": 13,
  "PEÑAFIEL 355": 11,
  "TORONJA 355": 20,
  "CIGARRO": 6,
  "CACAHUATE": 13,
  "CACAHUATE SALADO": 13,
  "CACAHUATE ENCHILADO": 13,
  "CACAHUATE AJO": 13,
  "CACAHUATE MIXTO": 13,
  "SEMILLAS": 10,
  "CHICARRON": 11,
  "SOPA": 14,
  "BOOS": 40,
  "CHICLES": 28,
};

function getProductPrice(product: Product, saleType: string): number {
  if (saleType === "PERSONAL") {
    const staffPrice = STAFF_PRICES[product.name];
    if (staffPrice !== undefined) {
      return staffPrice;
    }
    return product.purchasePrice || 0;
  }
  return product.salePrice;
}

// ---------- POS Component (Cuenta/Comanda) ----------
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
    queryFn: () => apiFetch<Product[]>("/api/products?active=true"),
  });

  // Personal
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff", "active"],
    queryFn: () => apiFetch<Staff[]>("/api/staff?active=true"),
    enabled: saleType === "PERSONAL",
  });

  // Tickets/cuentas del dia
  const { data: ticketsData, isLoading: loadingTickets } = useQuery<TicketsResponse>({
    queryKey: ["tickets", selectedDate, saleType],
    queryFn: () => {
      const params = new URLSearchParams({
        date: selectedDate,
        saleType,
      });
      return apiFetch<TicketsResponse>(`/api/sales/tickets?${params.toString()}`);
    },
  });

  // Estado del carrito/cuenta actual
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [deleteTicketTarget, setDeleteTicketTarget] = useState<Ticket | null>(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");

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

  // Totales del carrito
  const cartTotals = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        if (!item.isComplimentary) {
          acc.total += item.quantity * item.unitPrice;
          acc.itemCount += item.quantity;
        } else {
          acc.complimentaryCount += item.quantity;
        }
        return acc;
      },
      { total: 0, itemCount: 0, complimentaryCount: 0 }
    );
  }, [cart]);

  // Agregar al carrito
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: getProductPrice(product, saleType),
          isComplimentary: false,
        },
      ];
    });
  };

  // Cambiar cantidad de una linea del carrito
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const setQuantity = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(0, Math.floor(qty) || 0) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  // Toggle cortesia en una linea
  const toggleComplimentary = (productId: string) => {
    setCart((prev) =>
      prev.map((l) =>
        l.product.id === productId
          ? { ...l, isComplimentary: !l.isComplimentary }
          : l
      )
    );
  };

  // Cambiar precio de una linea
  const updateUnitPrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.product.id === productId
          ? { ...l, unitPrice: Math.max(0, price) }
          : l
      )
    );
  };

  // Quitar linea del carrito
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  // Limpiar carrito
  const clearCart = () => {
    setCart([]);
  };

  // Mutacion: cobrar cuenta (registrar todas las lineas)
  const checkoutMutation = useMutation({
    mutationFn: (paymentMethod: string) => {
      const payload = cart.map((l) => ({
        date: selectedDate,
        productId: l.product.id,
        saleType,
        staffId: saleType === "PERSONAL" ? selectedStaffId : undefined,
        quantity: l.quantity,
        unitPrice: l.isComplimentary ? 0 : l.unitPrice,
        isComplimentary: l.isComplimentary,
        paymentMethod,
      }));
      return apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tickets", selectedDate, saleType],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const total = cartTotals.total;
      const items = cart.length;
      toast.success(`Cuenta cobrada: ${items} producto(s) · ${formatCurrency(total)}`);
      clearCart();
      if (saleType === "PERSONAL") setSelectedStaffId("");
      setCheckoutDialogOpen(false);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Error al cobrar la cuenta";
      toast.error(msg);
    },
  });

  // Mutacion: eliminar cuenta completa
  const deleteTicketMutation = useMutation({
    mutationFn: (ticketId: string) =>
      apiFetch(`/api/sales/tickets/${ticketId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tickets", selectedDate, saleType],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cuenta eliminada");
      setDeleteTicketTarget(null);
    },
    onError: () => toast.error("Error al eliminar la cuenta"),
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto a la cuenta");
      return;
    }
    if (saleType === "PERSONAL" && !selectedStaffId) {
      toast.error("Selecciona el empleado");
      return;
    }
    setSelectedPaymentMethod("EFECTIVO");
    setCheckoutDialogOpen(true);
  };

  const tickets = ticketsData?.tickets || [];
  const summary = ticketsData?.summary;;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* COLUMNA IZQUIERDA: Catalogo de productos (2/5) */}
      <div className="lg:col-span-2">
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-amber-600" />
              Catalogo
            </CardTitle>
            {/* Buscador */}
            <div className="relative mt-2">
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
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[calc(100vh-18rem)] min-h-[400px]">
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
                        {items.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => addToCart(p)}
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:border-amber-200"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.presentation || p.category}
                              </div>
                            </div>
                             <div className="shrink-0 text-right">
                               <div className="font-semibold text-amber-700 dark:text-amber-400">
                                 {formatCurrency(getProductPrice(p, saleType))}
                               </div>
                             </div>
                             <Plus className="h-4 w-4 shrink-0 text-amber-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* COLUMNA DERECHA: Cuenta actual + Cuentas del dia (3/5) */}
      <div className="space-y-5 lg:col-span-3">
        {/* CUENTA ACTUAL (Carrito) */}
        <Card
          className={
            cart.length > 0
              ? "border-amber-500/60 shadow-md"
              : "border-dashed"
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-amber-600" />
                Cuenta Actual
              </CardTitle>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="h-8 text-xs text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Vaciar
                </Button>
              )}
            </div>
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

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Cuenta vacia
                </p>
                <p className="text-xs text-muted-foreground">
                  Toca un producto del catalogo para agregarlo a la cuenta del cliente.
                </p>
              </div>
            ) : (
              <>
                {/* Lista de lineas del carrito */}
                <div className="space-y-2">
                  {cart.map((line) => (
                    <div
                      key={line.product.id}
                      className={`rounded-lg border p-2.5 ${
                        line.isComplimentary
                          ? "border-purple-200 bg-purple-50/50 dark:border-purple-900/40 dark:bg-purple-900/10"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {line.product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {line.isComplimentary ? (
                              <span className="text-purple-600">Cortesia</span>
                            ) : (
                              <span>
                                {formatCurrency(line.unitPrice)} c/u
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(line.product.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                          aria-label="Quitar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/* Controles de cantidad */}
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(line.product.id, -1)}
                            aria-label="Restar"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              setQuantity(
                                line.product.id,
                                parseInt(e.target.value, 10)
                              )
                            }
                            className="h-7 w-14 px-1 text-center text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(line.product.id, 1)}
                            aria-label="Sumar"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Precio (editable si no es cortesia) */}
                        {!line.isComplimentary && (
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateUnitPrice(
                                line.product.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 w-20 px-1 text-right text-xs"
                          />
                        )}

                        {/* Total de la linea */}
                        <div className="min-w-[70px] text-right text-sm font-semibold">
                          {line.isComplimentary ? (
                            <span className="text-purple-600">$0</span>
                          ) : (
                            formatCurrency(line.quantity * line.unitPrice)
                          )}
                        </div>
                      </div>

                      {/* Toggle cortesia */}
                      <div className="mt-2 flex items-center justify-between">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Gift className="h-3 w-3" /> Cortesia
                        </Label>
                        <Switch
                          checked={line.isComplimentary}
                          onCheckedChange={() =>
                            toggleComplimentary(line.product.id)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total del carrito */}
                <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
                  <span className="font-semibold">TOTAL CUENTA</span>
                  <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {formatCurrency(cartTotals.total)}
                  </span>
                </div>

                {/* Boton cobrar */}
                <Button
                  onClick={handleCheckout}
                  disabled={checkoutMutation.isPending}
                  className="h-12 w-full bg-amber-600 text-base font-semibold hover:bg-amber-700"
                >
                  {checkoutMutation.isPending ? (
                    "Cobrando..."
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Cobrar Cuenta · {formatCurrency(cartTotals.total)}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* CUENTAS DEL DIA */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-amber-600" />
                Cuentas Cobradas Hoy
              </CardTitle>
              {summary && summary.ticketCount > 0 && (
                <Badge variant="outline">{summary.ticketCount} cuentas</Badge>
              )}
            </div>
          </CardHeader>

          {/* KPIs del dia */}
          {summary && summary.ticketCount > 0 && (
            <div className="grid grid-cols-3 gap-2 px-6 pb-3">
              <div className="rounded-lg border bg-amber-50 p-2.5 text-center dark:bg-amber-900/20">
                <div className="text-xs text-muted-foreground">Total dia</div>
                <div className="mt-0.5 text-base font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(summary.total)}
                </div>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <div className="text-xs text-muted-foreground">Productos</div>
                <div className="mt-0.5 text-base font-bold">
                  {summary.unitCount}
                </div>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <div className="text-xs text-muted-foreground">Cortesias</div>
                <div className="mt-0.5 text-base font-bold text-purple-600">
                  {summary.complimentaryCount}
                </div>
              </div>
            </div>
          )}

          <CardContent className="p-0">
            {loadingTickets ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Cargando cuentas...
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No hay cuentas cobradas para este dia.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[28rem]">
                <div className="space-y-2 p-3">
                  {tickets.map((ticket, idx) => {
                    const isExpanded = expandedTicket === ticket.ticketId;
                    const ticketNumber = tickets.length - idx;
                    return (
                      <div
                        key={ticket.ticketId}
                        className="overflow-hidden rounded-lg border"
                      >
                        {/* Header del ticket (click para expandir) */}
                        <button
                          onClick={() =>
                            setExpandedTicket(isExpanded ? null : ticket.ticketId)
                          }
                          className="flex w-full items-center justify-between gap-2 bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  Cuenta #{ticketNumber}
                                </span>
                                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                  {ticket.itemCount} item{ticket.itemCount !== 1 ? "s" : ""}
                                </Badge>
                                {ticket.paymentMethod && (
                                  <Badge
                                    variant="outline"
                                    className={[
                                      "h-4 px-1.5 text-[9px] uppercase font-bold",
                                      ticket.paymentMethod === "EFECTIVO"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                                        : ticket.paymentMethod === "TARJETA"
                                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-400"
                                          : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/20 dark:text-purple-400"
                                    ].join(" ")}
                                  >
                                    {ticket.paymentMethod === "EFECTIVO" ? "💵 EFECTIVO" : ticket.paymentMethod === "TARJETA" ? "💳 TARJETA" : "📲 TRANS."}
                                  </Badge>
                                )}
                                {ticket.complimentaryCount > 0 && (
                                  <Badge className="h-4 px-1 text-[10px] bg-purple-500">
                                    <Gift className="mr-0.5 h-2.5 w-2.5" />
                                    {ticket.complimentaryCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(ticket.createdAt).toLocaleTimeString("es-MX", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {ticket.staffName && (
                                  <>
                                    <span>·</span>
                                    <User className="h-3 w-3" />
                                    {ticket.staffName}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              {formatCurrency(ticket.total)}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTicketTarget(ticket);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteTicketTarget(ticket);
                                }
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                              aria-label="Eliminar cuenta"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </button>

                        {/* Detalle del ticket (expandible) */}
                        {isExpanded && (
                          <div className="border-t bg-muted/30">
                            <table className="w-full text-xs">
                              <tbody>
                                {ticket.items.map((item) => (
                                  <tr key={item.id} className="border-b last:border-0">
                                    <td className="px-3 py-1.5 font-medium">
                                      {item.product.name}
                                      {item.isComplimentary && (
                                        <Badge className="ml-1 h-3.5 px-1 text-[9px] bg-purple-500">
                                          <Gift className="mr-0.5 h-2 w-2" />Cortesia
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-center text-muted-foreground">
                                      {item.quantity} ×{" "}
                                      {item.isComplimentary
                                        ? "-"
                                        : formatCurrency(item.unitPrice)}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-semibold">
                                      {item.isComplimentary ? (
                                        <span className="text-purple-600">$0</span>
                                      ) : (
                                        formatCurrency(item.total)
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>

          {/* Total acumulado del dia */}
          {summary && summary.ticketCount > 0 && (
            <div className="border-t bg-amber-50 p-4 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold">TOTAL DEL DIA</span>
                </div>
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(summary.total)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{summary.ticketCount} cuentas cobradas</span>
                <span>
                  {summary.unitCount} unidades · {summary.complimentaryCount} cortesias
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Dialog de cobro con seleccion de metodo de pago */}
      <Dialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Cobrar Cuenta</DialogTitle>
            <DialogDescription>
              Selecciona el metodo de pago para completar la transaccion.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                Total a Cobrar
              </span>
              <span className="text-3xl font-extrabold text-primary tabular-nums">
                {formatCurrency(cartTotals.total)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("EFECTIVO")}
                className={[
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all",
                  selectedPaymentMethod === "EFECTIVO"
                    ? "border-amber-500 bg-amber-50/50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/20 dark:text-amber-300"
                    : "border-border hover:bg-muted/50"
                ].join(" ")}
              >
                <span className="text-2xl">💵</span>
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("TARJETA")}
                className={[
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all",
                  selectedPaymentMethod === "TARJETA"
                    ? "border-amber-500 bg-amber-50/50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/20 dark:text-amber-300"
                    : "border-border hover:bg-muted/50"
                ].join(" ")}
              >
                <span className="text-2xl">💳</span>
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("TRANSFERENCIA")}
                className={[
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all",
                  selectedPaymentMethod === "TRANSFERENCIA"
                    ? "border-amber-500 bg-amber-50/50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/20 dark:text-amber-300"
                    : "border-border hover:bg-muted/50"
                ].join(" ")}
              >
                <span className="text-2xl">📲</span>
                <span>Transf.</span>
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCheckoutDialogOpen(false)}
              disabled={checkoutMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => checkoutMutation.mutate(selectedPaymentMethod)}
              disabled={checkoutMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {checkoutMutation.isPending ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmacion de borrado de cuenta */}
      <AlertDialog
        open={!!deleteTicketTarget}
        onOpenChange={(open) => !open && setDeleteTicketTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              Seguro que deseas eliminar esta cuenta con{" "}
              <strong>
                {deleteTicketTarget?.itemCount} producto(s)
              </strong>{" "}
              por un total de{" "}
              <strong>{formatCurrency(deleteTicketTarget?.total || 0)}</strong>?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTicketTarget &&
                deleteTicketMutation.mutate(deleteTicketTarget.ticketId)
              }
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteTicketMutation.isPending}
            >
              {deleteTicketMutation.isPending ? "Eliminando..." : "Eliminar cuenta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente de Fichas (TokensPOS) para el dia
function TokensPOS({ selectedDate }: { selectedDate: string }) {
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("120");
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");

  // Personal activo
  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["staff", "active"],
    queryFn: () => apiFetch<Staff[]>("/api/staff?active=true"),
  });

  // Productos activos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", "active"],
    queryFn: () => apiFetch<Product[]>("/api/products?active=true"),
  });

  // Fichas del dia
  const { data: tokens = [], isLoading: loadingTokens } = useQuery<TokenSale[]>({
    queryKey: ["tokens", selectedDate],
    queryFn: () =>
      apiFetch<TokenSale[]>(`/api/staff/tokens?date=${encodeURIComponent(selectedDate)}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      date: string;
      staffId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      paymentMethod: string;
    }) =>
      apiFetch<TokenSale>("/api/staff/tokens", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash-closing"] });
      toast.success("Ficha registrada con éxito");
      setQuantity("1");
    },
    onError: (err: ApiError) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/staff/tokens/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cash-closing"] });
      toast.success("Ficha eliminada");
    },
    onError: (err: ApiError) => toast.error(err.message),
  });

  const qty = parseInt(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const totalCalc = qty * price;
  
  // Calculo estimado de comision en frontend segun la regla de negocio
  const commissionCalc = useMemo(() => {
    if (!staffId || qty <= 0) return 0;
    const employee = staffList.find((s) => s.id === staffId);
    if (employee?.tokenCommissionType === "FIXED") {
      return qty * (employee.tokenCommissionValue ?? 60);
    }

    const existingQty = tokens
      .filter((t) => t.staffId === staffId)
      .reduce((sum, t) => sum + t.quantity, 0);

    let totalComm = 0;
    for (let i = 1; i <= qty; i++) {
      const tokenNumber = existingQty + i;
      const staffCut = tokenNumber <= 15 ? 60 : 80;
      totalComm += Math.min(price, staffCut);
    }
    return totalComm;
  }, [tokens, staffList, staffId, qty, price]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) {
      toast.error("Selecciona el miembro del personal");
      return;
    }
    if (!productId) {
      toast.error("Selecciona el tipo de ficha");
      return;
    }
    if (qty <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    createMutation.mutate({
      date: selectedDate,
      staffId,
      productId,
      quantity: qty,
      unitPrice: price,
      paymentMethod,
    });
  };

  // Totales de la tabla
  const totals = useMemo(() => {
    return tokens.reduce(
      (acc, t) => {
        acc.total += t.total;
        acc.commission += t.commission;
        acc.quantity += t.quantity;
        return acc;
      },
      { total: 0, commission: 0, quantity: 0 }
    );
  }, [tokens]);

  const staffTokensSummary = useMemo(() => {
    const summary: { [name: string]: number } = {};
    tokens.forEach((t) => {
      const name = t.staff?.name || "Sin nombre";
      summary[name] = (summary[name] || 0) + t.quantity;
    });
    return Object.entries(summary);
  }, [tokens]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Formulario de registro (2/5) */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-5 w-5 text-amber-600" />
              Registrar Fichas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token-staff">Personal</Label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger id="token-staff" className="h-10 w-full">
                    <SelectValue placeholder="Seleccionar..." />
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

              <div className="space-y-1.5">
                <Label htmlFor="token-product">Tipo de Ficha / Servicio</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger id="token-product" className="h-10 w-full">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.salePrice)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="token-payment">Metodo de Pago</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger id="token-payment" className="h-10 w-full">
                    <SelectValue placeholder="Metodo de pago..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                    <SelectItem value="TARJETA">💳 Tarjeta</SelectItem>
                    <SelectItem value="TRANSFERENCIA">📲 Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="token-qty">Cantidad</Label>
                  <Input
                    id="token-qty"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="token-price">Precio Unitario</Label>
                  <Input
                    id="token-price"
                    type="number"
                    min={0}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="h-10 bg-muted cursor-not-allowed"
                    disabled
                  />
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total Cobrado:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(totalCalc)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comisión Personal (Automática):</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(commissionCalc)}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Registrar Fichas
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Historial y Totales (3/5) */}
      <div className="lg:col-span-3">
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de Fichas</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loadingTokens ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                Cargando fichas...
              </div>
            ) : tokens.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hay fichas registradas para esta fecha.
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-25rem)] min-h-[350px]">
                <div className="p-4 space-y-3">
                  {tokens.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-amber-700 dark:text-amber-400">
                            {t.staff?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t.product?.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={[
                              "text-[8px] px-1 py-0 font-bold",
                              t.paymentMethod === "EFECTIVO"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : t.paymentMethod === "TARJETA"
                                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-400"
                                  : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/20 dark:text-purple-400"
                            ].join(" ")}
                          >
                            {t.paymentMethod === "EFECTIVO" ? "💵 EFECTIVO" : t.paymentMethod === "TARJETA" ? "💳 TARJETA" : "📲 TRANS."}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t.quantity} ficha(s) · unitario: {formatCurrency(t.unitPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-sm">{formatCurrency(t.total)}</div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            comisión: {formatCurrency(t.commission)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(t.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>

          {/* Totales acumulados */}
          {totals.quantity > 0 && (
            <div className="border-t bg-amber-50 p-4 dark:bg-amber-900/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">TOTAL COBRADO</span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(totals.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{totals.quantity} fichas registradas</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Comision total: {formatCurrency(totals.commission)}
                </span>
              </div>

              {/* Desglose por chica */}
              <div className="border-t border-amber-200 dark:border-amber-900/50 pt-2 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Fichas acumuladas hoy:
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {staffTokensSummary.map(([name, qty]) => (
                    <Badge key={name} variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 text-[10px] font-semibold py-0.5 px-2">
                      {name}: <span className="font-extrabold ml-1">{qty}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SalesModule;
