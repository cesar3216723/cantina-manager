import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/staff?active=true
// Lista todo el personal ordenado por sortOrder asc
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeParam = searchParams.get("active");

    const where: { active?: boolean } = {};
    if (activeParam === "true") {
      where.active = true;
    } else if (activeParam === "false") {
      where.active = false;
    }

    const staff = await db.staff.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("[GET /api/staff] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener el personal" },
      { status: 500 }
    );
  }
}

// POST /api/staff
// Crea un nuevo miembro del personal
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

    const salary =
      typeof body.salary === "number" && !isNaN(body.salary)
        ? body.salary
        : 0;
    const active = typeof body.active === "boolean" ? body.active : true;
    const sortOrder =
      typeof body.sortOrder === "number" && !isNaN(body.sortOrder)
        ? body.sortOrder
        : 0;

    // Validar unicidad del nombre
    const existing = await db.staff.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un miembro del personal con el nombre "${name}"` },
        { status: 409 }
      );
    }

    const tokenCommissionType =
      typeof body.tokenCommissionType === "string"
        ? body.tokenCommissionType
        : "DYNAMIC";
    const tokenCommissionValue =
      typeof body.tokenCommissionValue === "number" &&
      !isNaN(body.tokenCommissionValue)
        ? body.tokenCommissionValue
        : 60;

    const staff = await db.staff.create({
      data: {
        name,
        salary,
        tokenCommissionType,
        tokenCommissionValue,
        active,
        sortOrder,
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error("[POST /api/staff] Error:", error);
    return NextResponse.json(
      { error: "Error al crear el personal" },
      { status: 500 }
    );
  }
}
