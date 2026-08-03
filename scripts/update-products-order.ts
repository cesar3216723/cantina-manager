import { db } from "../src/lib/db";

const DESIRED_PRODUCTS = [
  { name: "MEDIA LAGER", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 15, salePrice: 30, sortOrder: 1 },
  { name: "MEDIA AZUL", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 14, salePrice: 30, sortOrder: 2 },
  { name: "MEDIA VICTORIA", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 17, salePrice: 35, sortOrder: 3 },
  { name: "MEDIA CORONA", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 17, salePrice: 35, sortOrder: 4 },
  { name: "MEGA LAGER", category: "CERVEZA", presentation: "MEGA", purchasePrice: 37, salePrice: 70, sortOrder: 5 },
  { name: "MEGA ROJA", category: "CERVEZA", presentation: "MEGA", purchasePrice: 35, salePrice: 60, sortOrder: 6 },
  { name: "MEGA AZUL", category: "CERVEZA", presentation: "MEGA", purchasePrice: 35, salePrice: 60, sortOrder: 7 },
  { name: "MEGA VICTORIA", category: "CERVEZA", presentation: "MEGA", purchasePrice: 41, salePrice: 80, sortOrder: 8 },
  { name: "MEGA CORONA", category: "CERVEZA", presentation: "MEGA", purchasePrice: 41, salePrice: 80, sortOrder: 9 },
  { name: "CIGARRO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 6, salePrice: 10, sortOrder: 10 },
  { name: "CACAHUATE", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 13, salePrice: 25, sortOrder: 11 },
  { name: "CHICARRON", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 11, salePrice: 35, sortOrder: 12 },
  { name: "SEMILLAS", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 10, salePrice: 15, sortOrder: 13 },
  { name: "PAPAS", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 14.8, salePrice: 35, sortOrder: 14 },
  { name: "COCA 355", category: "REFRESCO", presentation: "BOTELLA", purchasePrice: 13, salePrice: 20, sortOrder: 15 },
  { name: "PEÑAFIEL 355", category: "REFRESCO", presentation: "BOTELLA", purchasePrice: 11, salePrice: 20, sortOrder: 16 },
  { name: "TORONJA 355", category: "REFRESCO", presentation: "BOTELLA", purchasePrice: 10, salePrice: 20, sortOrder: 17 },
  { name: "BOOS", category: "MIX", presentation: "BOTELLA", purchasePrice: 40, salePrice: 60, sortOrder: 18 },
  { name: "NEWMIX PALOMA", category: "MIX", presentation: "BOTELLA", purchasePrice: 25, salePrice: 45, sortOrder: 19 },
  { name: "NEWMIX VAMPIRO", category: "MIX", presentation: "BOTELLA", purchasePrice: 25, salePrice: 45, sortOrder: 20 },
  { name: "NEW MIX CANTARITO", category: "MIX", presentation: "BOTELLA", purchasePrice: 25, salePrice: 45, sortOrder: 21 },
  { name: "CLAMATO (Botella)", category: "MIX", presentation: "BOTELLA", purchasePrice: 27, salePrice: 45, sortOrder: 22 },
  { name: "SOPA", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 14, salePrice: 35, sortOrder: 23 },
  { name: "MANGUITO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 8, salePrice: 15, sortOrder: 24 },
  { name: "CHICLES", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 28, salePrice: 50, sortOrder: 25 },
  { name: "SALSA VALENTINA (CHICA)", category: "OTROS", presentation: "UNIDAD", purchasePrice: 17, salePrice: 35, sortOrder: 26 },
];

async function main() {
  console.log("Iniciando actualización de productos...");

  // 1. Marcar todos los productos como inactivos
  await db.product.updateMany({
    data: { active: false },
  });
  console.log("Desactivados todos los productos existentes.");

  // 2. Insertar o actualizar los productos deseados
  for (const p of DESIRED_PRODUCTS) {
    const existing = await db.product.findUnique({
      where: { name: p.name },
    });

    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: {
          category: p.category,
          presentation: p.presentation,
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice,
          sortOrder: p.sortOrder,
          active: true,
        },
      });
      console.log(`Actualizado: ${p.name} (SortOrder: ${p.sortOrder})`);
    } else {
      await db.product.create({
        data: {
          name: p.name,
          category: p.category,
          presentation: p.presentation,
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice,
          sortOrder: p.sortOrder,
          active: true,
        },
      });
      console.log(`Creado: ${p.name} (SortOrder: ${p.sortOrder})`);
    }
  }

  console.log("Actualización finalizada con éxito.");
}

main()
  .catch((e) => {
    console.error("Error al actualizar productos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
