import { db } from "../src/lib/db";

async function main() {
  console.log("Restaurando estado activo para todos los productos de la base de datos...");
  
  // 1. Activar todos los productos
  await db.product.updateMany({
    data: { active: true },
  });

  // 2. Asegurarse de que las comisiones y categorías estén correctas para las semillas
  // (El seed original tiene productos como copas, cubos, promos, miches, servicios)
  console.log("Todos los productos han sido restaurados como activos.");
}

main()
  .catch((e) => {
    console.error("Error restaurando productos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
