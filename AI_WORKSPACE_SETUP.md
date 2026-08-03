# AI_WORKSPACE_SETUP.md
# Configuración del Workspace de IA — Cantina Manager

> **Fecha de creación:** 2026-06-27  
> **Última validación:** 2026-06-27 ✅ TODOS LOS MCP CONECTADOS  
> **Agente principal:** Google Antigravity 2.0  
> **Proyecto:** Cantina Manager  
> **Stack:** GitHub + Vercel + Supabase  

---

## 📋 Resumen del Objetivo

Configurar Model Context Protocol (MCP) servers para que el agente de IA (Antigravity) pueda:

- ✅ Leer y modificar código en GitHub
- ✅ Revisar deployments en Vercel
- ✅ Leer logs de Vercel
- ✅ Inspeccionar la base de datos en Supabase
- ✅ Revisar migraciones en Supabase
- ✅ Revisar autenticación en Supabase
- ✅ Diagnosticar errores de la aplicación

---

## 🏗️ Arquitectura de MCP

### ¿Qué es MCP?

Model Context Protocol (MCP) es un estándar abierto (creado por Anthropic, adoptado por la industria)
que permite que los LLMs se conecten a herramientas y plataformas externas de forma segura y estandarizada.

```
Antigravity ←→ mcp_config.json ←→ MCP Server Remoto ←→ API de la plataforma
```

### Por qué usamos HTTP Remoto (no stdio/npx local)

| Aspecto | stdio / npx (legacy) | HTTP Remoto (recomendado 2025-2026) |
|---------|----------------------|-------------------------------------|
| Instalación | Requiere Node.js local | Sin instalación |
| Mantenimiento | Manual | El proveedor lo actualiza |
| Seguridad | Variables de entorno en shell | Bearer tokens en headers |
| Compatibilidad | Solo algunos clientes | Estándar amplio |
| Estado (2026) | Deprecated para GitHub/Supabase | ✅ Oficial |

---

## 📁 Archivos del Proyecto

| Archivo | Propósito | Ubicación |
|---------|-----------|-----------|
| `mcp_config.json` | Config principal de MCP para Antigravity | `~/.gemini/antigravity/mcp_config.json` |
| `AI_WORKSPACE_SETUP.md` | Este documento | Raíz del proyecto |

---

## 🔌 MCP Servers Configurados

### 1. 🐙 GitHub MCP Server

| Campo | Valor |
|-------|-------|
| **Endpoint oficial** | `https://api.githubcopilot.com/mcp/` |
| **Documentación** | https://github.com/github/github-mcp-server |
| **Autenticación** | `Authorization: Bearer <PAT>` |
| **Estado** | ✅ CONECTADO — `github-mcp-server` respondiendo |

**Capacidades habilitadas:**
- Leer repositorios, ramas, commits, diffs
- Crear y editar archivos en repos
- Ver y gestionar Pull Requests e Issues
- Ver GitHub Actions / workflows

**Token requerido — GitHub Fine-grained PAT:**
- Ir a: https://github.com/settings/tokens/new?type=beta
- Expiración recomendada: **90 días**
- Permisos mínimos:
  - `Contents` → Read & Write (leer/escribir código)
  - `Pull requests` → Read & Write
  - `Issues` → Read & Write
  - `Metadata` → Read (obligatorio)

---

### 2. 🔺 Vercel MCP Server

| Campo | Valor |
|-------|-------|
| **Endpoint oficial** | `https://mcp.vercel.com` |
| **Documentación** | https://vercel.com/docs/mcp |
| **Autenticación** | `Authorization: Bearer <TOKEN>` |
| **Estado** | ✅ CONECTADO — `Vercel MCP Server v2` respondiendo |

**Capacidades habilitadas:**
- Ver proyectos y estado de deployments
- Leer logs de funciones serverless
- Inspeccionar errores de build
- Gestionar dominios y configuración

**Token requerido — Vercel Access Token:**
- Ir a: https://vercel.com/account/tokens
- Crear con nombre descriptivo: `antigravity-mcp-cantina`
- Expiración: opcional (recomendado 1 año)

---

### 3. 🟩 Supabase MCP Server

| Campo | Valor |
|-------|-------|
| **Endpoint oficial** | `https://mcp.supabase.com/mcp` |
| **Documentación** | https://supabase.com/docs/guides/ai-tools/mcp |
| **Autenticación** | `Authorization: Bearer <TOKEN>` |
| **Estado** | ✅ CONECTADO — `supabase v0.8.1` respondiendo |

**Capacidades habilitadas:**
- Inspeccionar esquema de base de datos (tablas, columnas, relaciones)
- Ejecutar queries SQL de solo lectura
- Ver historial de migraciones
- Revisar configuración de Auth (providers, JWT, políticas RLS)
- Ver Edge Functions

**Token requerido — Supabase Personal Access Token:**
- Ir a: https://supabase.com/dashboard/account/tokens
- Crear con nombre: `antigravity-mcp`
- Sin expiración o con fecha futura

---

## ⚙️ Configuración Aplicada — mcp_config.json

**Ruta:** `C:\Users\Bryan\.gemini\antigravity\mcp_config.json`

**Importante — Formato específico de Antigravity:**
- Se usa `"serverUrl"` (NO `"url"` ni `"httpUrl"`)
- El token va en `"headers"` → `"Authorization"` → `"Bearer <TOKEN>"`

```json
{
  "mcpServers": {
    "github": {
      "serverUrl": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer TU_GITHUB_PAT_AQUI"
      }
    },
    "vercel": {
      "serverUrl": "https://mcp.vercel.com",
      "headers": {
        "Authorization": "Bearer TU_VERCEL_TOKEN_AQUI"
      }
    },
    "supabase": {
      "serverUrl": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer TU_SUPABASE_TOKEN_AQUI"
      }
    }
  }
}
```

> ⚠️ **SEGURIDAD:** Este archivo contiene credenciales sensibles.
> - Nunca lo subas a GitHub
> - Agrégalo a `.gitignore` si copias la configuración al repo
> - Está en el directorio local de Antigravity, no en el proyecto

---

## 🔐 Gestión de Credenciales

### Resumen de tokens

| Servicio | Nombre sugerido | Permisos | Expiración |
|----------|-----------------|----------|------------|
| GitHub | `antigravity-cantina` | Contents, PRs, Issues, Metadata | 90 días |
| Vercel | `antigravity-mcp-cantina` | Full account | 1 año |
| Supabase | `antigravity-mcp` | Management API | Sin expiración |

### Cómo revocar un token comprometido

| Servicio | URL |
|----------|-----|
| GitHub | https://github.com/settings/tokens |
| Vercel | https://vercel.com/account/tokens |
| Supabase | https://supabase.com/dashboard/account/tokens |

### Cómo renovar la configuración tras expirar un token

1. Generar nuevo token en la plataforma
2. Abrir `C:\Users\Bryan\.gemini\antigravity\mcp_config.json`
3. Reemplazar el valor después de `"Bearer "`
4. Guardar el archivo (Antigravity toma el cambio en la próxima sesión)

---

## 🧪 Validación

### Prompts de prueba en Antigravity

Una vez configurados los tokens, ejecutar estos prompts para validar cada conexión:

```
# Validar GitHub
"Lista los repositorios de mi cuenta de GitHub"
"¿Cuál es el último commit en mi repo principal?"

# Validar Vercel
"¿Cuáles son mis proyectos en Vercel?"
"¿Cuál fue el último deployment exitoso?"

# Validar Supabase
"¿Cuáles son las tablas de mi base de datos en Supabase?"
"¿Qué migraciones tengo aplicadas?"
```

### Estado de validación

| Servicio | Configurado | Probado | Funcional | Versión del servidor |
|----------|-------------|---------|-----------|---------------------|
| GitHub | ✅ | ✅ | ✅ | `github-mcp-server/remote-3249da0b` |
| Vercel | ✅ | ✅ | ✅ | `Vercel MCP Server v2` |
| Supabase | ✅ | ✅ | ✅ | `supabase v0.8.1` |

---

## 📚 Decisiones Técnicas y Lecciones Aprendidas

### Por qué descartamos `@modelcontextprotocol/server-github` (npm)

El paquete npm local fue **deprecated en abril 2025**. GitHub ahora provee un servidor remoto oficial
en `https://api.githubcopilot.com/mcp/` que siempre está actualizado y no requiere instalación.

### Por qué descartamos `npx @supabase/mcp-server-supabase`

Supabase migró a HTTP remoto en 2025. El método `npx` es legacy y no es el recomendado.

### Por qué Antigravity usa `serverUrl` y no `url`

Antigravity requiere específicamente el campo `"serverUrl"` para conexiones HTTP remotas.
Los campos `"url"` o `"httpUrl"` son ignorados silenciosamente, causando que el MCP no se conecte
sin mostrar error visible.

### Por qué usamos tokens Bearer en vez de OAuth interactivo

Los MCP servers de GitHub, Vercel y Supabase soportan OAuth 2.1, pero este flujo requiere
abrir un navegador para autenticarse. Para entornos de agentes de IA (como Antigravity),
el uso de tokens Bearer estáticos es más práctico y compatible.

---

## 🔄 Reproducción desde Cero (Checklist)

Para replicar esta configuración en un nuevo proyecto o máquina:

- [ ] 1. Generar GitHub PAT en https://github.com/settings/tokens/new?type=beta
- [ ] 2. Generar Vercel Token en https://vercel.com/account/tokens
- [ ] 3. Generar Supabase Token en https://supabase.com/dashboard/account/tokens
- [ ] 4. Editar `~/.gemini/antigravity/mcp_config.json` con el JSON de configuración
- [ ] 5. Reemplazar los 3 placeholders con los tokens reales
- [ ] 6. Reiniciar Antigravity
- [ ] 7. Ejecutar los prompts de validación
- [ ] 8. Marcar la tabla de estado como ✅

---

## 🚀 Recomendaciones para el Entorno de Desarrollo con IA

1. **Tokens de corta duración:** Usa 90 días y pon un recordatorio en tu calendario para renovarlos
2. **Un token por contexto:** Separa tokens de desarrollo, staging y producción
3. **No hardcodees en el repo:** Nunca commitees el `mcp_config.json` con tokens reales
4. **Revisa los permisos regularmente:** Audita cada 3 meses qué puede hacer el agente
5. **Documenta los cambios aquí:** Este archivo es la fuente de verdad
6. **Config local por proyecto:** Puedes crear `.agents/mcp_config.json` en la raíz del repo
   para sobreescribir la configuración global para ese proyecto específico
7. **Usa Supabase project-specific URL:** En Supabase Dashboard → Project Settings → MCP Connection
   puedes obtener una URL específica a tu proyecto para limitar el acceso del agente

---

## 📝 Historial de Cambios

| Fecha | Acción | Responsable | Resultado |
|-------|--------|-------------|-----------|
| 2026-06-27 | Investigación de MCP servers oficiales (GitHub, Vercel, Supabase) | Antigravity | ✅ |
| 2026-06-27 | Verificación del formato `mcp_config.json` de Antigravity | Antigravity | ✅ |
| 2026-06-27 | Creación de `AI_WORKSPACE_SETUP.md` | Antigravity | ✅ |
| 2026-06-27 | Configuración de `mcp_config.json` con 3 MCP servers | Antigravity | ✅ |
| 2026-06-27 | Validación de conectividad GitHub (`HTTP 200`) | Antigravity | ✅ |
| 2026-06-27 | Validación de conectividad Vercel (`HTTP 200`) | Antigravity | ✅ |
| 2026-06-27 | Validación de conectividad Supabase (`HTTP 200`) | Antigravity | ✅ |

---

*Generado por Google Antigravity 2.0 · Proyecto: Cantina Manager · 2026-06-27*
