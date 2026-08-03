import { db } from "../src/lib/db";

const NEW_PRODUCTS = [
  { name: "MEDIA ROJA", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 15, salePrice: 30, sortOrder: 4.1 },
  { name: "MEDIA INDIO", category: "CERVEZA", presentation: "MEDIA", purchasePrice: 17, salePrice: 35, sortOrder: 4.2 },
  { name: "MEGA INDIO", category: "CERVEZA", presentation: "MEGA", purchasePrice: 41, salePrice: 80, sortOrder: 9.1 },
  { name: "CACAHUATE SALADO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 13, salePrice: 25, sortOrder: 11.1 },
  { name: "CACAHUATE ENCHILADO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 13, salePrice: 25, sortOrder: 11.2 },
  { name: "CACAHUATE AJO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 13, salePrice: 25, sortOrder: 11.3 },
  { name: "CACAHUATE MIXTO", category: "BOTANA", presentation: "UNIDAD", purchasePrice: 13, salePrice: 25, sortOrder: 11.4 },
];

async function main() {
  console.log("Verificando y agregando productos faltantes del menú de personal...");

  for (const p of NEW_PRODUCTS) {
    const existing = await db.product.findUnique({
      where: { name: p.name },
    });

    if (!existing) {
      await db.product.create({
        data: {
          name: p.name,
          category: p.category,
          presentation: p.presentation,
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice,
          sortOrder: Math.round(p.sortOrder * 10), // para evitar floats en base de datos si fuera entero, pero sortOrder es Int en prisma.
          active: true,
        },
      });
      console.log(`Creado producto faltante: ${p.name}`);
    } else {
      // Nos aseguramos de que esté activo
      await db.product.update({
        where: { id: existing.id },
        data: { active: true },
      });
      console.log(`El producto ${p.name} ya existía, asegurado como activo.`);
    }
  }

  console.log("Proceso de verificación finalizado con éxito.");
}

main()
  .catch((e) => {
    console.error("Error al crear productos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
