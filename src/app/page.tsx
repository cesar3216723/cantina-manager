"use client"

import { useState } from "react"
import { Sidebar, MobileTopBar, useNavTitle, type ViewKey } from "@/components/layout/sidebar"
import { DashboardModule } from "@/components/modules/dashboard"
import { SalesModule } from "@/components/modules/sales"
import { InventoryModule } from "@/components/modules/inventory"
import { ProductsModule } from "@/components/modules/products"
import { StaffModule } from "@/components/modules/staff"
import { ExpensesModule } from "@/components/modules/expenses"
import { CreditsModule } from "@/components/modules/credits"
import { CashClosingModule } from "@/components/modules/cash-closing"
import { ReportsModule } from "@/components/modules/reports"

export default function HomePage() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [salesActiveDate, setSalesActiveDate] = useState<string | null>(null)
  const title = useNavTitle(activeView)

  const handleNavigateToSalesWithDate = (date: string) => {
    setSalesActiveDate(date)
    setActiveView("sales")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView={activeView}
        onSelect={setActiveView}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-72">
        <MobileTopBar onMenuClick={() => setMobileOpen(true)} title={title} />

        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          {/* Header desktop */}
          <header className="hidden border-b bg-card px-8 py-5 lg:block">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            {activeView === "dashboard" && <DashboardModule onNavigate={setActiveView} />}
            {activeView === "sales" && (
              <SalesModule
                initialDate={salesActiveDate || undefined}
                onDateHandled={() => setSalesActiveDate(null)}
              />
            )}
            {activeView === "inventory" && <InventoryModule />}
            {activeView === "products" && <ProductsModule />}
            {activeView === "staff" && <StaffModule />}
            {activeView === "expenses" && <ExpensesModule />}
            {activeView === "credits" && <CreditsModule />}
            {activeView === "cash-closing" && <CashClosingModule />}
            {activeView === "reports" && (
              <ReportsModule onNavigateToSalesWithDate={handleNavigateToSalesWithDate} />
            )}
          </div>

          <footer className="border-t bg-card px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
            Cantina Manager &middot; Sistema de Gestion &middot; {new Date().getFullYear()}
          </footer>
        </main>
      </div>
    </div>
  )
}
