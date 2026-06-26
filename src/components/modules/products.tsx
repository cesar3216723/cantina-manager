"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  PackageX,
  TrendingUp,
  Percent,
  Filter,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatCurrency, CATEGORY_COLORS } from "@/lib/format";

// ============================================================
// Tipos
// ============================================================

type Category =
  | "CERVEZA"
  | "BOTANA"
  | "REFRESCO"
  | "MIX"
  | "SERVICIO"
  | "OTROS";

const CATEGORIES: Category[] = [
  "CERVEZA",
  "BOTANA",
  "REFRESCO",
  "MIX",
  "SERVICIO",
  "OTROS",
];

interface Product {
  id: string;
  name: string;
  category: string;
  presentation: string | null;
  purchasePrice: number;
  salePrice: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormValues {
  name: string;
  category: Category;
  presentation: string;
  purchasePrice: number;
  salePrice: number;
  active: boolean;
  sortOrder: number;
}

const EMPTY_FORM: ProductFormValues = {
  name: "",
  category: "OTROS",
  presentation: "",
  purchasePrice: 0,
  salePrice: 0,
  active: true,
  sortOrder: 0,
};

// ============================================================
// Helpers
// ============================================================

function marginPercent(p: Pick<Product, "purchasePrice" | "salePrice">): number {
  if (p.salePrice <= 0) return 0;
  return ((p.salePrice - p.purchasePrice) / p.salePrice) * 100;
}

function marginColor(pct: number): string {
  if (pct >= 50) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 25) return "text-amber-600 dark:text-amber-400";
  if (pct > 0) return "text-orange-600 dark:text-orange-400";
  return "text-destructive";
}

// ============================================================
// Componente principal
// ============================================================

export function ProductsModule() {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL");

  // Dialog de formulario (alta/edicion)
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ProductFormValues>(EMPTY_FORM);

  // Dialog de confirmacion de borrado
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteName, setDeleteName] = React.useState<string>("");

  // ---------------- Queries ----------------
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/api/products"),
  });

  // ---------------- Mutations ----------------
  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      apiFetch<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto creado correctamente");
      setFormOpen(false);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiError ? err.message : "Error al crear el producto";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) =>
      apiFetch<Product>(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto actualizado correctamente");
      setFormOpen(false);
    },
    onError: (err: Error) => {
      const msg =
        err instanceof ApiError ? err.message : "Error al actualizar el producto";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto eliminado");
      setDeleteId(null);
    },
    onError: (err: Error) => {
      const msg =
        err instanceof ApiError ? err.message : "Error al eliminar el producto";
      toast.error(msg);
    },
  });

  // ---------------- Handlers ----------------
  const filtered = React.useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.presentation ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "ALL" || p.category === categoryFilter;
      const matchesActive =
        activeFilter === "ALL" ||
        (activeFilter === "true" && p.active) ||
        (activeFilter === "false" && !p.active);
      return matchesSearch && matchesCategory && matchesActive;
    });
  }, [products, search, categoryFilter, activeFilter]);

  const totals = React.useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((p) => p.active).length;
    const avgMargin =
      filtered.length > 0
        ? filtered.reduce((acc, p) => acc + marginPercent(p), 0) /
          filtered.length
        : 0;
    return { total, active, avgMargin };
  }, [filtered]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: (CATEGORIES.includes(product.category as Category)
        ? product.category
        : "OTROS") as Category,
      presentation: product.presentation ?? "",
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      active: product.active,
      sortOrder: product.sortOrder,
    });
    setFormOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const payload: ProductFormValues = {
      ...form,
      name: form.name.trim(),
      presentation: form.presentation.trim(),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function openDelete(product: Product) {
    setDeleteId(product.id);
    setDeleteName(product.name);
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  }

  // ---------------- Render ----------------
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Package className="h-5 w-5 text-amber-600" />
            Catalogo de Productos
          </h2>
          <p className="text-sm text-muted-foreground">
            Administra precios, categorias y disponibilidad
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-11 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Resumen rapido */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="gap-0 py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-4 w-4 text-amber-600" />
              Total productos
            </div>
            <p className="mt-1 text-2xl font-bold">{totals.total}</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Activos
            </div>
            <p className="mt-1 text-2xl font-bold">{totals.active}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 gap-0 py-4 sm:col-span-1">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Percent className="h-4 w-4 text-orange-600" />
              Margen promedio
            </div>
            <p className="mt-1 text-2xl font-bold">
              {totals.avgMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="gap-4 py-4">
        <CardContent className="space-y-4 px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o presentacion..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-9"
                aria-label="Buscar productos"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={activeFilter}
                onValueChange={(v) => setActiveFilter(v)}
              >
                <SelectTrigger className="h-11 w-full sm:w-40" aria-label="Filtrar por estado">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  <SelectItem value="true">Solo activos</SelectItem>
                  <SelectItem value="false">Solo inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs de categoria */}
          <div className="flex flex-wrap gap-2">
            <CategoryChip
              label="Todos"
              active={categoryFilter === "ALL"}
              onClick={() => setCategoryFilter("ALL")}
            />
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
                colorClass={CATEGORY_COLORS[cat]}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla / lista */}
      <Card className="gap-0 py-0">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={openCreate} hasProducts={products.length > 0} />
        ) : (
          <>
            {/* Desktop: tabla */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="pl-4">Nombre</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Presentacion</TableHead>
                    <TableHead className="text-right">$ Compra</TableHead>
                    <TableHead className="text-right">$ Venta</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="pr-4 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const mPct = marginPercent(p);
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell className="pl-4 font-medium">
                          {p.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              CATEGORY_COLORS[p.category] ??
                              CATEGORY_COLORS.OTROS
                            }
                            variant="outline"
                          >
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.presentation || "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(p.purchasePrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(p.salePrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-semibold ${marginColor(mPct)}`}>
                              {formatCurrency(p.salePrice - p.purchasePrice)}
                            </span>
                            <span className={`text-xs ${marginColor(mPct)}`}>
                              {mPct.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.active ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => openEdit(p)}
                              aria-label={`Editar ${p.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive"
                              onClick={() => openDelete(p)}
                              aria-label={`Eliminar ${p.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: tarjetas */}
            <div className="block space-y-3 p-3 md:hidden">
              {filtered.map((p) => {
                const mPct = marginPercent(p);
                return (
                  <Card key={p.id} className="gap-3 py-4">
                    <CardContent className="space-y-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{p.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge
                              className={
                                CATEGORY_COLORS[p.category] ??
                                CATEGORY_COLORS.OTROS
                              }
                              variant="outline"
                            >
                              {p.category}
                            </Badge>
                            {p.presentation && (
                              <span className="text-xs text-muted-foreground">
                                {p.presentation}
                              </span>
                            )}
                          </div>
                        </div>
                        {p.active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Compra</p>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(p.purchasePrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Venta</p>
                          <p className="font-medium tabular-nums">
                            {formatCurrency(p.salePrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Margen</p>
                          <p className={`font-semibold ${marginColor(mPct)}`}>
                            {mPct.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 flex-1"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 flex-1 text-destructive hover:text-destructive"
                          onClick={() => openDelete(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Dialog de formulario */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              {editingId ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Actualiza los datos del producto seleccionado."
                : "Captura los datos del nuevo producto para el catalogo."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. MEGA LAGER"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-category">Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as Category })
                  }
                >
                  <SelectTrigger id="p-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-presentation">Presentacion</Label>
                <Input
                  id="p-presentation"
                  value={form.presentation}
                  onChange={(e) =>
                    setForm({ ...form, presentation: e.target.value })
                  }
                  placeholder="MEDIA, MEGA, CUBO..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-purchase">Precio de compra</Label>
                <Input
                  id="p-purchase"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purchasePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-sale">Precio de venta</Label>
                <Input
                  id="p-sale"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.salePrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      salePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Vista previa margen */}
            {form.salePrice > 0 && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Margen estimado</span>
                <span className={`font-semibold ${marginColor(marginPercent(form))}`}>
                  {formatCurrency(form.salePrice - form.purchasePrice)} (
                  {marginPercent(form).toFixed(0)}%)
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="p-sort">Orden</Label>
              <Input
                id="p-sort"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Los productos se ordenan de menor a mayor valor.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="p-active" className="cursor-pointer">
                  Producto activo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Los productos inactivos no aparecen en capturas nuevas.
                </p>
              </div>
              <Switch
                id="p-active"
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm({ ...form, active: checked })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
              >
                {isSubmitting
                  ? "Guardando..."
                  : editingId
                  ? "Guardar cambios"
                  : "Crear producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmacion de borrado */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar producto
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estas a punto de eliminar{" "}
              <span className="font-semibold text-foreground">{deleteName}</span>.
              Esta accion no se puede deshacer. Si el producto tiene ventas,
              inventario o fichas relacionadas no se podra eliminar; en ese caso
              considera desactivarlo en su lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function CategoryChip({
  label,
  active,
  onClick,
  colorClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex h-9 min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? colorClass
            ? `${colorClass} border-transparent`
            : "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function EmptyState({
  onCreate,
  hasProducts,
}: {
  onCreate: () => void;
  hasProducts: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        {hasProducts ? (
          <PackageX className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        ) : (
          <Package className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <div>
        <p className="font-semibold">
          {hasProducts
            ? "No hay productos que coincidan con los filtros"
            : "Aun no tienes productos"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasProducts
            ? "Ajusta la busqueda o los filtros para ver mas resultados."
            : "Empieza creando tu primer producto en el catalogo."}
        </p>
      </div>
      {!hasProducts && (
        <Button
          onClick={onCreate}
          className="h-11 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      )}
    </div>
  );
}
