import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type BatchItem = {
  productId?: string;
  saleType?: string;
  quantity?: number;
  isComplimentary?: boolean;
  staffId?: string | null;
  // date es opcional por item; si la peticion trae `date` global se usa esa
  date?: string;
};

type BatchBody = {
  date?: string;
  items?: BatchItem[];
};

// POST /api/sales/batch
// Acepta:
//   - { date: "YYYY-MM-DD", items: [{productId, saleType, quantity, isComplimentary, staffId?}] }
//   - o un array de items donde cada uno trae su propia `date`
//
// Para cada item:
//   - Usa los precios actuales del producto para unitPrice y purchasePrice
//   - Si quantity > 0: hace upsert (busca por fecha + producto + saleType + staffId)
//   - Si quantity == 0: elimina el registro existente (si lo hay)
// Devuelve los registros creados/actualizados y los eliminados.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Normalizar a { date, items }
    let globalDate: string | undefined;
    let items: BatchItem[] = [];

    if (Array.isArray(body)) {
      items = body as BatchItem[];
    } else if (body && typeof body === "object") {
      const b = body as BatchBody;
      globalDate = typeof b.date === "string" ? b.date : undefined;
      items = Array.isArray(b.items) ? b.items : [];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No hay items para procesar" },
        { status: 400 }
      );
    }

    if (!globalDate) {
      // Necesitamos al menos un item con fecha para inferir globalDate
      const withDate = items.find((i) => typeof i.date === "string" && i.date);
      if (withDate?.date) {
        globalDate = withDate.date;
      } else {
        // usar hoy como fallback
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        globalDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    // Parsear fecha global a mediodia (evita problemas de TZ)
    const dateObj = new Date(globalDate + "T12:00:00");
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: "Fecha invalida" },
        { status: 400 }
      );
    }

    // Rango del dia para buscar ventas existentes
    const dayStart = new Date(dateObj);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateObj);
    dayEnd.setHours(23, 59, 59, 999);

    // Recolectar IDs unicos de productos y staff
    const productIds = new Set<string>();
    const staffIds = new Set<string>();
    for (const item of items) {
      if (typeof item.productId === "string" && item.productId) {
        productIds.add(item.productId);
      }
      if (typeof item.staffId === "string" && item.staffId) {
        staffIds.add(item.staffId);
      }
    }

    // Cargar productos y staff en paralelo (mapas para acceso rapido)
    const [products, staffList, existingSales] = await Promise.all([
      db.product.findMany({
        where: { id: { in: Array.from(productIds) } },
      }),
      db.staff.findMany({
        where: { id: { in: Array.from(staffIds) } },
      }),
      db.sale.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          productId: { in: Array.from(productIds) },
        },
        include: { product: true, staff: true },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    // Mapa de ventas existentes por clave compuesta
    // PUBLICO: date|productId|PUBLICO|null
    // PERSONAL: date|productId|PERSONAL|staffId
    const existingMap = new Map<string, (typeof existingSales)[number]>();
    for (const s of existingSales) {
      const key = `${s.productId}|${s.saleType}|${s.staffId ?? ""}`;
      // Si hay duplicados previos (no deberia), quedarse con el mas reciente
      if (!existingMap.has(key)) existingMap.set(key, s);
    }

    type ResultEntry =
      | {
          action: "created" | "updated";
          productId: string;
          saleType: string;
          staffId: string | null;
          quantity: number;
          total: number;
          sale: (typeof existingSales)[number];
        }
      | {
          action: "deleted";
          productId: string;
          saleType: string;
          staffId: string | null;
        }
      | {
          action: "skipped";
          productId: string;
          saleType: string;
          staffId: string | null;
          reason: string;
        };

    const results: ResultEntry[] = [];
    const createdOrUpdatedRecords: (typeof existingSales)[number][] = [];

    for (const item of items) {
      const productId = item.productId;
      if (!productId) {
        results.push({
          action: "skipped",
          productId: "",
          saleType: item.saleType ?? "PUBLICO",
          staffId: item.staffId ?? null,
          reason: "Sin productId",
        });
        continue;
      }
      const product = productMap.get(productId);
      if (!product) {
        results.push({
          action: "skipped",
          productId,
          saleType: item.saleType ?? "PUBLICO",
          staffId: item.staffId ?? null,
          reason: "Producto no encontrado",
        });
        continue;
      }

      const saleType =
        item.saleType === "PERSONAL" ? "PERSONAL" : "PUBLICO";

      let staffId: string | null = null;
      if (saleType === "PERSONAL") {
        const sid =
          typeof item.staffId === "string" ? item.staffId : "";
        if (!sid || !staffMap.has(sid)) {
          results.push({
            action: "skipped",
            productId,
            saleType,
            staffId: sid || null,
            reason: "Staff invalido o faltante",
          });
          continue;
        }
        staffId = sid;
      }

      const quantity =
        typeof item.quantity === "number" && !isNaN(item.quantity)
          ? Math.max(0, Math.floor(item.quantity))
          : 0;

      const isComplimentary = Boolean(item.isComplimentary);

      const key = `${productId}|${saleType}|${staffId ?? ""}`;
      const existing = existingMap.get(key);

      const unitPrice = product.salePrice;
      const purchasePrice = product.purchasePrice;
      const total = isComplimentary ? 0 : quantity * unitPrice;

      if (quantity === 0) {
        if (existing) {
          await db.sale.delete({ where: { id: existing.id } });
          existingMap.delete(key);
          results.push({
            action: "deleted",
            productId,
            saleType,
            staffId,
          });
        } else {
          // Nada que hacer
        }
        continue;
      }

      if (existing) {
        const updated = await db.sale.update({
          where: { id: existing.id },
          data: {
            quantity,
            unitPrice,
            purchasePrice,
            total,
            isComplimentary,
          },
          include: { product: true, staff: true },
        });
        existingMap.set(key, updated);
        createdOrUpdatedRecords.push(updated);
        results.push({
          action: "updated",
          productId,
          saleType,
          staffId,
          quantity,
          total,
          sale: updated,
        });
      } else {
        const created = await db.sale.create({
          data: {
            date: dateObj,
            productId,
            saleType,
            staffId,
            quantity,
            unitPrice,
            purchasePrice,
            total,
            isComplimentary,
          },
          include: { product: true, staff: true },
        });
        existingMap.set(key, created);
        createdOrUpdatedRecords.push(created);
        results.push({
          action: "created",
          productId,
          saleType,
          staffId,
          quantity,
          total,
          sale: created,
        });
      }
    }

    return NextResponse.json(
      {
        date: globalDate,
        results,
        records: createdOrUpdatedRecords,
        summary: {
          created: results.filter((r) => r.action === "created").length,
          updated: results.filter((r) => r.action === "updated").length,
          deleted: results.filter((r) => r.action === "deleted").length,
          skipped: results.filter((r) => r.action === "skipped").length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/sales/batch]", error);
    return NextResponse.json(
      { error: "Error al procesar el lote de ventas" },
      { status: 500 }
    );
  }
}
