"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Users,
  Wallet,
  Coins,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  formatCurrency,
  todayDateInput,
} from "@/lib/format"
import { apiFetch, ApiError } from "@/lib/api-client"

// ============================================================
// Tipos
// ============================================================
interface Staff {
  id: string
  name: string
  salary: number
  active: boolean
  sortOrder: number
}

interface Product {
  id: string
  name: string
  category: string
  presentation: string | null
  salePrice: number
}

interface TokenSale {
  id: string
  date: string
  staffId: string
  productId: string
  quantity: number
  unitPrice: number
  total: number
  commission: number
  staff?: Staff
  product?: Product
}

interface StaffPayment {
  id: string
  date: string
  staffId: string
  salary: number
  commission: number
  consumption: number
  totalToPay: number
  notes: string | null
  staff?: Staff
}

interface Sale {
  id: string
  date: string
  productId: string
  saleType: string
  staffId: string | null
  quantity: number
  unitPrice: number
  total: number
  isComplimentary: boolean
}

// ============================================================
// Componente principal
// ============================================================
export function StaffModule() {
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-auto sm:w-auto sm:inline-grid">
        <TabsTrigger value="personal" className="py-2">
          <Users className="size-4" />
          Personal
        </TabsTrigger>
        <TabsTrigger value="pagos" className="py-2">
          <Wallet className="size-4" />
          Pagos y Fichas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <PersonalTab />
      </TabsContent>
      <TabsContent value="pagos">
        <PaymentsTab />
      </TabsContent>
    </Tabs>
  )
}

// ============================================================
// Tab 1: Personal (CRUD)
// ============================================================
function PersonalTab() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [deleteId, setDeleteId] = useState<Staff | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: () => apiFetch<Staff[]>("/api/staff"),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; salary: number; active: boolean; sortOrder: number }) =>
      apiFetch<Staff>("/api/staff", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      toast.success("Personal creado correctamente")
      setDialogOpen(false)
    },
    onError: (err: ApiError) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name: string; salary: number; active: boolean; sortOrder: number }
    }) =>
      apiFetch<Staff>(`/api/staff/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      toast.success("Personal actualizado correctamente")
      setDialogOpen(false)
    },
    onError: (err: ApiError) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/staff/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      toast.success("Personal eliminado")
      setDeleteOpen(false)
    },
    onError: (err: ApiError) => {
      toast.error(err.message)
      setDeleteOpen(false)
    },
  })

  const handleNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (s: Staff) => {
    setEditing(s)
    setDialogOpen(true)
  }

  const handleDelete = (s: Staff) => {
    setDeleteId(s)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (deleteId) deleteMutation.mutate(deleteId.id)
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-amber-700 dark:text-amber-400">
            Personal de la Cantina
          </CardTitle>
          <CardDescription>
            Administra empleados, sueldos diarios y estado.
          </CardDescription>
        </div>
        <Button
          onClick={handleNew}
          className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
        >
          <Plus className="size-4" /> Nuevo
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Cargando...
          </div>
        ) : staff.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No hay personal registrado. Haz clic en &quot;Nuevo&quot; para
            agregar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Sueldo diario</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(s.salary)}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" /> Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="size-3" /> Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            aria-label="Acciones"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(s)}>
                            <Pencil className="size-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 className="size-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <StaffFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={(data) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar personal</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && (
                <>
                  Seguro que deseas eliminar a{" "}
                  <strong>{deleteId.name}</strong>? Esta accion no se puede
                  deshacer. Si tiene registros asociados, no se podra eliminar
                  (te sugerimos desactivarlo).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================
// Dialogo de formulario (crear / editar)
// ============================================================
function StaffFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Staff | null
  onSubmit: (data: {
    name: string
    salary: number
    active: boolean
    sortOrder: number
  }) => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar personal" : "Nuevo personal"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualiza los datos del miembro del personal."
              : "Captura los datos del nuevo miembro del personal."}
          </DialogDescription>
        </DialogHeader>
        <StaffForm
          key={editing?.id ?? "new"}
          editing={editing}
          onSubmit={onSubmit}
          loading={loading}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function StaffForm({
  editing,
  onSubmit,
  loading,
  onCancel,
}: {
  editing: Staff | null
  onSubmit: (data: {
    name: string
    salary: number
    active: boolean
    sortOrder: number
  }) => void
  loading: boolean
  onCancel: () => void
}) {
  const [name, setName] = useState(editing?.name ?? "")
  const [salary, setSalary] = useState(
    editing ? String(editing.salary) : ""
  )
  const [active, setActive] = useState(editing ? editing.active : true)
  const [sortOrder, setSortOrder] = useState(
    editing ? String(editing.sortOrder) : "0"
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    onSubmit({
      name: name.trim(),
      salary: parseFloat(salary) || 0,
      active,
      sortOrder: parseInt(sortOrder) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. ELOY"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="salary">Sueldo diario (MXN)</Label>
        <Input
          id="salary"
          type="number"
          min={0}
          step="0.01"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sortOrder">Orden</Label>
        <Input
          id="sortOrder"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="0"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="active">Activo</Label>
          <p className="text-xs text-muted-foreground">
            El personal inactivo no aparece en pagos ni fichas.
          </p>
        </div>
        <Switch
          id="active"
          checked={active}
          onCheckedChange={setActive}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Guardar cambios" : "Crear"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ============================================================
// Tab 2: Pagos y Fichas
// ============================================================
function PaymentsTab() {
  const [date, setDate] = useState<string>(todayDateInput())

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["staff", "active"],
    queryFn: () => apiFetch<Staff[]>("/api/staff?active=true"),
  })
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", "active"],
    queryFn: () => apiFetch<Product[]>("/api/products?active=true"),
  })

  const queryClient = useQueryClient()

  const tokensQ = useQuery<TokenSale[]>({
    queryKey: ["tokens", date],
    queryFn: () =>
      apiFetch<TokenSale[]>(`/api/staff/tokens?date=${encodeURIComponent(date)}`),
    enabled: !!date,
  })

  const paymentsQ = useQuery<StaffPayment[]>({
    queryKey: ["staff-payments", date],
    queryFn: () =>
      apiFetch<StaffPayment[]>(
        `/api/staff/payments?date=${encodeURIComponent(date)}`
      ),
    enabled: !!date,
  })

  const personalSalesQ = useQuery<Sale[]>({
    queryKey: ["personal-sales", date],
    queryFn: () =>
      apiFetch<Sale[]>(
        `/api/sales?saleType=PERSONAL&date=${encodeURIComponent(date)}`
      ).catch(() => [] as Sale[]),
    enabled: !!date,
  })

  // Refresca al cambiar de tab (refetchOnWindowFocus deshabilitado por defecto)
  // se revalida al guardar
  const invalidateDay = () => {
    queryClient.invalidateQueries({ queryKey: ["tokens", date] })
    queryClient.invalidateQueries({ queryKey: ["staff-payments", date] })
    queryClient.invalidateQueries({ queryKey: ["personal-sales", date] })
  }

  return (
    <div className="space-y-6">
      {/* Selector de fecha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <CalendarDays className="size-5" /> Dia de operacion
          </CardTitle>
          <CardDescription>
            Captura fichas y registra pagos del personal para la fecha
            seleccionada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label htmlFor="date" className="sm:w-24">
              Fecha
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayDateInput())}
              className="sm:max-w-[220px]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(todayDateInput())}
              className="sm:ml-auto"
            >
              Hoy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Venta de Fichas */}
      <TokenSalesSection
        date={date}
        staff={staff}
        products={products}
        tokens={tokensQ.data ?? []}
        isLoading={tokensQ.isLoading}
        onChanged={invalidateDay}
      />

      {/* Pago de Personal */}
      <StaffPaymentsSection
        date={date}
        staff={staff}
        tokenSales={tokensQ.data ?? []}
        personalSales={personalSalesQ.data ?? []}
        existingPayments={paymentsQ.data ?? []}
        onChanged={invalidateDay}
      />
    </div>
  )
}

// ============================================================
// Seccion: Venta de Fichas
// ============================================================
function TokenSalesSection({
  date,
  staff,
  products,
  tokens,
  isLoading,
  onChanged,
}: {
  date: string
  staff: Staff[]
  products: Product[]
  tokens: TokenSale[]
  isLoading: boolean
  onChanged: () => void
}) {
  const queryClient = useQueryClient()
  const [staffId, setStaffId] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unitPrice, setUnitPrice] = useState("60")

  const createMutation = useMutation({
    mutationFn: (data: {
      date: string
      staffId: string
      productId: string
      quantity: number
      unitPrice: number
      paymentMethod: string
    }) =>
      apiFetch<TokenSale>("/api/staff/tokens", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens", date] })
      toast.success("Ficha registrada")
      setQuantity("1")
      onChanged()
    },
    onError: (err: ApiError) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/staff/tokens/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens", date] })
      toast.success("Ficha eliminada")
      onChanged()
    },
    onError: (err: ApiError) => toast.error(err.message),
  })

  const qty = parseInt(quantity) || 0
  const price = parseFloat(unitPrice) || 0
  const totalCalc = qty * price

  // Calculo estimado de comision en frontend segun la regla de negocio
  const commissionCalc = useMemo(() => {
    if (!staffId || qty <= 0) return 0
    const existingQty = tokens
      .filter((t) => t.staffId === staffId)
      .reduce((sum, t) => sum + t.quantity, 0)

    let totalComm = 0
    for (let i = 1; i <= qty; i++) {
      const tokenNumber = existingQty + i
      const businessCut = tokenNumber <= 15 ? 60 : 40
      totalComm += Math.max(0, price - businessCut)
    }
    return totalComm
  }, [tokens, staffId, qty, price])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffId) {
      toast.error("Selecciona el personal")
      return
    }
    if (!productId) {
      toast.error("Selecciona un producto")
      return
    }
    if (qty <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }
    createMutation.mutate({
      date,
      staffId,
      productId,
      quantity: qty,
      unitPrice: price,
      paymentMethod: "EFECTIVO",
    })
  }

  // Totales
  const totals = useMemo(() => {
    return tokens.reduce(
      (acc, t) => {
        acc.total += t.total
        acc.commission += t.commission
        acc.quantity += t.quantity
        return acc
      },
      { total: 0, commission: 0, quantity: 0 }
    )
  }, [tokens])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Coins className="size-5" /> Venta de Fichas
        </CardTitle>
        <CardDescription>
          Registra las fichas (tokens) vendidas por cada miembro del personal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="space-y-1">
            <Label className="text-xs">Personal</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Producto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Precio ficha</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="h-10 w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Agregar
            </Button>
          </div>
        </form>

        {/* Resumen rapido del calculo */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Total calculado:{" "}
            <strong className="text-foreground">
              {formatCurrency(totalCalc)}
            </strong>
          </span>
          <span>
            Comision (Automatica):{" "}
            <strong className="text-foreground">
              {formatCurrency(commissionCalc)}
            </strong>
          </span>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Cargando fichas...
          </div>
        ) : tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay fichas registradas para esta fecha.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personal</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Comision</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.staff?.name ?? "—"}
                    </TableCell>
                    <TableCell>{t.product?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(t.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(t.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(t.commission)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(t.id)}
                        aria-label="Eliminar ficha"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    Totales
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {totals.quantity}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatCurrency(totals.total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totals.commission)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Seccion: Pago de Personal
// ============================================================
function StaffPaymentsSection({
  date,
  staff,
  tokenSales,
  personalSales,
  existingPayments,
  onChanged,
}: {
  date: string
  staff: Staff[]
  tokenSales: TokenSale[]
  personalSales: Sale[]
  existingPayments: StaffPayment[]
  onChanged: () => void
}) {
  const queryClient = useQueryClient()

  // Calcula por empleado: sueldo, comision (fichas), consumo (ventas personales), total
  const rows = useMemo(() => {
    return staff.map((s) => {
      const commission = tokenSales
        .filter((t) => t.staffId === s.id)
        .reduce((sum, t) => sum + t.commission, 0)
      const consumption = personalSales
        .filter((sale) => sale.staffId === s.id)
        .reduce((sum, sale) => sum + sale.total, 0)
      const salary = s.salary
      const totalToPay = salary + commission - consumption
      const alreadyPaid = existingPayments.some((p) => p.staffId === s.id)
      return {
        staff: s,
        salary,
        commission,
        consumption,
        totalToPay,
        alreadyPaid,
      }
    })
  }, [staff, tokenSales, personalSales, existingPayments])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.salary += r.salary
        acc.commission += r.commission
        acc.consumption += r.consumption
        acc.totalToPay += r.totalToPay
        return acc
      },
      { salary: 0, commission: 0, consumption: 0, totalToPay: 0 }
    )
  }, [rows])

  const createPaymentMutation = useMutation({
    mutationFn: (data: {
      date: string
      staffId: string
      salary: number
      commission: number
      consumption: number
      totalToPay: number
    }) =>
      apiFetch<StaffPayment>("/api/staff/payments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-payments", date] })
      toast.success("Pago registrado")
      onChanged()
    },
    onError: (err: ApiError) => toast.error(err.message),
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Wallet className="size-5" /> Pago de Personal
        </CardTitle>
        <CardDescription>
          Sueldo + comision (fichas) - consumo (ventas personales). Registra el
          pago del dia con el boton &quot;Registrar Pago&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay personal activo. Agrega personal en la pestana &quot;Personal&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personal</TableHead>
                  <TableHead className="text-right">Sueldo</TableHead>
                  <TableHead className="text-right">Comision</TableHead>
                  <TableHead className="text-right">Consumo</TableHead>
                  <TableHead className="text-right">A Pagar</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.staff.id}>
                    <TableCell className="font-medium">{r.staff.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(r.salary)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(r.commission)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-orange-600 dark:text-orange-400">
                      {formatCurrency(r.consumption)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {formatCurrency(r.totalToPay)}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.alreadyPaid ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" /> Pagado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={
                          r.alreadyPaid || createPaymentMutation.isPending
                        }
                        onClick={() =>
                          createPaymentMutation.mutate({
                            date,
                            staffId: r.staff.id,
                            salary: r.salary,
                            commission: r.commission,
                            consumption: r.consumption,
                            totalToPay: r.totalToPay,
                          })
                        }
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {createPaymentMutation.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Wallet className="size-4" />
                        )}
                        Registrar Pago
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Totales</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatCurrency(totals.salary)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totals.commission)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                    {formatCurrency(totals.consumption)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {formatCurrency(totals.totalToPay)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
