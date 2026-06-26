import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ALLOWED_CATEGORIES = [
  "CERVEZA",
  "BOTANA",
  "REFRESCO",
  "MIX",
  "SERVICIO",
  "OTROS",
] as const;

type Category = (typeof ALLOWED_CATEGORIES)[number];

function isValidCategory(value: string | null | undefined): value is Category {
  return !!value && (ALLOWED_CATEGORIES as readonly string[]).includes(value);
}

type Params = { params: Promise<{ id: string }> };

// GET /api/products/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("[GET /api/products/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener el producto" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Nombre
    const name =
      typeof body.name === "string" ? body.name.trim() : existing.name;
    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // Unicidad del nombre (si cambia)
    if (name !== existing.name) {
      const duplicate = await db.product.findUnique({ where: { name } });
      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe un producto con el nombre "${name}"` },
          { status: 409 }
        );
      }
    }

    const category = isValidCategory(body.category)
      ? body.category
      : existing.category;

    const presentation =
      typeof body.presentation === "string"
        ? body.presentation.trim() || null
        : existing.presentation;

    const purchasePrice =
      typeof body.purchasePrice === "number" && !isNaN(body.purchasePrice)
        ? body.purchasePrice
        : existing.purchasePrice;

    const salePrice =
      typeof body.salePrice === "number" && !isNaN(body.salePrice)
        ? body.salePrice
        : existing.salePrice;

    const active =
      typeof body.active === "boolean" ? body.active : existing.active;

    const sortOrder =
      typeof body.sortOrder === "number" && !isNaN(body.sortOrder)
        ? body.sortOrder
        : existing.sortOrder;

    const updated = await db.product.update({
      where: { id },
      data: {
        name,
        category,
        presentation,
        purchasePrice,
        salePrice,
        active,
        sortOrder,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/products/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el producto" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id]
// Hard delete. Si el producto tiene ventas/inventario/fichas relacionadas,
// se retorna 409 para evitar romper la integridad referencial.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar dependencias antes de borrar para dar mensaje claro
    const [salesCount, inventoryCount, tokenSalesCount] = await Promise.all([
      db.sale.count({ where: { productId: id } }),
      db.dailyInventory.count({ where: { productId: id } }),
      db.tokenSale.count({ where: { productId: id } }),
    ]);

    if (salesCount > 0 || inventoryCount > 0 || tokenSalesCount > 0) {
      const details: string[] = [];
      if (salesCount > 0) details.push(`${salesCount} venta(s)`);
      if (inventoryCount > 0)
        details.push(`${inventoryCount} registro(s) de inventario`);
      if (tokenSalesCount > 0)
        details.push(`${tokenSalesCount} venta(s) de fichas`);
      return NextResponse.json(
        {
          error: `No se puede eliminar: el producto tiene registros relacionados (${details.join(
            ", "
          )}). Desactiva el producto en su lugar.`,
        },
        { status: 409 }
      );
    }

    await db.product.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/products/[id]] Error:", error);
    // Salvaguarda: si llegara a ocurrir una violacion de FK por concurrencia
    return NextResponse.json(
      {
        error:
          "No se puede eliminar: el producto tiene registros relacionados.",
      },
      { status: 409 }
    );
  }
}
