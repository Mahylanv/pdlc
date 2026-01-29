import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DRAFT_TTL_MINUTES = 30;

export async function POST() {
  try {
    const cutoff = new Date(Date.now() - DRAFT_TTL_MINUTES * 60_000);
    const result = await prisma.game.deleteMany({
      where: {
        isDraft: true,
        createdAt: { lt: cutoff },
      },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
