import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const count = await db.product.count();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      products: count,
      env_db: process.env.DATABASE_URL?.substring(0, 60) + "...",
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({
      status: "error",
      message: err.message,
      name: err.name,
      env_db: process.env.DATABASE_URL?.substring(0, 60) + "...",
    }, { status: 500 });
  }
}