"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Receipt,
  Wallet,
  CreditCard,
  Loader2,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import {
  formatCurrency,
  formatDateInput,
  formatDateShort,
  todayDateInput,
} from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// ---------------- Types ----------------
interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

type ExpenseCategory =
  | "SUELDO"
  | "COMISION"
  | "COMPRA"
  | "SERVICIO"
  | "GENERAL";

type PaymentMethod = "EFECTIVO" | "ELECTRONICO";

const CATEGORIES: ExpenseCategory[] = [
  "SUELDO",
  "COMISION",
  "COMPRA",
  "SERVICIO",
  "GENERAL",
];

const CATEGORY_BADGE: Record<string, string> = {
  SUELDO: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  COMISION:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  COMPRA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  SERVICIO:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  GENERAL:
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

const METHOD_BADGE: Record<string, string> = {
  EFECTIVO:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  ELECTRONICO:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

// ---------------- Component ----------------
export function ExpensesModule() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(todayDateInput());
  const [showAllDates, setShowAllDates] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(todayDateInput());
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState<PaymentMethod>("EFECTIVO");
  const [formCategory, setFormCategory] =
    useState<ExpenseCategory>("GENERAL");

  // Build query key/url
  const queryParams = useMemo(() => {
    if (showAllDates) return "";
    return `?date=${selectedDate}`;
  }, [showAllDates, selectedDate]);

  const { data, isLoading, isError } = useQuery<Expense[]>({
    queryKey: ["expenses", queryParams],
    queryFn: () => apiFetch<Expense[]>(`/api/expenses${queryParams}`),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      date: string;
      description: string;
      amount: number;
      paymentMethod: string;
      category: string;
    }) => apiFetch<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      toast.success("Gasto registrado");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      handleCloseDialog();
    },
    onError: (e: Error) => toast.error(e.message || "Error al registrar gasto"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      date: string;
      description: string;
      amount: number;
      paymentMethod: string;
      category: string;
    }) =>
      apiFetch<Expense>(`/api/expenses/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Gasto actualizado");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      handleCloseDialog();
    },
    onError: (e: Error) => toast.error(e.message || "Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/expenses/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Gasto eliminado");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Error al eliminar"),
  });

  // -------- Derived stats --------
  const expenses = data ?? [];
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalEfectivo = expenses
    .filter((e) => e.paymentMethod === "EFECTIVO")
    .reduce((s, e) => s + (e.amount || 0), 0);
  const totalElectronico = expenses
    .filter((e) => e.paymentMethod === "ELECTRONICO")
    .reduce((s, e) => s + (e.amount || 0), 0);

  // -------- Handlers --------
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

  function openCreateDialog() {
    setEditingId(null);
    setFormDate(showAllDates ? todayDateInput() : selectedDate);
    setFormDescription("");
    setFormAmount("");
    setFormMethod("EFECTIVO");
    setFormCategory("GENERAL");
    setDialogOpen(true);
  }

  function openEditDialog(exp: Expense) {
    setEditingId(exp.id);
    setFormDate(formatDateInput(exp.date));
    setFormDescription(exp.description);
    setFormAmount(String(exp.amount));
    setFormMethod(
      (exp.paymentMethod as PaymentMethod) === "ELECTRONICO"
        ? "ELECTRONICO"
        : "EFECTIVO"
    );
    setFormCategory(
      (CATEGORIES.includes(exp.category as ExpenseCategory)
        ? exp.category
        : "GENERAL") as ExpenseCategory
    );
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (isNaN(amount)) {
      toast.error("Monto invalido");
      return;
    }
    if (!formDescription.trim()) {
      toast.error("La descripcion es obligatoria");
      return;
    }

    const payload = {
      date: formDate,
      description: formDescription.trim(),
      amount,
      paymentMethod: formMethod,
      category: formCategory,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ---------------- Render ----------------
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            disabled={showAllDates}
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
              disabled={showAllDates}
              className="h-9 w-[170px] pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            disabled={showAllDates}
            aria-label="Dia siguiente"
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={showAllDates ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllDates((v) => !v)}
            className="h-9"
          >
            <CalendarDays className="mr-1 h-4 w-4" />
            Todas
          </Button>
        </div>

        <Button
          type="button"
          onClick={openCreateDialog}
          className="h-10 bg-amber-600 text-white hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" /> Nuevo Gasto
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label={showAllDates ? "Total general" : "Total del dia"}
          value={formatCurrency(total)}
          icon={<Receipt className="h-5 w-5" />}
          accent="amber"
        />
        <SummaryCard
          label="Efectivo"
          value={formatCurrency(totalEfectivo)}
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
        <SummaryCard
          label="Electronico"
          value={formatCurrency(totalElectronico)}
          icon={<CreditCard className="h-5 w-5" />}
          accent="orange"
        />
      </div>

      {/* Table */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">
            {showAllDates ? "Todos los gastos" : "Gastos del dia"}
          </h3>
          <span className="text-xs text-muted-foreground">
            {expenses.length} registro{expenses.length === 1 ? "" : "s"}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Metodo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-destructive"
                >
                  Error al cargar los gastos
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No hay gastos registrados
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateShort(exp.date)}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate font-medium">
                    {exp.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={CATEGORY_BADGE[exp.category] ?? CATEGORY_BADGE.GENERAL}
                    >
                      {exp.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={METHOD_BADGE[exp.paymentMethod] ?? METHOD_BADGE.EFECTIVO}
                    >
                      {exp.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(exp.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => openEditDialog(exp)}
                        aria-label="Editar gasto"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(exp.id)}
                        aria-label="Eliminar gasto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar gasto" : "Nuevo gasto"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Actualiza los datos del gasto."
                : "Captura los datos del nuevo gasto."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Fecha</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">Monto</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-desc">Descripcion</Label>
              <Input
                id="exp-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ej. Compra de cervezas"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Metodo de pago</Label>
                <Select
                  value={formMethod}
                  onValueChange={(v) => setFormMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="ELECTRONICO">Electronico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={formCategory}
                  onValueChange={(v) => setFormCategory(v as ExpenseCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Categoria" />
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
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Guardar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar gasto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El gasto se eliminara
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------- Sub-components ----------------
function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "amber" | "emerald" | "orange";
}) {
  const accentClasses: Record<
    typeof accent,
    { bg: string; icon: string }
  > = {
    amber: {
      bg: "border-amber-200 dark:border-amber-900/50",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    emerald: {
      bg: "border-emerald-200 dark:border-emerald-900/50",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    orange: {
      bg: "border-orange-200 dark:border-orange-900/50",
      icon: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
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
    </Card>
  );
}

export default ExpensesModule;
