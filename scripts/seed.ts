import { db } from "@/lib/db";

// ============================================================
// Seed: Carga inicial de productos, personal y datos demo
// Ejecutar con: bun run scripts/seed.ts
// ============================================================

const PRODUCTS = [
  // Cervezas MEDIA
  { name: "MEDIA LAGER", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 15, salePrice: 30, sortOrder: 1 },
  { name: "MEDIA AZUL", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 14, salePrice: 30, sortOrder: 2 },
  { name: "MEDIA VICTORIA", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 17, salePrice: 35, sortOrder: 3 },
  { name: "MEDIA CORONA", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 17, salePrice: 35, sortOrder: 4 },
  // Cervezas MEGA
  { name: "MEGA LAGER", category: "CERVEZA", presentation: "MEGA", purchasePrice: 37, salePrice: 70, sortOrder: 5 },
  { name: "MEGA ROJA", category: "CERVEZA", presentation: "MEGA", purchasePrice: 35, salePrice: 60, sortOrder: 6 },
  { name: "MEGA AZUL", category: "CERVEZA", presentation: "MEGA", purchasePrice: 35, salePrice: 60, sortOrder: 7 },
  { name: "MEGA VICTORIA", category: "CERVEZA", presentation: "MEGA", purchasePrice: 41, salePrice: 80, sortOrder: 8 },
  { name: "MEGA CORONA", category: "CERVEZA", presentation: "MEGA", purchasePrice: 41, salePrice: 80, sortOrder: 9 },
  // Cubos (6 piezas)
  { name: "CUBO MEDIA LAGER (6)", category: "CERVEZA", presentation: "CUBO", purchasePrice: 84, salePrice: 160, sortOrder: 10 },
  { name: "CUBO MEDIA AZUL (6)", category: "CERVEZA", presentation: "CUBO", purchasePrice: 84, salePrice: 160, sortOrder: 11 },
  { name: "CUBO MEDIA VICTORIA (6)", category: "CERVEZA", presentation: "CUBO", purchasePrice: 102, salePrice: 180, sortOrder: 12 },
  { name: "CUBO MEDIA CORONA (6)", category: "CERVEZA", presentation: "CUBO", purchasePrice: 102, salePrice: 180, sortOrder: 13 },
  // Promos (3 piezas)
  { name: "PROMO MEGA LAGER (3)", category: "CERVEZA", presentation: "PROMO", purchasePrice: 111, salePrice: 195, sortOrder: 14 },
  { name: "PROMO MEGA ROJA (3)", category: "CERVEZA", presentation: "PROMO", purchasePrice: 105, salePrice: 165, sortOrder: 15 },
  { name: "PROMO MEGA AZUL (3)", category: "CERVEZA", presentation: "PROMO", purchasePrice: 105, salePrice: 165, sortOrder: 16 },
  { name: "PROMO MEGA VICTORIA (3)", category: "CERVEZA", presentation: "PROMO", purchasePrice: 123, salePrice: 225, sortOrder: 17 },
  { name: "PROMO MEGA CORONA (3)", category: "CERVEZA", presentation: "PROMO", purchasePrice: 123, salePrice: 225, sortOrder: 18 },
  // Miches (2 medias)
  { name: "MICHE LAGER (2 MEDIAS)", category: "CERVEZA", presentation: "MICHE", purchasePrice: 40, salePrice: 95, sortOrder: 19 },
  { name: "MICHE AZUL (2 MEDIAS)", category: "CERVEZA", presentation: "MICHE", purchasePrice: 40, salePrice: 95, sortOrder: 20 },
  { name: "MICHE VICTORIA (2 MEDIAS)", category: "CERVEZA", presentation: "MICHE", purchasePrice: 45, salePrice: 95, sortOrder: 21 },
  { name: "MICHE CORONA (2 MEDIAS)", category: "CERVEZA", presentation: "MICHE", purchasePrice: 45, salePrice: 95, sortOrder: 22 },
  // Copas
  { name: "COPA $50", category: "CERVEZA", presentation: "COPA", purchasePrice: 25, salePrice: 50, sortOrder: 23 },
  { name: "COPA $70", category: "CERVEZA", presentation: "COPA", purchasePrice: 30, salePrice: 70, sortOrder: 24 },
  { name: "COPA $100", category: "CERVEZA", presentation: "COPA", purchasePrice: 50, salePrice: 100, sortOrder: 25 },
  { name: "COPA $120", category: "CERVEZA", presentation: "COPA", purchasePrice: 70, salePrice: 120, sortOrder: 26 },
  { name: "COPA $150", category: "CERVEZA", presentation: "COPA", purchasePrice: 100, salePrice: 150, sortOrder: 27 },
  { name: "AZULITO", category: "CERVEZA", presentation: "OTRO", purchasePrice: 40, salePrice: 95, sortOrder: 28 },
  // Botanas
  { name: "CIGARRO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 6, salePrice: 10, sortOrder: 29 },
  { name: "CACAHUATE", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 13, salePrice: 25, sortOrder: 30 },
  { name: "CHICARRON", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 11, salePrice: 35, sortOrder: 31 },
  { name: "SEMILLAS", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 10, salePrice: 15, sortOrder: 32 },
  { name: "PAPAS", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 14.8, salePrice: 35, sortOrder: 33 },
  { name: "SOPA", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 14, salePrice: 35, sortOrder: 34 },
  { name: "BOTANA JAMON", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 40, salePrice: 70, sortOrder: 35 },
  { name: "MANGUITO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 8, salePrice: 15, sortOrder: 36 },
  { name: "CHICLES", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 28, salePrice: 50, sortOrder: 37 },
  // Refrescos
  { name: "COCA 355", category: "REFRESCO", presentation: "BOTELLA", purchasePrice: 13, salePrice: 20, sortOrder: 38 },
  { name: "PEÑAFIEL 355", category: "REFRESCO", presentation: "BOTELLA", purchasePrice: 11, salePrice: 20, sortOrder: 39 },
  { name: "TORONJA 355", category: "REFRESCO", presentation: "BOTELLA", purchasePrice: 10, salePrice: 20, sortOrder: 40 },
  // Mixes
  { name: "BOOS", category: "MIX", presentation: "BOTELLA", purchasePrice: 40, salePrice: 60, sortOrder: 41 },
  { name: "NEWMIX PALOMA", category: "MIX", presentation: "BOTELLA", purchasePrice: 25, salePrice: 45, sortOrder: 42 },
  { name: "NEWMIX VAMPIRO", category: "MIX", presentation: "BOTELLA", purchasePrice: 25, salePrice: 45, sortOrder: 43 },
  { name: "CLAMATO (Botella)", category: "MIX", presentation: "BOTELLA", purchasePrice: 27, salePrice: 45, sortOrder: 44 },
  { name: "CLAMATO (Preparado vaso)", category: "MIX", presentation: "VASO", purchasePrice: 27, salePrice: 45, sortOrder: 45 },
  { name: "PREPARADO SALSAS (Vaso)", category: "MIX", presentation: "VASO", purchasePrice: 10, salePrice: 25, sortOrder: 46 },
  // Servicios / Otros
  { name: "CANCION", category: "SERVICIO", presentation: "SERVICIO", purchasePrice: 0, salePrice: 10, sortOrder: 47 },
  { name: "DESCORCHE", category: "SERVICIO", presentation: "SERVICIO", purchasePrice: 0, salePrice: 300, sortOrder: 48 },
  { name: "VASO ROTO", category: "SERVICIO", presentation: "SERVICIO", purchasePrice: 0, salePrice: 35, sortOrder: 49 },
  { name: "SALSA VALENTINA (CHICA)", category: "OTROS", presentation: "UNIDAD", purchasePrice: 17, salePrice: 35, sortOrder: 50 },
]

const STAFF = [
  { name: "ELOY", salary: 0, sortOrder: 1 },
  { name: "NUBIA", salary: 650, sortOrder: 2 },
  { name: "MARCE", salary: 400, sortOrder: 3 },
  { name: "ISELA", salary: 0, sortOrder: 4 },
  { name: "VIKY", salary: 0, sortOrder: 5 },
]

// Generador de ventas demo realistas para 14 dias
function generateDemoSales(products: any[], dates: Date[]) {
  const sales: any[] = []
  // Patrones de productos mas vendidos (con probabilidad)
  const popularItems = [
    { idx: 0, weight: 5 },  // MEDIA LAGER
    { idx: 2, weight: 5 },  // MEDIA VICTORIA
    { idx: 3, weight: 4 },  // MEDIA CORONA
    { idx: 1, weight: 3 },  // MEDIA AZUL
    { idx: 4, weight: 3 },  // MEGA LAGER
    { idx: 8, weight: 2 },  // MEGA CORONA
    { idx: 17, weight: 2 }, // PROMO MEGA CORONA
    { idx: 12, weight: 1 }, // CUBO MEDIA VICTORIA
    { idx: 28, weight: 4 }, // CIGARRO
    { idx: 29, weight: 4 }, // CACAHUATE
    { idx: 30, weight: 2 }, // CHICARRON
    { idx: 37, weight: 3 }, // COCA 355
    { idx: 38, weight: 2 }, // PEÑAFIEL
    { idx: 41, weight: 2 }, // BOOS
    { idx: 42, weight: 1 }, // NEWMIX PALOMA
  ]

  let ticketCounter = 0

  for (const date of dates) {
    // Fin de semana vende mas
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const ticketsPerDay = isWeekend ? 8 + Math.floor(Math.random() * 6) : 4 + Math.floor(Math.random() * 5)

    for (let t = 0; t < ticketsPerDay; t++) {
      ticketCounter++
      const ticketId = `demo-ticket-${ticketCounter}`
      const itemsPerTicket = 1 + Math.floor(Math.random() * 4) // 1-4 productos por cuenta

      for (let i = 0; i < itemsPerTicket; i++) {
        // Seleccionar producto por peso
        const totalWeight = popularItems.reduce((s, p) => s + p.weight, 0)
        let r = Math.random() * totalWeight
        let selected = popularItems[0]
        for (const p of popularItems) {
          r -= p.weight
          if (r <= 0) { selected = p; break }
        }
        const prod = products[selected.idx]
        if (!prod) continue

        const quantity = 1 + Math.floor(Math.random() * 3)
        const isComplimentary = Math.random() < 0.05 // 5% cortesias
        const unitPrice = prod.salePrice
        const total = isComplimentary ? 0 : quantity * unitPrice

        sales.push({
          date,
          ticketId,
          productId: prod.id,
          saleType: "PUBLICO",
          quantity,
          unitPrice,
          purchasePrice: prod.purchasePrice,
          total,
          isComplimentary,
        })
      }
    }
  }
  return sales
}

async function main() {
  console.log("Iniciando seed...")

  // Limpiar tablas
  await db.sale.deleteMany()
  await db.tokenSale.deleteMany()
  await db.dailyInventory.deleteMany()
  await db.expense.deleteMany()
  await db.credit.deleteMany()
  await db.staffPayment.deleteMany()
  await db.dailyCashClosing.deleteMany()
  await db.product.deleteMany()
  await db.staff.deleteMany()

  // Crear productos
  for (const p of PRODUCTS) {
    await db.product.create({ data: p })
  }
  console.log(`${PRODUCTS.length} productos creados`)

  // Crear personal
  for (const s of STAFF) {
    await db.staff.create({ data: s })
  }
  console.log(`${STAFF.length} empleados creados`)

  // Generar ventas demo para los ultimos 14 dias
  const products = await db.product.findMany({ orderBy: { sortOrder: "asc" } })
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const dates: Date[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d)
  }

  const demoSales = generateDemoSales(products, dates)
  for (const sale of demoSales) {
    await db.sale.create({ data: sale })
  }
  console.log(`${demoSales.length} ventas demo creadas en ${dates.length} dias`)

  // Crear algunos gastos demo
  const expenses = [
    { date: dates[13], description: "Compra de cervezas", amount: 2500, paymentMethod: "EFECTIVO", category: "COMPRA" },
    { date: dates[13], description: "Pago de luz", amount: 850, paymentMethod: "EFECTIVO", category: "SERVICIO" },
    { date: dates[10], description: "Compra de botanas", amount: 1200, paymentMethod: "EFECTIVO", category: "COMPRA" },
    { date: dates[7], description: "Gas", amount: 450, paymentMethod: "EFECTIVO", category: "SERVICIO" },
    { date: dates[3], description: "Reparacion refrigerador", amount: 1500, paymentMethod: "EFECTIVO", category: "GENERAL" },
  ]
  for (const e of expenses) {
    await db.expense.create({ data: e })
  }
  console.log(`${expenses.length} gastos demo creados`)

  // Crear algunos creditos demo
  const credits = [
    { date: dates[10], customerName: "Jorge Martinez", description: "2 media azul ficha Isela", amount: 240, status: "PENDIENTE" },
    { date: dates[7], customerName: "German Ruiz", description: "1 Mega Roja", amount: 60, status: "PENDIENTE" },
    { date: dates[3], customerName: "Carlos Vega", description: "Cuenta del dia", amount: 350, status: "PAGADO", paidDate: dates[2], paymentMethod: "EFECTIVO" },
  ]
  for (const c of credits) {
    await db.credit.create({ data: c })
  }
  console.log(`${credits.length} creditos demo creados`)

  console.log("Seed completado!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
