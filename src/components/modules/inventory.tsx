"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Package,
  Boxes,
  Save,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"

import { apiFetch } from "@/lib/api-client"
import {
  formatCurrency,
  formatDateInput,
  todayDateInput,
  CATEGORY_COLORS,
} from "@/lib/format"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

// ============================================================
// Tipos
// ============================================================
interface Product {
  id: string
  name: string
  category: string
  presentation: string | null
  purchasePrice: number
  salePrice: number
  active: boolean
  sortOrder: number
}

interface InventoryRecord {
  id: string
  date: string
  productId: string
  initialQty: number
  entry: number
  exit: number
  finalQty: number
  physicalCount: number
  difference: number
  observations: string | null
  product?: Product
}

interface Row {
  productId: string
  name: string
  category: string
  presentation: string | null
  purchasePrice: number
  salePrice: number
  inventoryId: string | null
  initialQty: number
  entry: number
  exit: number
  physicalCount: number
  observations: string
}

type EditableField = "initialQty" | "entry" | "exit" | "physicalCount" | "observations"

interface InitResponse {
  success: boolean
  created: number
  skipped: number
  records: InventoryRecord[]
}

interface BatchResponse {
  success: boolean
  count: number
  records: InventoryRecord[]
}

// ============================================================
// Constantes
// ============================================================
const CATEGORY_ORDER = ["CERVEZA", "BOTANA", "REFRESCO", "MIX", "SERVICIO", "OTROS"]

const EMPTY_RECORDS: InventoryRecord[] = []
const EMPTY_PRODUCTS: Product[] = []

function categoryRank(c: string): number {
  const i = CATEGORY_ORDER.indexOf(c)
  return i === -1 ? CATEGORY_ORDER.length : i
}

function differenceTextClass(diff: number): string {
  if (diff === 0) return "text-emerald-700 dark:text-emerald-400"
  if (diff < 0) return "text-rose-700 dark:text-rose-400"
  return "text-amber-700 dark:text-amber-400"
}

function differenceBadgeClass(diff: number): string {
  if (diff === 0) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
  if (diff < 0) return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
}

function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`
  return String(diff)
}

// ============================================================
// Componente principal
// ============================================================
export function InventoryModule() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<string>(todayDateInput())
  const [overrides, setOverrides] = useState<Record<string, Partial<Row>>>({})
  const [dirty, setDirty] = useState(false)

  // Queries
  const inventoryQuery = useQuery<InventoryRecord[]>({
    queryKey: ["inventory", selectedDate],
    queryFn: () =>
      apiFetch<InventoryRecord[]>(`/api/inventory?date=${selectedDate}`),
  })

  const productsQuery = useQuery<Product[]>({
    queryKey: ["products", "active"],
    queryFn: () => apiFetch<Product[]>("/api/products?active=true"),
  })

  const records = inventoryQuery.data ?? EMPTY_RECORDS
  const products = productsQuery.data ?? EMPTY_PRODUCTS

  // Merge server data with local overrides into editable rows
  const rows = useMemo(() => {
    const invMap = new Map<string, InventoryRecord>()
    for (const r of records) invMap.set(r.productId, r)

    const merged: Row[] = products.map((p) => {
      const inv = invMap.get(p.id)
      const base: Row = {
        productId: p.id,
        name: p.name,
        category: p.category,
        presentation: p.presentation,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        inventoryId: inv?.id ?? null,
        initialQty: inv?.initialQty ?? 0,
        entry: inv?.entry ?? 0,
        exit: inv?.exit ?? 0,
        physicalCount: inv?.physicalCount ?? 0,
        observations: inv?.observations ?? "",
      }
      const ov = overrides[p.id]
      return ov ? { ...base, ...ov } : base
    })

    merged.sort((a, b) => {
      const c = categoryRank(a.category) - categoryRank(b.category)
      if (c !== 0) return c
      return a.name.localeCompare(b.name)
    })
    return merged
  }, [records, products, overrides])

  // Init mutation
  const initMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch<InitResponse>("/api/inventory/init", {
        method: "POST",
        body: JSON.stringify({ date }),
      }),
    onSuccess: (data) => {
      toast.success(
        `Inventario inicializado. ${data.created} nuevos, ${data.skipped} ya existian.`
      )
      setOverrides({})
      setDirty(false)
      queryClient.invalidateQueries({ queryKey: ["inventory", selectedDate] })
    },
    onError: (e: Error) =>
      toast.error(e.message || "Error al inicializar inventario"),
  })

  // Batch save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: {
      date: string
      items: {
        productId: string
        initialQty: number
        entry: number
        exit: number
        physicalCount: number
        observations: string
      }[]
    }) =>
      apiFetch<BatchResponse>("/api/inventory/batch", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      toast.success(`${data.count} registros guardados`)
      setOverrides({})
      setDirty(false)
      queryClient.invalidateQueries({ queryKey: ["inventory", selectedDate] })
    },
    onError: (e: Error) =>
      toast.error(e.message || "Error al guardar inventario"),
  })

  // Update a single field of a row
  function updateField(productId: string, field: EditableField, value: string) {
    setOverrides((prev) => {
      const current = prev[productId] ?? {}
      let nextVal: number | string
      if (field === "observations") {
        nextVal = value
      } else {
        const n = parseInt(value, 10)
        nextVal = isNaN(n) ? 0 : n
      }
      return {
        ...prev,
        [productId]: { ...current, [field]: nextVal },
      }
    })
    setDirty(true)
  }

  // Day navigation
  function handlePrevDay() {
    const d = new Date(selectedDate + "T12:00:00")
    d.setDate(d.getDate() - 1)
    handleDateChange(formatDateInput(d))
  }

  function handleNextDay() {
    const d = new Date(selectedDate + "T12:00:00")
    d.setDate(d.getDate() + 1)
    handleDateChange(formatDateInput(d))
  }

  function handleDateChange(dateStr: string) {
    if (dateStr === selectedDate) return
    setSelectedDate(dateStr)
    setOverrides({})
    setDirty(false)
  }

  function handleSave() {
    saveMutation.mutate({
      date: selectedDate,
      items: rows.map((r) => ({
        productId: r.productId,
        initialQty: r.initialQty,
        entry: r.entry,
        exit: r.exit,
        physicalCount: r.physicalCount,
        observations: r.observations,
      })),
    })
  }

  // Group rows by category
  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const r of rows) {
      const arr = map.get(r.category) ?? []
      arr.push(r)
      map.set(r.category, arr)
    }
    return Array.from(map.entries()).sort(
      (a, b) => categoryRank(a[0]) - categoryRank(b[0])
    )
  }, [rows])

  // Summary cards
  const summary = useMemo(() => {
    let totalProducts = rows.length
    let inventoryValue = 0
    let totalDifference = 0
    let differenceValue = 0
    for (const r of rows) {
      const finalQty = r.initialQty + r.entry - r.exit
      inventoryValue += finalQty * r.purchasePrice
      const diff = r.physicalCount - finalQty
      totalDifference += diff
      differenceValue += diff * r.purchasePrice
    }
    return { totalProducts, inventoryValue, totalDifference, differenceValue }
  }, [rows])

  // Footer totals
  const totals = useMemo(() => {
    let initial = 0
    let entry = 0
    let exit = 0
    let final = 0
    let buyTotal = 0
    let saleTotal = 0
    let diff = 0
    for (const r of rows) {
      initial += r.initialQty
      entry += r.entry
      exit += r.exit
      const f = r.initialQty + r.entry - r.exit
      final += f
      buyTotal += f * r.purchasePrice
      saleTotal += f * r.salePrice
      diff += r.physicalCount - f
    }
    return { initial, entry, exit, final, buyTotal, saleTotal, diff }
  }, [rows])

  const isLoading = inventoryQuery.isPending || productsQuery.isPending
  const isError = inventoryQuery.isError || productsQuery.isError

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
            className="h-9 w-9"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative flex items-center">
            <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-9 w-[170px] pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            className="h-9 w-9"
            aria-label="Dia siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => initMutation.mutate(selectedDate)}
            disabled={initMutation.isPending}
            className="h-10"
          >
            {initMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Inicializar Inventario
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending || !dirty}
            className="h-10 bg-amber-600 text-white hover:bg-amber-700"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Productos"
          value={String(summary.totalProducts)}
          icon={<Boxes className="h-5 w-5" />}
          accent="amber"
        />
        <SummaryCard
          label="Valor Inventario"
          value={formatCurrency(summary.inventoryValue)}
          icon={<Package className="h-5 w-5" />}
          accent="emerald"
        />
        <SummaryCard
          label="Diferencias Totales"
          value={formatDiff(summary.totalDifference)}
          icon={
            summary.totalDifference < 0 ? (
              <TrendingDown className="h-5 w-5" />
            ) : summary.totalDifference > 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )
          }
          accent={
            summary.totalDifference < 0
              ? "rose"
              : summary.totalDifference > 0
              ? "amber"
              : "emerald"
          }
        />
        <SummaryCard
          label="Valor Diferencia"
          value={formatCurrency(summary.differenceValue)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={summary.differenceValue < 0 ? "rose" : "amber"}
        />
      </div>

      {/* Main table */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">
            Inventario del {formatDateShortSafe(selectedDate)}
          </h3>
          <span className="text-xs text-muted-foreground">
            {rows.length} producto{rows.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Producto</TableHead>
                <TableHead className="text-right">$ Compra</TableHead>
                <TableHead className="text-right">$ Venta</TableHead>
                <TableHead className="text-right">Inicial</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Salida</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  $ Compra Total
                </TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  $ Venta Total
                </TableHead>
                <TableHead className="text-right">Conteo Fisico</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="min-w-[160px]">Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={12} className="py-2">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="py-10 text-center text-sm text-destructive"
                  >
                    Error al cargar el inventario. Intenta de nuevo.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay productos activos. Agrega productos en el catalogo o
                    usa &quot;Inicializar Inventario&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map(([cat, catRows]) => (
                  <CategoryGroup
                    key={cat}
                    category={cat}
                    rows={catRows}
                    updateField={updateField}
                  />
                ))
              )}
            </TableBody>
            {!isLoading && !isError && rows.length > 0 && (
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>
                    Totales ({rows.length} productos)
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.initial}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.entry}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.exit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.final}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {formatCurrency(totals.buyTotal)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {formatCurrency(totals.saleTotal)}
                  </TableCell>
                  <TableCell className="text-right" />
                  <TableCell
                    className={`text-right tabular-nums font-bold ${differenceTextClass(totals.diff)}`}
                  >
                    {formatDiff(totals.diff)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        {/* Hint: dirty indicator */}
        {dirty && (
          <div className="border-t bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Tienes cambios sin guardar. Presiona &quot;Guardar&quot; para
            conservarlos.
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================================================
// Sub-componentes
// ============================================================
function CategoryGroup({
  category,
  rows,
  updateField,
}: {
  category: string
  rows: Row[]
  updateField: (productId: string, field: EditableField, value: string) => void
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={12} className="py-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTROS
              }
            >
              {category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {rows.length} producto{rows.length === 1 ? "" : "s"}
            </span>
          </div>
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <InventoryRow
          key={r.productId}
          row={r}
          updateField={updateField}
        />
      ))}
    </>
  )
}

function InventoryRow({
  row,
  updateField,
}: {
  row: Row
  updateField: (productId: string, field: EditableField, value: string) => void
}) {
  const finalQty = row.initialQty + row.entry - row.exit
  const difference = row.physicalCount - finalQty

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium leading-tight">{row.name}</div>
        {row.presentation && (
          <div className="text-xs text-muted-foreground">
            {row.presentation}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
        {formatCurrency(row.purchasePrice)}
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
        {formatCurrency(row.salePrice)}
      </TableCell>
      <TableCell className="p-1">
        <NumberInput
          value={row.initialQty}
          onChange={(v) => updateField(row.productId, "initialQty", v)}
          ariaLabel={`Cantidad inicial de ${row.name}`}
        />
      </TableCell>
      <TableCell className="p-1">
        <NumberInput
          value={row.entry}
          onChange={(v) => updateField(row.productId, "entry", v)}
          ariaLabel={`Entrada de ${row.name}`}
          accent="emerald"
        />
      </TableCell>
      <TableCell className="p-1">
        <NumberInput
          value={row.exit}
          onChange={(v) => updateField(row.productId, "exit", v)}
          ariaLabel={`Salida de ${row.name}`}
          accent="rose"
        />
      </TableCell>
      <TableCell className="bg-amber-50/60 text-right font-bold tabular-nums dark:bg-amber-900/20">
        {finalQty}
      </TableCell>
      <TableCell className="hidden text-right text-xs tabular-nums text-muted-foreground lg:table-cell">
        {formatCurrency(finalQty * row.purchasePrice)}
      </TableCell>
      <TableCell className="hidden text-right text-xs tabular-nums text-muted-foreground lg:table-cell">
        {formatCurrency(finalQty * row.salePrice)}
      </TableCell>
      <TableCell className="p-1">
        <NumberInput
          value={row.physicalCount}
          onChange={(v) => updateField(row.productId, "physicalCount", v)}
          ariaLabel={`Conteo fisico de ${row.name}`}
        />
      </TableCell>
      <TableCell className="text-right">
        <span
          className={`inline-flex min-w-[44px] justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${differenceBadgeClass(
            difference
          )}`}
        >
          {formatDiff(difference)}
        </span>
      </TableCell>
      <TableCell className="p-1">
        <Input
          type="text"
          value={row.observations}
          onChange={(e) =>
            updateField(row.productId, "observations", e.target.value)
          }
          placeholder="-"
          aria-label={`Observaciones de ${row.name}`}
          className="h-9 min-w-[120px]"
        />
      </TableCell>
    </TableRow>
  )
}

function NumberInput({
  value,
  onChange,
  ariaLabel,
  accent,
}: {
  value: number
  onChange: (v: string) => void
  ariaLabel: string
  accent?: "emerald" | "rose"
}) {
  const accentClass =
    accent === "emerald"
      ? "focus-visible:ring-emerald-500/30"
      : accent === "rose"
      ? "focus-visible:ring-rose-500/30"
      : ""
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`h-9 w-[72px] text-right tabular-nums ${accentClass}`}
    />
  )
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: "amber" | "emerald" | "orange" | "rose"
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
    rose: {
      bg: "border-rose-200 dark:border-rose-900/50",
      icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    },
  }
  const a = accentClasses[accent]
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
  )
}

// Pequeno helper para mostrar la fecha del encabezado sin dependencia extra
function formatDateShortSafe(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00")
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default InventoryModule
