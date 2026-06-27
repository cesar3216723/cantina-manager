"use client";

import { useState, useMemo } from "react";
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
  User,
  CheckCircle2,
  Clock,
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
              Fecha
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
    const total = cart.reduce(
      (sum, l) => sum + (l.isComplimentary ? 0 : l.quantity * l.unitPrice),
      0
    );
    const units = cart.reduce((sum, l) => sum + l.quantity, 0);
    const complimentary = cart.filter((l) => l.isComplimentary).length;
    return { total, units, complimentary };
  }, [cart]);

  // Agregar producto al carrito
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id && !l.isComplimentary);
      if (existing) {
        // Si ya existe (no cortesia), sumar 1
        return prev.map((l) =>
          l.product.id === product.id && !l.isComplimentary
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.salePrice,
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
    mutationFn: () => {
      const payload = cart.map((l) => ({
        date: selectedDate,
        productId: l.product.id,
        saleType,
        staffId: saleType === "PERSONAL" ? selectedStaffId : undefined,
        quantity: l.quantity,
        unitPrice: l.isComplimentary ? 0 : l.unitPrice,
        isComplimentary: l.isComplimentary,
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
    checkoutMutation.mutate();
  };

  const tickets = ticketsData?.tickets || [];
  const summary = ticketsData?.summary;

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
                                {formatCurrency(p.salePrice)}
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

export default SalesModule;
