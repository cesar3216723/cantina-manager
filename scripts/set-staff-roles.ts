import { db } from "../src/lib/db";

async function main() {
  console.log("Configurando roles del personal en la base de datos...");

  // 1. Asegurar todos los empleados como "EMPLEADO" por defecto
  await db.staff.updateMany({
    data: { role: "EMPLEADO" },
  });

  // 2. ELOY como DUEÑO
  const eloy = await db.staff.findFirst({
    where: { name: { equals: "ELOY", mode: "insensitive" } },
  });
  if (eloy) {
    await db.staff.update({
      where: { id: eloy.id },
      data: { role: "DUEÑO", salary: 0 },
    });
    console.log("ELOY configurado como DUEÑO");
  } else {
    // Si no existiera, lo creamos
    await db.staff.create({
      data: { name: "ELOY", role: "DUEÑO", salary: 0, sortOrder: 1 },
    });
    console.log("ELOY creado y configurado como DUEÑO");
  }

  // 3. NUBIA como JEFA
  const nubia = await db.staff.findFirst({
    where: { name: { equals: "NUBIA", mode: "insensitive" } },
  });
  if (nubia) {
    await db.staff.update({
      where: { id: nubia.id },
      data: { role: "JEFA" },
    });
    console.log("NUBIA configurada como JEFA");
  } else {
    await db.staff.create({
      data: { name: "NUBIA", role: "JEFA", salary: 650, sortOrder: 2 },
    });
    console.log("NUBIA creada y configurada como JEFA");
  }

  console.log("Roles del personal configurados exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error configurando roles:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
