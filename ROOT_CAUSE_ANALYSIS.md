# Root Cause Analysis: Cantina Manager (Supabase + Prisma + Vercel)

## 📌 Causa Raíz

El problema de conexión con la base de datos se debe a un conflicto de compatibilidad entre **Prisma Client** y el connection pooler de Supabase (**Supavisor**) que opera en "Transaction Mode" (puerto `6543`).

Por defecto, PostgreSQL y Prisma utilizan "Prepared Statements" (consultas pre-compiladas) para optimizar el rendimiento. Sin embargo, un pooler transaccional no garantiza que las consultas subsecuentes se ejecuten en la misma conexión física al motor de la base de datos, lo que provoca el error `db error: ERROR: prepared statement "s0" already exists` al intentar reutilizar una conexión que ya tenía un statement diferente preparado con ese nombre.

Aunque la URL en Vercel tenía el parámetro `?pgbouncer=true`, Prisma requiere que la configuración en `schema.prisma` especifique explícitamente un `directUrl` para gestionar correctamente el pooling y deshabilitar los prepared statements en tiempo de ejecución. Al faltar este parámetro y la variable de entorno correspondiente, Prisma intentaba usar prepared statements en una conexión de pooler.

## 🔎 Evidencia Encontrada

1. **Configuración Inicial en `schema.prisma`**:
   No existía el parámetro `directUrl`.
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. **Variable en Vercel**:
   La variable de entorno `DATABASE_URL` apuntaba correctamente al pooler de Supabase (puerto `6543`) con el parámetro `?pgbouncer=true`, pero faltaba `DIRECT_URL`.
3. **Logs de Ejecución en Vercel** (Ruta `/api/products`):
   ```text
   2026-06-27T23:55:12.443Z Error querying the database: Error querying the database: db error: ERROR: prepared statement "s0" already exists
   ```
4. **Verificación en Supabase**:
   Al consultar directamente la API de Supabase, confirmamos que las tablas de la base de datos (Ej: `Product`, `Sale`, `Staff`) **sí existían**, descartando un problema de falta de migraciones.

## 🧪 Pruebas Realizadas

- Listado de proyectos en Vercel y Supabase para validar las referencias y IDs de proyecto.
- Extracción de variables de entorno de Vercel (descubriendo que `DATABASE_URL` usaba el pooler `6543`).
- Invocación de API de Supabase para contar las tablas de `public` y validar que la base de datos tenía esquema cargado.
- Extracción de logs de *runtime* desde Vercel (identificando el error explícito de `prepared statement "s0"`).

## 🛠 Cambios Efectuados

1. **Vercel - Actualización de Variables**:
   - Se removió y re-agregó la variable `DATABASE_URL` en Vercel con el parámetro adicional `&connection_limit=1` para evitar exhaustar las conexiones en entornos Serverless.
   - Se agregó la nueva variable `DIRECT_URL` (puerto `5432`) que apunta directamente al motor Postgres (sin pooler).
2. **Código - Modificación de `schema.prisma`**:
   Se actualizó el bloque `datasource` para instruir a Prisma sobre el uso del Pooler y de la URL directa:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
3. **Git - Commit y Push**:
   Se hizo commit de los cambios bajo el mensaje `fix(prisma): configure directUrl and pgbouncer for supabase supavisor` y se subieron a GitHub para gatillar un nuevo despliegue automático en Vercel.

## ✅ Validación Final

- **Despliegue automático**: En curso vía Vercel al hacer push a la rama `main`.
- Las variables se confirmaron inyectadas exitosamente vía la Vercel CLI.
- Al acceder nuevamente a los endpoints de la API (por ejemplo, cargar productos u operaciones), las consultas llegarán al pooler sin intentar abrir un *prepared statement*, evitando el conflicto "already exists".

## 💡 Recomendaciones Futuras

1. **Migraciones de Base de Datos**: Para correr migraciones en la nube (ej. `npx prisma db push`), asegúrate de utilizar siempre un entorno que tenga acceso a la `DIRECT_URL`. El pooler transaccional NO soporta comandos DDL (modificación de estructura).
2. **Entornos de Desarrollo Local**: El proyecto parece usar SQLite localmente según `.env.example`. Asegúrate de no enviar accidentalmente migraciones de PostgreSQL al DB local y viceversa.
3. **Actualizaciones de Prisma**: Prisma introdujo un nuevo adapter llamado `@prisma/adapter-pg` basado en el driver `pg` que maneja conexiones serverless de manera más nativa. Podrías investigar su integración si los problemas de performance persisten en Vercel.
