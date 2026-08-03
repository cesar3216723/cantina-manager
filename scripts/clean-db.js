const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client pointing to the target database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log("Iniciando la limpieza de datos de prueba en la base de datos...");
  console.log("La URL de la base de datos es:", process.env.DATABASE_URL ? "Configurada (OK)" : "NO CONFIGURADA");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta definida en las variables de entorno.");
  }

  // Borrar registros en las tablas transaccionales en orden
  const deletedSales = await prisma.sale.deleteMany({});
  console.log(`- Ventas eliminadas: ${deletedSales.count}`);

  const deletedTokens = await prisma.tokenSale.deleteMany({});
  console.log(`- Fichas de personal eliminadas: ${deletedTokens.count}`);

  const deletedExpenses = await prisma.expense.deleteMany({});
  console.log(`- Gastos eliminados: ${deletedExpenses.count}`);

  const deletedCredits = await prisma.credit.deleteMany({});
  console.log(`- Creditos eliminados: ${deletedCredits.count}`);

  const deletedClosings = await prisma.dailyCashClosing.deleteMany({});
  console.log(`- Cortes de caja diarios eliminados: ${deletedClosings.count}`);

  const deletedPayments = await prisma.staffPayment.deleteMany({});
  console.log(`- Pagos a personal eliminados: ${deletedPayments.count}`);

  console.log("\n=======================================================");
  console.log("¡BASE DE DATOS LISTA PARA PRODUCCION!");
  console.log("Se han conservado intactos los catalogos de:");
  console.log("- Productos (Bebidas, botanas, etc.)");
  console.log("- Personal (Empleados registrados)");
  console.log("- Usuarios (Credenciales de administrador para login)");
  console.log("=======================================================");
}

main()
  .catch((e) => {
    console.error("Error al ejecutar el script de limpieza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
