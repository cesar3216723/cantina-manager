import { db } from "../src/lib/db";

const INVENTORY_DATA = [
  { name: "MEDIA LAGER", initialQty: 46, entry: 120, exit: 7, physicalCount: 159 },
  { name: "MEDIA AZUL", initialQty: 25, entry: 80, exit: 0, physicalCount: 105 },
  { name: "MEDIA VICTORIA", initialQty: 18, entry: 24, exit: 4, physicalCount: 38 },
  { name: "MEDIA CORONA", initialQty: 36, entry: 0, exit: 0, physicalCount: 36 },
  { name: "MEGA LAGER", initialQty: 70, entry: 180, exit: 16, physicalCount: 234 },
  { name: "MEGA ROJA", initialQty: 40, entry: 96, exit: 10, physicalCount: 126 },
  { name: "MEGA AZUL", initialQty: 40, entry: 0, exit: 3, physicalCount: 37 },
  { name: "MEGA VICTORIA", initialQty: 20, entry: 0, exit: 4, physicalCount: 16 },
  { name: "MEGA CORONA", initialQty: 17, entry: 0, exit: 0, physicalCount: 17 },
  { name: "CIGARRO", initialQty: 84, entry: 0, exit: 8, physicalCount: 76 },
  { name: "CACAHUATE", initialQty: 16, entry: 0, exit: 1, physicalCount: 15 },
  { name: "CHICARRON", initialQty: 4, entry: 0, exit: 1, physicalCount: 3 },
  { name: "SEMILLAS", initialQty: 0, entry: 0, exit: 0, physicalCount: 0 },
  { name: "PAPAS", initialQty: 0, entry: 0, exit: 0, physicalCount: 0 },
  { name: "COCA 355", initialQty: 27, entry: 0, exit: 2, physicalCount: 25 },
  { name: "PEÑAFIEL 355", initialQty: 9, entry: 0, exit: 0, physicalCount: 9 },
  { name: "TORONJA 355", initialQty: 5, entry: 0, exit: 1, physicalCount: 4 },
  { name: "BOOS", initialQty: 2, entry: 0, exit: 0, physicalCount: 2 },
  { name: "NEWMIX PALOMA", initialQty: 3, entry: 0, exit: 0, physicalCount: 3 },
  { name: "NEWMIX VAMPIRO", initialQty: 3, entry: 0, exit: 0, physicalCount: 3 },
  { name: "NEW MIX CANTARITO", initialQty: 3, entry: 0, exit: 0, physicalCount: 3 },
  { name: "CLAMATO (Botella)", initialQty: 1, entry: 0, exit: 0, physicalCount: 1 },
  { name: "SOPA", initialQty: 0, entry: 0, exit: 0, physicalCount: 0 },
  { name: "MANGUITO", initialQty: 0, entry: 0, exit: 0, physicalCount: 0 },
  { name: "CHICLES", initialQty: 16, entry: 0, exit: 0, physicalCount: 16 },
  { name: "SALSA VALENTINA (CHICA)", initialQty: 16, entry: 0, exit: 0, physicalCount: 16 },
];

async function main() {
  console.log("Sembrando inventario del 2026-07-06...");

  const targetDate = new Date("2026-07-06T12:00:00.000Z");

  // Borrar registros de DailyInventory de la fecha destino
  const startOfTarget = new Date(targetDate);
  startOfTarget.setUTCHours(0, 0, 0, 0);
  const endOfTarget = new Date(targetDate);
  endOfTarget.setUTCHours(23, 59, 59, 999);

  await db.dailyInventory.deleteMany({
    where: {
      date: {
        gte: startOfTarget,
        lte: endOfTarget,
      },
    },
  });

  for (const item of INVENTORY_DATA) {
    const product = await db.product.findUnique({
      where: { name: item.name },
    });

    if (!product) {
      console.log(`Producto no encontrado: ${item.name}`);
      continue;
    }

    const calculatedFinal = item.initialQty + item.entry - item.exit;
    const difference = item.physicalCount - calculatedFinal;

    await db.dailyInventory.create({
      data: {
        date: targetDate,
        productId: product.id,
        initialQty: item.initialQty,
        entry: item.entry,
        exit: item.exit,
        finalQty: calculatedFinal,
        physicalCount: item.physicalCount,
        difference: difference,
      },
    });

    console.log(`Creado inventario para ${item.name}: Inicial: ${item.initialQty}, Entrada: ${item.entry}, Salida: ${item.exit}, Físico: ${item.physicalCount}`);
  }

  console.log("Inventario del 2026-07-06 sembrado correctamente.");
}

main()
  .catch((e) => {
    console.error("Error sembrando inventario:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
