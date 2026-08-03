"use client"

import { useState, useMemo } from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Receipt,
  CreditCard,
  Wallet,
  BarChart3,
  Beer,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ViewKey =
  | "dashboard"
  | "sales"
  | "inventory"
  | "products"
  | "staff"
  | "expenses"
  | "credits"
  | "cash-closing"
  | "reports"

export interface NavItem {
  key: ViewKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Resumen general" },
  { key: "sales", label: "Ventas del Dia", icon: ShoppingCart, description: "Captura de ventas" },
  { key: "inventory", label: "Inventario", icon: Boxes, description: "Control de existencias" },
  { key: "products", label: "Productos", icon: Package, description: "Catalogo y precios" },
  { key: "staff", label: "Personal", icon: Users, description: "Empleados y comisiones" },
  { key: "expenses", label: "Gastos", icon: Receipt, description: "Gastos y egresos" },
  { key: "credits", label: "Creditos", icon: CreditCard, description: "Cuentas por cobrar" },
  { key: "cash-closing", label: "Corte de Caja", icon: Wallet, description: "Cierre diario" },
  { key: "reports", label: "Reportes", icon: BarChart3, description: "Analisis y tendencias" },
]

interface SidebarProps {
  activeView: ViewKey
  onSelect: (view: ViewKey) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ activeView, onSelect, mobileOpen, onMobileClose }: SidebarProps) {
  const { theme, setTheme } = useTheme()

  const handleSelect = (view: ViewKey) => {
    onSelect(view)
    onMobileClose()
  }

  return (
    <>
      {/* Overlay en movil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo / Header */}
        <div className="flex h-20 items-center justify-between gap-2 border-b px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
              <Beer className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Cantina Manager</h1>
              <p className="text-xs text-muted-foreground">Gestion integral</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileClose}
            aria-label="Cerrar menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navegacion */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.key
              return (
                <li key={item.key}>
                  <button
                    onClick={() => handleSelect(item.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.label}</div>
                      <div
                        className={cn(
                          "text-xs truncate",
                          isActive ? "text-primary-foreground/70" : "text-muted-foreground/70"
                        )}
                      >
                        {item.description}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer: tema */}
        <div className="border-t p-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <Sun className="mr-2 h-4 w-4" /> Modo claro
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" /> Modo oscuro
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  )
}

export function MobileTopBar({
  onMenuClick,
  title,
}: {
  onMenuClick: () => void
  title: string
}) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </Button>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  )
}

export function useNavTitle(activeView: ViewKey) {
  return useMemo(() => {
    const item = NAV_ITEMS.find((i) => i.key === activeView)
    return item?.label ?? ""
  }, [activeView])
}
