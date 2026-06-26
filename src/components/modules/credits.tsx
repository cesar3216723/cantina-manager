"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Ban,
  Loader2,
  CreditCard,
  Clock,
  CheckCheck,
  Users,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import {
  formatCurrency,
  formatDateInput,
  formatDateShort,
  todayDateInput,
  startOfDay,
  endOfDay,
} from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
interface Credit {
  id: string;
  date: string;
  customerName: string;
  description: string;
  amount: number;
  status: string;
  paidDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

type CreditStatus = "PENDIENTE" | "PAGADO" | "CANCELADO";
type PaymentMethod = "EFECTIVO" | "ELECTRONICO";
type TabKey = "PENDIENTE" | "PAGADO" | "TODOS";

const STATUS_BADGE: Record<string, string> = {
  PENDIENTE:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  PAGADO:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELADO:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  CANCELADO: "Cancelado",
};

// ---------------- Component ----------------
export function CreditsModule() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("PENDIENTE");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Mark as paid state
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Credit | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("EFECTIVO");
  const [payDate, setPayDate] = useState<string>(todayDateInput());

  // Edit/Create form state
  const [formDate, setFormDate] = useState(todayDateInput());
  const [formCustomer, setFormCustomer] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<CreditStatus>("PENDIENTE");
  const [formMethod, setFormMethod] = useState<PaymentMethod>("EFECTIVO");
  const [formPaidDate, setFormPaidDate] = useState<string>("");

  // Fetch all credits for summaries and client-side tab filtering
  const { data, isLoading, isError } = useQuery<Credit[]>({
    queryKey: ["credits", "all"],
    queryFn: () => apiFetch<Credit[]>("/api/credits"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      date: string;
      customerName: string;
      description: string;
      amount: number;
      notes?: string | null;
    }) =>
      apiFetch<Credit>("/api/credits", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Credito registrado");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      handleCloseDialog();
    },
    onError: (e: Error) =>
      toast.error(e.message || "Error al registrar credito"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      date: string;
      customerName: string;
      description: string;
      amount: number;
      status: string;
      paymentMethod: string | null;
      paidDate: string | null;
      notes: string | null;
    }) =>
      apiFetch<Credit>(`/api/credits/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Credito actualizado");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      handleCloseDialog();
    },
    onError: (e: Error) => toast.error(e.message || "Error al actualizar"),
  });

  const markPaidMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      status: string;
      paidDate: string;
      paymentMethod: string;
    }) =>
      apiFetch<Credit>(`/api/credits/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: payload.status,
          paidDate: payload.paidDate,
          paymentMethod: payload.paymentMethod,
        }),
      }),
    onSuccess: () => {
      toast.success("Credito marcado como pagado");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setPayDialogOpen(false);
      setPayTarget(null);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Error al marcar como pagado"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Credit>(`/api/credits/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELADO" }),
      }),
    onSuccess: () => {
      toast.success("Credito cancelado");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setCancelId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Error al cancelar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/credits/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Credito eliminado");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Error al eliminar"),
  });

  // -------- Derived data --------
  const allCredits = data ?? [];

  const totalPendiente = allCredits
    .filter((c) => c.status === "PENDIENTE")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const countPendiente = allCredits.filter(
    (c) => c.status === "PENDIENTE"
  ).length;

  const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const monthEnd = endOfDay(new Date());
  const totalPagadoMes = allCredits
    .filter((c) => {
      if (c.status !== "PAGADO" || !c.paidDate) return false;
      const pd = new Date(c.paidDate);
      return pd >= monthStart && pd <= monthEnd;
    })
    .reduce((s, c) => s + (c.amount || 0), 0);

  const displayedCredits =
    tab === "TODOS" ? allCredits : allCredits.filter((c) => c.status === tab);

  // -------- Handlers --------
  function openCreateDialog() {
    setEditingId(null);
    setFormDate(todayDateInput());
    setFormCustomer("");
    setFormDescription("");
    setFormAmount("");
    setFormNotes("");
    setFormStatus("PENDIENTE");
    setFormMethod("EFECTIVO");
    setFormPaidDate("");
    setDialogOpen(true);
  }

  function openEditDialog(c: Credit) {
    setEditingId(c.id);
    setFormDate(formatDateInput(c.date));
    setFormCustomer(c.customerName);
    setFormDescription(c.description);
    setFormAmount(String(c.amount));
    setFormNotes(c.notes ?? "");
    setFormStatus(
      (["PENDIENTE", "PAGADO", "CANCELADO"].includes(c.status)
        ? c.status
        : "PENDIENTE") as CreditStatus
    );
    setFormMethod(
      (c.paymentMethod as PaymentMethod) === "ELECTRONICO"
        ? "ELECTRONICO"
        : "EFECTIVO"
    );
    setFormPaidDate(c.paidDate ? formatDateInput(c.paidDate) : "");
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingId(null);
  }

  function openPayDialog(c: Credit) {
    setPayTarget(c);
    setPayMethod(
      (c.paymentMethod as PaymentMethod) === "ELECTRONICO"
        ? "ELECTRONICO"
        : "EFECTIVO"
    );
    setPayDate(c.paidDate ? formatDateInput(c.paidDate) : todayDateInput());
    setPayDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (isNaN(amount)) {
      toast.error("Monto invalido");
      return;
    }
    if (!formCustomer.trim()) {
      toast.error("El cliente es obligatorio");
      return;
    }
    if (!formDescription.trim()) {
      toast.error("La descripcion es obligatoria");
      return;
    }

    const notes = formNotes.trim() ? formNotes.trim() : null;
    const paidDate = formPaidDate || null;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        date: formDate,
        customerName: formCustomer.trim(),
        description: formDescription.trim(),
        amount,
        status: formStatus,
        paymentMethod: formStatus === "PAGADO" ? formMethod : null,
        paidDate: formStatus === "PAGADO" ? paidDate : null,
        notes,
      });
    } else {
      createMutation.mutate({
        date: formDate,
        customerName: formCustomer.trim(),
        description: formDescription.trim(),
        amount,
        notes,
      });
    }
  }

  function handleConfirmPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    markPaidMutation.mutate({
      id: payTarget.id,
      status: "PAGADO",
      paidDate: payDate,
      paymentMethod: payMethod,
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ---------------- Render ----------------
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabKey)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-none">
            <TabsTrigger value="PENDIENTE" className="px-3">
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="PAGADO" className="px-3">
              Pagados
            </TabsTrigger>
            <TabsTrigger value="TODOS" className="px-3">
              Todos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          type="button"
          onClick={openCreateDialog}
          className="h-10 bg-amber-600 text-white hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" /> Nuevo Credito
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total pendiente"
          value={formatCurrency(totalPendiente)}
          icon={<Clock className="h-5 w-5" />}
          accent="rose"
        />
        <SummaryCard
          label="Pagado este mes"
          value={formatCurrency(totalPagadoMes)}
          icon={<CheckCheck className="h-5 w-5" />}
          accent="emerald"
        />
        <SummaryCard
          label="Creditos pendientes"
          value={String(countPendiente)}
          icon={<Users className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      {/* Table */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">
            {tab === "TODOS"
              ? "Todos los creditos"
              : tab === "PENDIENTE"
                ? "Creditos pendientes"
                : "Creditos pagados"}
          </h3>
          <span className="text-xs text-muted-foreground">
            {displayedCredits.length} registro
            {displayedCredits.length === 1 ? "" : "s"}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-destructive"
                >
                  Error al cargar los creditos
                </TableCell>
              </TableRow>
            ) : displayedCredits.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No hay creditos en esta vista
                </TableCell>
              </TableRow>
            ) : (
              displayedCredits.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateShort(c.date)}
                  </TableCell>
                  <TableCell className="font-medium">{c.customerName}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {c.description}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(c.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        STATUS_BADGE[c.status] ?? STATUS_BADGE.PENDIENTE
                      }
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.paidDate ? formatDateShort(c.paidDate) : "-"}
                    {c.paymentMethod && c.paidDate ? (
                      <span className="ml-1 text-[10px] uppercase">
                        ({c.paymentMethod})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {c.status === "PENDIENTE" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-emerald-600 hover:text-emerald-700"
                          onClick={() => openPayDialog(c)}
                          aria-label="Marcar como pagado"
                          title="Marcar como pagado"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {c.status === "PENDIENTE" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-amber-600 hover:text-amber-700"
                          onClick={() => setCancelId(c.id)}
                          aria-label="Cancelar credito"
                          title="Cancelar credito"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => openEditDialog(c)}
                        aria-label="Editar credito"
                        title="Editar credito"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(c.id)}
                        aria-label="Eliminar credito"
                        title="Eliminar credito"
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
              {editingId ? "Editar credito" : "Nuevo credito"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Actualiza los datos del credito."
                : "Registra un nuevo credito otorgado a un cliente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cr-date">Fecha</Label>
                <Input
                  id="cr-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cr-amount">Monto</Label>
                <Input
                  id="cr-amount"
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
              <Label htmlFor="cr-customer">Cliente</Label>
              <Input
                id="cr-customer"
                value={formCustomer}
                onChange={(e) => setFormCustomer(e.target.value)}
                placeholder="Nombre del cliente"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cr-desc">Descripcion</Label>
              <Input
                id="cr-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Concepto del credito"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cr-notes">Notas (opcional)</Label>
              <Textarea
                id="cr-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Notas internas"
                className="min-h-16"
              />
            </div>

            {editingId && (
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(v) => setFormStatus(v as CreditStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                      <SelectItem value="PAGADO">Pagado</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formStatus === "PAGADO" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cr-paiddate">Fecha de pago</Label>
                    <Input
                      id="cr-paiddate"
                      type="date"
                      value={formPaidDate}
                      onChange={(e) => setFormPaidDate(e.target.value)}
                    />
                  </div>
                )}
                {formStatus === "PAGADO" && (
                  <div className="space-y-1.5">
                    <Label>Metodo de pago</Label>
                    <Select
                      value={formMethod}
                      onValueChange={(v) => setFormMethod(v as PaymentMethod)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="ELECTRONICO">Electronico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

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

      {/* Mark as paid dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como pagado</DialogTitle>
            <DialogDescription>
              {payTarget
                ? `Confirma el pago del credito de ${payTarget.customerName} por ${formatCurrency(
                    payTarget.amount
                  )}.`
                : "Confirma el pago del credito."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmPay} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Fecha de pago</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Metodo de pago</Label>
                <Select
                  value={payMethod}
                  onValueChange={(v) => setPayMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="ELECTRONICO">Electronico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayDialogOpen(false)}
                disabled={markPaidMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={markPaidMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {markPaidMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <CheckCircle2 className="h-4 w-4" />
                Confirmar pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog
        open={!!cancelId}
        onOpenChange={(o) => !o && setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar credito</AlertDialogTitle>
            <AlertDialogDescription>
              El credito se marcara como CANCELADO. Podras verlo en la pestana
              "Todos".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Cerrar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelId && cancelMutation.mutate(cancelId)}
              disabled={cancelMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {cancelMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Si, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar credito</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El credito se eliminara
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
  accent: "rose" | "emerald" | "amber";
}) {
  const accentClasses: Record<
    typeof accent,
    { bg: string; icon: string }
  > = {
    rose: {
      bg: "border-rose-200 dark:border-rose-900/50",
      icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    },
    emerald: {
      bg: "border-emerald-200 dark:border-emerald-900/50",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    amber: {
      bg: "border-amber-200 dark:border-amber-900/50",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
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

export default CreditsModule;
