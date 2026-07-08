"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet,
  Calculator,
  Lock,
  Unlock,
  Save,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  Banknote,
  CreditCard,
  Receipt,
  Users,
  Coins,
  Scale,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import {
  formatCurrency,
  formatDateInput,
  todayDateInput,
} from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============================================================
// Tipos
// ============================================================
interface CashClosing {
  id: string;
  date: string;
  totalSales: number;
  electronicSales: number;
  cashSales: number;
  initialCash: number;
  initialElectronic: number;
  finalCash: number;
  finalElectronic: number;
  totalExpenses: number;
  cashExpenses: number;
  electronicExpenses: number;
  deliveries: number;
  cashDeliveries: number;
  electronicDeliveries: number;
  auditDifference: number;
  notes: string | null;
  closed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CalcExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod: string;
  category: string;
}

interface CalcStaffPayment {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  salary: number;
  commission: number;
  consumption: number;
  totalToPay: number;
  notes: string | null;
}

interface CalcCredit {
  id: string;
  date: string;
  customerName: string;
  description: string;
  amount: number;
  paidDate: string | null;
  paymentMethod: string | null;
}

interface CalcResult {
  date: string;
  totalSales: number;
  electronicSales: number;
  cashSales: number;
  totalExpenses: number;
  cashExpenses: number;
  electronicExpenses: number;
  staffPayments: number;
  staffSalary: number;
  staffCommission: number;
  staffConsumption: number;
  creditsPaid: number;
  deliveries: number;
  cashDeliveries: number;
  electronicDeliveries: number;
  initialCash: number;
  initialElectronic: number;
  suggestedFinalCash: number;
  suggestedFinalElectronic: number;
  expensesList: CalcExpense[];
  staffPaymentsList: CalcStaffPayment[];
  creditsPaidList: CalcCredit[];
}

// Editable user-input fields only. Derived values (totalSales, expense
// splits, staff payments, credits) are read directly from `calc` for
// display and included in the save payload from there.
interface FormState {
  cashSales: string;
  electronicSales: string;
  initialCash: string;
  initialElectronic: string;
  finalCash: string;
  finalElectronic: string;
  cashDeliveries: string;
  electronicDeliveries: string;
  auditDifference: string;
  notes: string;
  closed: boolean;
}

const EMPTY_FORM: FormState = {
  cashSales: "0",
  electronicSales: "0",
  initialCash: "0",
  initialElectronic: "0",
  finalCash: "0",
  finalElectronic: "0",
  cashDeliveries: "0",
  electronicDeliveries: "0",
  auditDifference: "0",
  notes: "",
  closed: false,
};

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function formFromClosing(c: CashClosing | null | undefined, calc?: CalcResult | null): FormState {
  if (!c) {
    return {
      ...EMPTY_FORM,
      cashSales: String(calc?.cashSales ?? 0),
      electronicSales: String(calc?.electronicSales ?? 0),
    };
  }
  return {
    cashSales: String(c.cashSales ?? calc?.cashSales ?? 0),
    electronicSales: String(c.electronicSales ?? calc?.electronicSales ?? 0),
    initialCash: String(c.initialCash ?? 0),
    initialElectronic: String(c.initialElectronic ?? 0),
    finalCash: String(c.finalCash ?? 0),
    finalElectronic: String(c.finalElectronic ?? 0),
    cashDeliveries: String(c.cashDeliveries ?? 0),
    electronicDeliveries: String(c.electronicDeliveries ?? 0),
    auditDifference: String(c.auditDifference ?? 0),
    notes: c.notes ?? "",
    closed: !!c.closed,
  };
}

// ============================================================
// Componente principal (mantiene selectedDate y remonta el inner)
// ============================================================
export function CashClosingModule() {
  const [selectedDate, setSelectedDate] = useState<string>(todayDateInput());

  return (
    <CashClosingInner
      key={selectedDate}
      date={selectedDate}
      onDateChange={setSelectedDate}
    />
  );
}

function CashClosingInner({
  date,
  onDateChange,
}: {
  date: string;
  onDateChange: (d: string) => void;
}) {
  // Existing closing for this date
  const existingQuery = useQuery<CashClosing | null>({
    queryKey: ["cash-closing", date],
    queryFn: async () => {
      const res = await apiFetch<CashClosing | null>(
        `/api/cash-closing?date=${date}`
      );
      return res ?? null;
    },
  });

  // Calculation for this date (auto-runs on date change)
  const calcQuery = useQuery<CalcResult>({
    queryKey: ["cash-closing-calc", date],
    queryFn: () =>
      apiFetch<CalcResult>("/api/cash-closing/calculate", {
        method: "POST",
        body: JSON.stringify({ date }),
      }),
  });

  const existing = existingQuery.data;
  const calc = calcQuery.data;
  const ready =
    existing !== undefined && calc !== undefined && !existingQuery.isLoading;

  // Toolbar is always rendered so the user can navigate dates while loading.
  // The form below is rendered only when both queries have data.
  return (
    <div className="space-y-4 sm:space-y-6">
      <Toolbar
        date={date}
        onDateChange={onDateChange}
        isClosed={!!existing?.closed}
        onRecalc={() => calcQuery.refetch()}
        isRefetchingCalc={calcQuery.isFetching}
      />

      {!ready ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando corte...
        </div>
      ) : (
        <CashClosingForm
          key={
            date +
            "-" +
            (existing?.id ?? "new") +
            "-" +
            (existing?.updatedAt ?? "") +
            "-" +
            (calc?.cashSales ?? 0) +
            "-" +
            (calc?.electronicSales ?? 0)
          }
          date={date}
          existing={existing ?? null}
          calc={calc as CalcResult}
        />
      )}
    </div>
  );
}

// ============================================================
// Toolbar (date picker, status, Calcular button)
// ============================================================
function Toolbar({
  date,
  onDateChange,
  isClosed,
  onRecalc,
  isRefetchingCalc,
}: {
  date: string;
  onDateChange: (d: string) => void;
  isClosed: boolean;
  onRecalc: () => void;
  isRefetchingCalc: boolean;
}) {
  function handlePrevDay() {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    onDateChange(formatDateInput(d));
  }
  function handleNextDay() {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    onDateChange(formatDateInput(d));
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
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
        <Badge
          variant="outline"
          className={
            isClosed
              ? "border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "border-amber-300 bg-amber-100 px-3 py-1 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/40 dark:text-amber-300"
          }
        >
          {isClosed ? (
            <>
              <Lock className="mr-1 h-3 w-3" />
              Cerrado
            </>
          ) : (
            <>
              <Unlock className="mr-1 h-3 w-3" />
              Abierto
            </>
          )}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onRecalc();
            toast.info("Recalculando valores del dia...");
          }}
          disabled={isRefetchingCalc}
          className="h-10 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/20"
        >
          {isRefetchingCalc ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          Calcular
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Form (editable fields + resumen). Remounts when existing changes.
// ============================================================
function CashClosingForm({
  date,
  existing,
  calc,
}: {
  date: string;
  existing: CashClosing | null;
  calc: CalcResult;
}) {
  const queryClient = useQueryClient();

  // Initialize from existing (or defaults). useState initializer runs once on mount.
  const [form, setForm] = useState<FormState>(() => formFromClosing(existing, calc));

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Save mutation (upsert). Optionally override `closed`.
  const saveMutation = useMutation({
    mutationFn: async (payload: { closedValue?: boolean }) => {
      const closed =
        payload.closedValue !== undefined ? payload.closedValue : form.closed;
      const cashDeliveries = num(form.cashDeliveries);
      const electronicDeliveries = num(form.electronicDeliveries);
      const body = {
        date,
        totalSales: calc.totalSales ?? 0,
        electronicSales: num(form.electronicSales),
        cashSales: num(form.cashSales),
        initialCash: num(form.initialCash),
        initialElectronic: num(form.initialElectronic),
        finalCash: num(form.finalCash),
        finalElectronic: num(form.finalElectronic),
        totalExpenses: calc.totalExpenses ?? 0,
        cashExpenses: calc.cashExpenses ?? 0,
        electronicExpenses: calc.electronicExpenses ?? 0,
        deliveries: cashDeliveries + electronicDeliveries,
        cashDeliveries,
        electronicDeliveries,
        auditDifference: num(form.auditDifference),
        notes: form.notes.trim() || null,
        closed,
      };
      return apiFetch<CashClosing>("/api/cash-closing", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.closedValue === true
          ? "Corte cerrado"
          : vars.closedValue === false
            ? "Corte reabierto"
            : "Corte guardado"
      );
      // Optimistically update local closed flag so the UI transitions
      // immediately before the refetch+remount completes.
      if (vars.closedValue !== undefined) {
        setForm((prev) => ({ ...prev, closed: vars.closedValue as boolean }));
      }
      queryClient.invalidateQueries({ queryKey: ["cash-closing", date] });
      queryClient.invalidateQueries({ queryKey: ["cash-closing"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "Error al guardar el corte"),
  });

  // -------- Derived display values --------
  const cashSales = num(form.cashSales);
  const electronicSales = num(form.electronicSales);
  const totalSales = calc.totalSales ?? 0;
  const initialCash = num(form.initialCash);
  const initialElectronic = num(form.initialElectronic);
  const finalCash = num(form.finalCash);
  const finalElectronic = num(form.finalElectronic);
  const totalExpenses = calc.totalExpenses ?? 0;
  const cashExpenses = calc.cashExpenses ?? 0;
  const electronicExpenses = calc.electronicExpenses ?? 0;
  const cashDeliveries = num(form.cashDeliveries);
  const electronicDeliveries = num(form.electronicDeliveries);
  const deliveries = cashDeliveries + electronicDeliveries;
  const auditDifference = num(form.auditDifference);
  const staffPaymentsTotal = calc.staffPayments ?? 0;
  const creditsPaidTotal = calc.creditsPaid ?? 0;

  const salesSplitDiff = totalSales - (cashSales + electronicSales);
  const salesSplitMismatch = Math.abs(salesSplitDiff) > 0.01;

  const suggestedFinalCash =
    initialCash + cashSales - cashExpenses - cashDeliveries;
  const suggestedFinalElectronic =
    initialElectronic + electronicSales - electronicExpenses - electronicDeliveries;

  const totalIngresos = cashSales + electronicSales;
  const totalEgresos = totalExpenses + staffPaymentsTotal + deliveries;
  const utilidad = totalIngresos - totalEgresos;
  const cajaDiff = finalCash - suggestedFinalCash;

  const isClosed = form.closed;
  const isSaving = saveMutation.isPending;

  // -------- Handlers --------
  function handleSave() {
    saveMutation.mutate({});
  }
  function handleCerrarCorte() {
    saveMutation.mutate({ closedValue: true });
  }
  function handleAbrirCorte() {
    saveMutation.mutate({ closedValue: false });
  }

  // -------- Render --------
  return (
    <>
      {/* Cerrar / Abrir Corte button (top-right of form area) */}
      <div className="flex justify-end">
        {isClosed ? (
          <Button
            type="button"
            onClick={handleAbrirCorte}
            disabled={isSaving}
            className="h-10 bg-amber-600 text-white hover:bg-amber-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
            Abrir Corte
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleCerrarCorte}
            disabled={isSaving}
            className="h-10 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Cerrar Corte
          </Button>
        )}
      </div>

      {/* Cuadro Resumen Estilo Excel de Turno */}
      <Card className="border border-amber-200 shadow-md">
        <CardHeader className="pb-3 bg-amber-50/50 dark:bg-amber-950/10">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-300">
            <Scale className="h-5 w-5" />
            Resumen de Turno (Caja y Ventas)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold text-foreground">CONCEPTO</TableHead>
                  <TableHead className="text-right font-bold text-foreground">TOTAL</TableHead>
                  <TableHead className="text-center font-bold text-foreground">METODO DE PAGO</TableHead>
                  <TableHead className="text-right font-bold text-foreground">SUBTOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Fila: VENTA */}
                <TableRow className="hover:bg-transparent">
                  <TableCell rowSpan={2} className="align-middle font-extrabold text-sm bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-r w-[250px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      VENTA
                    </div>
                  </TableCell>
                  <TableCell rowSpan={2} className="align-middle text-right font-extrabold text-base bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-r tabular-nums">
                    {formatCurrency(totalSales)}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-xs py-2 bg-yellow-400/10 dark:bg-yellow-400/5">
                    ELECTRONICO
                  </TableCell>
                  <TableCell className="text-right font-bold py-2 bg-yellow-400/10 dark:bg-yellow-400/5 tabular-nums text-xs">
                    {formatCurrency(electronicSales)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-center font-semibold text-xs py-2 bg-emerald-500/5">
                    EFECTIVO
                  </TableCell>
                  <TableCell className="text-right font-bold py-2 bg-emerald-500/5 tabular-nums text-xs">
                    {formatCurrency(cashSales)}
                  </TableCell>
                </TableRow>

                {/* Fila: CAJA INICIAL */}
                <TableRow className="hover:bg-transparent border-t-2">
                  <TableCell rowSpan={2} className="align-middle font-extrabold text-sm bg-blue-500/10 text-blue-800 dark:text-blue-300 border-r">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      CAJA INICIAL
                    </div>
                  </TableCell>
                  <TableCell rowSpan={2} className="align-middle text-right font-extrabold text-base bg-blue-500/10 text-blue-800 dark:text-blue-300 border-r tabular-nums">
                    {formatCurrency(initialCash + initialElectronic)}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-xs py-2 bg-blue-500/5">
                    ELECTRONICO
                  </TableCell>
                  <TableCell className="text-right font-bold py-2 bg-blue-500/5 tabular-nums text-xs">
                    {formatCurrency(initialElectronic)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-center font-semibold text-xs py-2 bg-blue-500/5">
                    EFECTIVO
                  </TableCell>
                  <TableCell className="text-right font-bold py-2 bg-blue-500/5 tabular-nums text-xs">
                    {formatCurrency(initialCash)}
                  </TableCell>
                </TableRow>

                {/* Fila: CAJA FINAL */}
                <TableRow className="hover:bg-transparent border-t-2">
                  <TableCell rowSpan={2} className="align-middle font-extrabold text-sm bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-300 border-r">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-fuchsia-500" />
                      CAJA FINAL
                    </div>
                  </TableCell>
                  <TableCell rowSpan={2} className="align-middle text-right font-extrabold text-base bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-300 border-r tabular-nums">
                    {formatCurrency(finalCash + finalElectronic)}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-xs py-2 bg-fuchsia-500/5">
                    ELECTRONICO
                  </TableCell>
                  <TableCell className="text-right font-bold py-2 bg-fuchsia-500/5 tabular-nums text-xs">
                    {formatCurrency(finalElectronic)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-center font-semibold text-xs py-2 bg-fuchsia-500/5">
                    EFECTIVO
                  </TableCell>
                  <TableCell className="text-right font-bold py-2 bg-fuchsia-500/5 tabular-nums text-xs">
                    {formatCurrency(finalCash)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* ============================ */}
        {/* LEFT: Ingresos */}
        {/* ============================ */}
        <div className="space-y-4 lg:space-y-6">
          {/* Venta del Dia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Venta del Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Total ventas (calculado)
                  </span>
                  <span className="text-xl font-bold tabular-nums text-amber-900 dark:text-amber-200">
                    {formatCurrency(totalSales)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyInput
                  id="cash-sales"
                  label="Venta Efectivo"
                  value={form.cashSales}
                  onChange={(v) => updateField("cashSales", v)}
                  disabled={isClosed}
                  icon={<Banknote className="h-4 w-4 text-emerald-600" />}
                />
                <MoneyInput
                  id="electronic-sales"
                  label="Venta Electronico"
                  value={form.electronicSales}
                  onChange={(v) => updateField("electronicSales", v)}
                  disabled={isClosed}
                  icon={<CreditCard className="h-4 w-4 text-orange-600" />}
                />
              </div>
              {salesSplitMismatch && (
                <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>La suma no cuadra</AlertTitle>
                  <AlertDescription className="text-xs">
                    Efectivo + Electronico ={" "}
                    {formatCurrency(cashSales + electronicSales)}. Diferencia
                    con total de ventas:{" "}
                    <strong>{formatCurrency(salesSplitDiff)}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Caja Inicial */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-orange-600" />
                Caja Inicial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyInput
                  id="initial-cash"
                  label="Efectivo"
                  value={form.initialCash}
                  onChange={(v) => updateField("initialCash", v)}
                  disabled={isClosed}
                  icon={<Banknote className="h-4 w-4 text-emerald-600" />}
                />
                <MoneyInput
                  id="initial-electronic"
                  label="Electronico"
                  value={form.initialElectronic}
                  onChange={(v) => updateField("initialElectronic", v)}
                  disabled={isClosed}
                  icon={<CreditCard className="h-4 w-4 text-orange-600" />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Caja Final */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Caja Final
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyInput
                  id="final-cash"
                  label="Efectivo"
                  value={form.finalCash}
                  onChange={(v) => updateField("finalCash", v)}
                  disabled={isClosed}
                  icon={<Banknote className="h-4 w-4 text-emerald-600" />}
                />
                <MoneyInput
                  id="final-electronic"
                  label="Electronico"
                  value={form.finalElectronic}
                  onChange={(v) => updateField("finalElectronic", v)}
                  disabled={isClosed}
                  icon={<CreditCard className="h-4 w-4 text-orange-600" />}
                />
              </div>
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-3 text-xs">
                <div className="mb-1 font-medium text-muted-foreground">
                  Sugerido (Inicial + Venta - Gastos - Entregas)
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Efectivo sugerido
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(suggestedFinalCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Electronico sugerido
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(suggestedFinalElectronic)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entregas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4 text-amber-600" />
                Entregas (al dueno)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyInput
                  id="cash-deliveries"
                  label="Efectivo"
                  value={form.cashDeliveries}
                  onChange={(v) => updateField("cashDeliveries", v)}
                  disabled={isClosed}
                  icon={<Banknote className="h-4 w-4 text-emerald-600" />}
                />
                <MoneyInput
                  id="electronic-deliveries"
                  label="Electronico"
                  value={form.electronicDeliveries}
                  onChange={(v) => updateField("electronicDeliveries", v)}
                  disabled={isClosed}
                  icon={<CreditCard className="h-4 w-4 text-orange-600" />}
                />
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Total entregas</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(deliveries)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Revision / Diferencias */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-4 w-4 text-rose-600" />
                Revision / Diferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MoneyInput
                id="audit-diff"
                label="Diferencia de conteo fisico"
                value={form.auditDifference}
                onChange={(v) => updateField("auditDifference", v)}
                disabled={isClosed}
                allowNegative
                icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
              />
              <div
                className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                  auditDifference === 0
                    ? "border-muted bg-muted/40"
                    : auditDifference > 0
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-300"
                      : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-300"
                }`}
              >
                <span className="font-medium">
                  {auditDifference === 0
                    ? "Sin diferencia"
                    : auditDifference > 0
                      ? "Sobrante"
                      : "Faltante"}
                </span>
                <span className="font-bold tabular-nums">
                  {formatCurrency(Math.abs(auditDifference))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============================ */}
        {/* RIGHT: Egresos y Resumen */}
        {/* ============================ */}
        <div className="space-y-4 lg:space-y-6">
          {/* Gastos del Dia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-rose-600" />
                  Gastos del Dia
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {calc.expensesList.length} registro
                  {calc.expensesList.length === 1 ? "" : "s"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ExpensesTable expenses={calc.expensesList} />
              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                <div className="rounded-md bg-emerald-50 p-2 text-center dark:bg-emerald-900/10">
                  <div className="text-muted-foreground">Efectivo</div>
                  <div className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(cashExpenses)}
                  </div>
                </div>
                <div className="rounded-md bg-orange-50 p-2 text-center dark:bg-orange-900/10">
                  <div className="text-muted-foreground">Electronico</div>
                  <div className="font-bold tabular-nums text-orange-700 dark:text-orange-300">
                    {formatCurrency(electronicExpenses)}
                  </div>
                </div>
                <div className="rounded-md bg-rose-50 p-2 text-center dark:bg-rose-900/10">
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-bold tabular-nums text-rose-700 dark:text-rose-300">
                    {formatCurrency(totalExpenses)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagos a Personal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  Pagos a Personal
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {calc.staffPaymentsList.length} pago
                  {calc.staffPaymentsList.length === 1 ? "" : "s"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StaffPaymentsTable payments={calc.staffPaymentsList} />
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="font-bold tabular-nums">
                  {formatCurrency(staffPaymentsTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Creditos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  Creditos Cobrados Hoy
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {calc.creditsPaidList.length} credito
                  {calc.creditsPaidList.length === 1 ? "" : "s"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CreditsTable credits={calc.creditsPaidList} />
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Total creditos cobrados
                </span>
                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  +{formatCurrency(creditsPaidTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Resumen Final */}
          <Card className="border-2 border-amber-300 dark:border-amber-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-4 w-4 text-amber-600" />
                Resumen Final
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ResumenRow
                label="Total Ingresos"
                value={totalIngresos}
                accent="emerald"
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <ResumenRow
                label="Total Egresos"
                value={-totalEgresos}
                accent="rose"
                icon={<TrendingDown className="h-4 w-4" />}
                sublabel={`Gastos ${formatCurrency(totalExpenses)} + Personal ${formatCurrency(staffPaymentsTotal)} + Entregas ${formatCurrency(deliveries)}`}
              />
              <Separator />
              <ResumenRow
                label="Utilidad del Dia"
                value={utilidad}
                accent={utilidad >= 0 ? "emerald" : "rose"}
                bold
              />
              <Separator />
              <div className="space-y-2 rounded-lg border border-muted bg-muted/30 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Caja Efectivo
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Esperada (inicial + venta - gastos - entregas)
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(suggestedFinalCash)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Real (capturada)
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(finalCash)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span
                    className={
                      Math.abs(cajaDiff) < 0.01
                        ? "font-medium text-emerald-700 dark:text-emerald-300"
                        : cajaDiff > 0
                          ? "font-medium text-emerald-700 dark:text-emerald-300"
                          : "font-medium text-rose-700 dark:text-rose-300"
                    }
                  >
                    {Math.abs(cajaDiff) < 0.01
                      ? "Cuadra"
                      : cajaDiff > 0
                        ? "Sobrante"
                        : "Faltante"}
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      Math.abs(cajaDiff) < 0.01
                        ? ""
                        : cajaDiff > 0
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {formatCurrency(cajaDiff)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes + Save */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas del corte</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Observaciones, aclaraciones, etc."
              rows={2}
              disabled={isClosed}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {isClosed ? (
              <Button
                type="button"
                onClick={handleAbrirCorte}
                disabled={isSaving}
                className="h-11 bg-amber-600 text-white hover:bg-amber-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                Abrir Corte
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-11 bg-amber-600 text-white hover:bg-amber-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Corte
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function MoneyInput({
  id,
  label,
  value,
  onChange,
  disabled,
  icon,
  allowNegative,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  allowNegative?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </span>
        )}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          MXN
        </span>
        <Input
          id={id}
          type="number"
          step="0.01"
          inputMode="decimal"
          min={allowNegative ? undefined : "0"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`h-11 text-right tabular-nums ${icon ? "pl-9" : ""} pr-12`}
        />
      </div>
    </div>
  );
}

function ExpensesTable({ expenses }: { expenses: CalcExpense[] }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
        No hay gastos registrados para este dia
      </div>
    );
  }
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="text-xs">Descripcion</TableHead>
            <TableHead className="text-xs">Metodo</TableHead>
            <TableHead className="text-right text-xs">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="max-w-[160px] truncate py-2 text-sm">
                {e.description}
              </TableCell>
              <TableCell className="py-2">
                <Badge
                  variant="outline"
                  className={
                    e.paymentMethod === "EFECTIVO"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                  }
                >
                  {e.paymentMethod === "EFECTIVO" ? "Efe." : "Elec."}
                </Badge>
              </TableCell>
              <TableCell className="py-2 text-right text-sm font-semibold tabular-nums">
                {formatCurrency(e.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StaffPaymentsTable({
  payments,
}: {
  payments: CalcStaffPayment[];
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
        No hay pagos a personal registrados para este dia
      </div>
    );
  }
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="text-xs">Nombre</TableHead>
            <TableHead className="text-right text-xs">Sueldo</TableHead>
            <TableHead className="text-right text-xs">Comis.</TableHead>
            <TableHead className="text-right text-xs">Consumo</TableHead>
            <TableHead className="text-right text-xs">A Pagar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="py-2 text-sm font-medium">
                {p.staffName}
              </TableCell>
              <TableCell className="py-2 text-right text-xs tabular-nums">
                {formatCurrency(p.salary)}
              </TableCell>
              <TableCell className="py-2 text-right text-xs tabular-nums">
                {formatCurrency(p.commission)}
              </TableCell>
              <TableCell className="py-2 text-right text-xs tabular-nums text-rose-700 dark:text-rose-300">
                -{formatCurrency(p.consumption)}
              </TableCell>
              <TableCell className="py-2 text-right text-sm font-bold tabular-nums">
                {formatCurrency(p.totalToPay)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="sticky bottom-0 bg-card">
          <TableRow>
            <TableCell colSpan={4} className="py-2 text-xs font-medium">
              Total
            </TableCell>
            <TableCell className="py-2 text-right text-sm font-bold tabular-nums">
              {formatCurrency(
                payments.reduce((s, p) => s + (p.totalToPay || 0), 0)
              )}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function CreditsTable({ credits }: { credits: CalcCredit[] }) {
  if (credits.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
        No hay creditos cobrados este dia
      </div>
    );
  }
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="text-xs">Cliente</TableHead>
            <TableHead className="text-xs">Concepto</TableHead>
            <TableHead className="text-xs">Metodo</TableHead>
            <TableHead className="text-right text-xs">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {credits.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="max-w-[120px] truncate py-2 text-sm font-medium">
                {c.customerName}
              </TableCell>
              <TableCell className="max-w-[140px] truncate py-2 text-xs text-muted-foreground">
                {c.description}
              </TableCell>
              <TableCell className="py-2">
                <Badge
                  variant="outline"
                  className={
                    c.paymentMethod === "EFECTIVO"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                  }
                >
                  {c.paymentMethod === "EFECTIVO" ? "Efe." : "Elec."}
                </Badge>
              </TableCell>
              <TableCell className="py-2 text-right text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                +{formatCurrency(c.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ResumenRow({
  label,
  value,
  accent,
  icon,
  sublabel,
  bold,
}: {
  label: string;
  value: number;
  accent: "emerald" | "rose" | "amber";
  icon?: React.ReactNode;
  sublabel?: string;
  bold?: boolean;
}) {
  const colorClass = {
    emerald: "text-emerald-700 dark:text-emerald-300",
    rose: "text-rose-700 dark:text-rose-300",
    amber: "text-amber-700 dark:text-amber-300",
  }[accent];
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </span>
        <span
          className={`tabular-nums ${bold ? "text-lg font-bold" : "font-semibold"} ${colorClass}`}
        >
          {formatCurrency(value)}
        </span>
      </div>
      {sublabel && (
        <div className="mt-0.5 text-right text-xs text-muted-foreground">
          {sublabel}
        </div>
      )}
    </div>
  );
}

export default CashClosingModule;
