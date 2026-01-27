import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function msg(e: unknown) { return e instanceof Error ? e.message : String(e); }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { code?: string; id?: string };
    const code = String(body?.code || "").trim().toUpperCase();
    const id = String(body?.id || "").trim();
    if (!code || !id) return NextResponse.json({ ok: false, error: "Missing code or id" }, { status: 400 });

    const game = await prisma.game.findUnique({ where: { code } });
    if (!game) return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.player.deleteMany({ where: { id, gameId: game.id } });
      const remaining = await tx.player.findMany({
        where: { gameId: game.id },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      // reindex
      await Promise.all(remaining.map((p, idx) =>
        tx.player.update({ where: { id: p.id }, data: { order: idx } })
      ));
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }
}
