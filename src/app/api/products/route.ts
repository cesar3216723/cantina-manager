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

// GET /api/products?category=XXX&active=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const activeParam = searchParams.get("active");

    const where: {
      category?: string;
      active?: boolean;
    } = {};

    if (category && category !== "ALL" && isValidCategory(category)) {
      where.category = category;
    }

    if (activeParam === "true") {
      where.active = true;
    } else if (activeParam === "false") {
      where.active = false;
    }

    const products = await db.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[GET /api/products] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener los productos" },
      { status: 500 }
    );
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const category = isValidCategory(body.category)
      ? body.category
      : "OTROS";

    const presentation =
      typeof body.presentation === "string" && body.presentation.trim()
        ? body.presentation.trim()
        : null;

    const purchasePrice =
      typeof body.purchasePrice === "number" && !isNaN(body.purchasePrice)
        ? body.purchasePrice
        : 0;
    const salePrice =
      typeof body.salePrice === "number" && !isNaN(body.salePrice)
        ? body.salePrice
        : 0;
    const active =
      typeof body.active === "boolean" ? body.active : true;
    const sortOrder =
      typeof body.sortOrder === "number" && !isNaN(body.sortOrder)
        ? body.sortOrder
        : 0;

    // Validar unicidad del nombre
    const existing = await db.product.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un producto con el nombre "${name}"` },
        { status: 409 }
      );
    }

    const product = await db.product.create({
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

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products] Error:", error);
    return NextResponse.json(
      { error: "Error al crear el producto" },
      { status: 500 }
    );
  }
}
