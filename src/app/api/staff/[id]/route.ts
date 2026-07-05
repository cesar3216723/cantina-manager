import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/staff/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const staff = await db.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Personal no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("[GET /api/staff/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener el personal" },
      { status: 500 }
    );
  }
}

// PUT /api/staff/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Personal no encontrado" },
        { status: 404 }
      );
    }

    const data: {
      name?: string;
      salary?: number;
      tokenCommissionType?: string;
      tokenCommissionValue?: number;
      active?: boolean;
      sortOrder?: number;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      const name = body.name.trim();
      // Verificar unicidad si el nombre cambia
      if (name !== existing.name) {
        const dup = await db.staff.findUnique({ where: { name } });
        if (dup) {
          return NextResponse.json(
            {
              error: `Ya existe un miembro del personal con el nombre "${name}"`,
            },
            { status: 409 }
          );
        }
      }
      data.name = name;
    }

    if (typeof body.salary === "number" && !isNaN(body.salary)) {
      data.salary = body.salary;
    }
    if (typeof body.tokenCommissionType === "string") {
      data.tokenCommissionType = body.tokenCommissionType;
    }
    if (typeof body.tokenCommissionValue === "number" && !isNaN(body.tokenCommissionValue)) {
      data.tokenCommissionValue = body.tokenCommissionValue;
    }
    if (typeof body.active === "boolean") {
      data.active = body.active;
    }
    if (typeof body.sortOrder === "number" && !isNaN(body.sortOrder)) {
      data.sortOrder = body.sortOrder;
    }

    const updated = await db.staff.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/staff/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el personal" },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[id]
// Eliminacion dura; captura errores de foreign key y devuelve 409
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Personal no encontrado" },
        { status: 404 }
      );
    }

    await db.staff.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/staff/[id]] Error:", error);

    // Capturar errores de foreign key (registros relacionados)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el personal porque tiene ventas, fichas o pagos asociados. Desactiva el registro en su lugar.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Error al eliminar el personal" },
      { status: 500 }
    );
  }
}
