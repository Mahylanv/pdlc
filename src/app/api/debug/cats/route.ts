import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALL_CATEGORIES } from "@/lib/categories";
export const dynamic = "force-dynamic";
export async function GET() {
  const catsDb = await prisma.category.findMany({
    orderBy: { key: "asc" },
    include: { _count: { select: { cards: true } } }
  });
  return NextResponse.json({
    uiKeys: ALL_CATEGORIES.map(c => c.key),
    db: catsDb.map(c => ({ key: c.key, cards: c._count.cards }))
  });
}
