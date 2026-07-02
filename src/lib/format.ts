// Utilidades de formato

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("es-MX").format(num || 0)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function todayDateInput(): string {
  return formatDateInput(new Date())
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function getWeekDays(date: Date): Date[] {
  const days: Date[] = []
  const d = new Date(date)
  const day = d.getDay() // 0=domingo
  const monday = new Date(d)
  // Lunes como inicio
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(d.getDate() + diff)
  for (let i = 0; i < 7; i++) {
    const w = new Date(monday)
    w.setDate(monday.getDate() + i)
    days.push(w)
  }
  return days
}

export const CATEGORY_COLORS: Record<string, string> = {
  CERVEZA: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  BOTANA: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  REFRESCO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  MIX: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  SERVICIO: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  OTROS: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
}

export const PAYMENT_METHODS = ["EFECTIVO", "ELECTRONICO"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export function getLocalDateStringInTimeZone(timeZone: string = "America/Mexico_City"): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  const year = parts.find((p) => p.type === "year")?.value ?? "2026"
  return `${year}-${month}-${day}`
}

export function getLocalDateInTimeZone(timeZone: string = "America/Mexico_City"): Date {
  const ymd = getLocalDateStringInTimeZone(timeZone)
  return new Date(`${ymd}T12:00:00`)
}
