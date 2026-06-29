# 🍺 Cantina Manager

Sistema integral de gestión para cantina/bar construido con Next.js, TypeScript y Prisma. Reemplaza la administración manual en Excel por una aplicación web con punto de venta (POS), control de inventario, gestión de personal, y reportes analíticos.

![Dashboard](public/screenshots/dashboard.png)

## 🎯 El Problema

Un bar/cantina en México llevaba toda su administración en un archivo de Excel con una hoja por día que contenía 5 secciones manuales: venta al público, venta al personal, venta de fichas, inventario y resumen del día. Este método era propenso a errores, difícil de consultar históricamente, y no permitía generar reportes o analíticas del negocio.

## ✨ La Solución

Una aplicación web responsive que digitaliza y automatiza todas las operaciones del negocio:

- **Punto de Venta (POS)**: registra cuentas/comandas con múltiples productos y cálculo automático del total
- **Inventario diario**: control de existencias con conteo físico y detección de diferencias
- **Gestión de personal**: empleados, venta de fichas, comisiones y pagos
- **Corte de caja**: cierre diario con cálculo automático desde ventas, gastos y pagos
- **Reportes**: analítica de ventas, utilidad, top productos y desempeño del personal
- **Dashboard**: KPIs en tiempo real, gráficos de ventas y alertas de inventario

## 🖼️ Capturas

### Punto de Venta (POS)
![Sales POS](public/screenshots/sales-pos.png)

### Catálogo de Productos
![Products](public/screenshots/products.png)

### Reportes Analíticos
![Reports](public/screenshots/reports.png)

### Control de Inventario
![Inventory](public/screenshots/inventory.png)

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    NAVEGADOR                         │
│   React 19 + Tailwind CSS 4 + shadcn/ui             │
│   TanStack Query + Recharts + Sonner                │
│                                                      │
│   9 módulos: Dashboard, Ventas (POS), Inventario,   │
│   Productos, Personal, Gastos, Créditos,            │
│   Corte de Caja, Reportes                           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / REST (Conectado a NextAuth)
                       ▼
┌─────────────────────────────────────────────────────┐
│       NEXT.JS 16 MIDDLEWARE & SECURITY HEADERS      │
│  Control de acceso perimetral. Bloqueo 401 a APIs.  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              NEXT.JS 16 API ROUTES                   │
│              27 endpoints REST protegidos            │
│                                                      │
│  /api/sales  /api/products  /api/staff  /api/reports│
│  /api/inventory  /api/expenses  /api/credits        │
│  /api/cash-closing  /api/dashboard                  │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma ORM
                       ▼
┌─────────────────────────────────────────────────────┐
│           PostgreSQL (Supabase)                      │
│   Supavisor Connection Pooling (aws-1)               │
└─────────────────────────────────────────────────────┘
```

Arquitectura **full-stack monolítica** y asegurada. El frontend y backend residen en Next.js, ahora con una capa perimetral de autenticación y cabeceras de respuesta protegidas.

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Framework** | Next.js 16 (App Router) | Rendering, routing y API endpoints |
| **Seguridad** | NextAuth.js + BcryptJS | Autenticación basada en cookies HTTP-only seguras |
| **Lenguaje** | TypeScript 5 | Tipado estático (Estricto en compilación) |
| **Estilos** | Tailwind CSS 4 + shadcn/ui | Sistema de diseño consistente |
| **Estado** | TanStack Query | Cache y sincronización con el servidor |
| **Base de datos** | PostgreSQL (Supabase) | Almacenamiento con pooler de conexiones (Supavisor) |
| **ORM** | Prisma 6 | Capa de acceso a datos tipada |
| **Gráficos** | Recharts | Visualizaciones para dashboard y reportes |
| **Iconos** | Lucide React | Iconografía moderna |
| **Notificaciones** | Sonner | Toasts de feedback al usuario |
| **Runtime** | Bun / Node.js | Ejecución del backend y frontend |

## 📊 Modelo de Datos

```
Product ──┬── Sale ────┬── Staff
          │             │
          ├── TokenSale─┘
          │
          ├── DailyInventory
          │
          └── (catálogo)

Expense          ← gastos del día
Credit           ← cuentas por cobrar
StaffPayment     ← pagos a empleados (sueldo + comisión - consumo)
DailyCashClosing ← corte de caja diario
```

## 🔒 Seguridad e Infraestructura (Nuevos Cambios)

Tras realizar una auditoría de ciberseguridad y arquitectura, implementamos las siguientes medidas de hardening para habilitar el uso seguro en producción:

### 1. Autenticación y Autorización (NextAuth.js)
- **Acceso Restringido**: Middleware global protege todas las páginas internas (`/dashboard`, `/inventario`, etc.) y las APIs del backend (`/api/*`), redirigiendo a `/login` si no se detecta sesión.
- **Validación Segura**: Inicio de sesión mediante el proveedor `Credentials` de NextAuth. Las contraseñas son validadas contra hashes seguros generados con **BcryptJS**.
- **Credenciales en Entorno**: El usuario administrador y su hash de contraseña se manejan en variables del entorno del servidor y nunca se exponen al cliente.

### 2. Cabeceras HTTP de Seguridad
Configuración de cabeceras HTTP restrictivas en `next.config.ts` para mitigar ataques comunes de la web:
- **`X-Frame-Options: DENY`**: Evita ataques de clickjacking denegando la renderización de la app dentro de un iframe.
- **`X-Content-Type-Options: nosniff`**: Previene ataques de MIME-sniffing.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Protege la fuga de datos del referrer en peticiones cross-origin.

### 3. Hardening en Compilación y Ejecución
- **TypeScript Estricto**: Cambiado `ignoreBuildErrors: false` en `next.config.ts` para garantizar integridad de tipos en builds de producción.
- **React Strict Mode**: Reactivado en `next.config.ts` para mitigar efectos secundarios no deseados en desarrollo y renderizado.
- **Pooling del Servidor**: Configurada la URL de pooler transaccional de Supabase (`aws-1-us-east-1` en puerto `6543`) con directrices `pgbouncer=true&connection_limit=1` para evitar la saturación de conexiones en entornos Serverless (Vercel).

## 🚀 Características

### Punto de Venta (POS)
- Catálogo de productos agrupado por categoría con buscador en tiempo real
- Carrito de cuenta actual con edición de cantidades, precios y cortesías
- Cobro de cuenta completa con un solo clic
- Historial de cuentas cobradas en el día, expandibles para ver detalle
- Soporte para venta al público y venta a personal (con selección de empleado)

### Dashboard
- KPIs en tiempo real: ventas hoy, gastos, utilidad neta, créditos pendientes
- Gráfico de barras con ventas de la semana
- Top 5 productos vendidos hoy
- Estado de inventario con alertas de stock bajo
- Panel de alertas inteligentes

### Inventario
- Control diario por producto: inicial, entrada, salida, final
- Conteo físico con cálculo automático de diferencias
- Inicialización automática desde el día anterior
- Valoración del inventario a precio de compra y venta
- Observaciones por producto

## 📦 Instalación Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) 18+ o [Bun](https://bun.sh/) runtime
- Una base de datos PostgreSQL (recomendado: [Supabase](https://supabase.com/))

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/cesar3216723/cantina-manager.git
cd cantina-manager

# 2. Instalar dependencias
bun install

# 3. Configurar variables de entorno
cp .env.example .env
# Configurar URLs de Supabase, AUTH_SECRET y credenciales de administrador (ADMIN_USERNAME y ADMIN_PASSWORD_HASH)

# 4. Crear la base de datos (crea todas las tablas)
bun run db:push

# 5. Cargar datos iniciales
bun run seed

# 6. Iniciar el servidor de desarrollo
bun run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🌐 Variables de Entorno Requeridas en Producción (Vercel)

| Variable | Propósito | Ejemplo / Formato |
|----------|-----------|-------------------|
| `DATABASE_URL` | URL de conexión al Transaction Pooler (Supavisor) | `postgresql://...supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Conexión directa a Supabase (para migraciones/Prisma CLI) | `postgresql://...supabase.co:5432/postgres` |
| `AUTH_SECRET` | Clave secreta para firmar tokens JWT | Hash aleatorio seguro de 32 bytes |
| `ADMIN_USERNAME` | Identificador de inicio de sesión | `NUBIA` |
| `ADMIN_PASSWORD_HASH` | Hash Bcrypt (Salt rounds: 12) de la clave de acceso | `$2b$12$...` |

## 📁 Estructura del Proyecto

```
cantina-manager/
├── prisma/
│   └── schema.prisma          # 9 modelos de base de datos
├── src/
│   ├── app/
│   │   ├── api/               # APIs Rest seguras con NextAuth
│   │   ├── login/             # Pantalla de Login
│   │   ├── layout.tsx         # Providers Session y estilos
│   │   └── page.tsx           # SPA con sidebar
│   ├── components/
│   │   ├── ui/                # Componentes comunes
│   │   ├── modules/           # Módulos financieros de negocio
│   │   └── providers.tsx      # ThemeProvider + Query + AuthSession
│   ├── lib/
│   │   ├── auth.ts            # Configuración de NextAuth
│   │   ├── db.ts              # Cliente Prisma
│   │   └── api-client.ts      # Fetcher HTTP genérico
│   └── middleware.ts          # Seguridad perimetral global
```

## 📝 Licencia

MIT - Libre uso para fines educativos y comerciales.
