import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function msg(e: unknown) { return e instanceof Error ? e.message : String(e); }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { code?: string; name?: string };
    const code = String(body?.code || "").trim().toUpperCase();
    const rawName = String(body?.name || "").trim();
    if (!code || !rawName) return NextResponse.json({ ok: false, error: "Missing code or name" }, { status: 400 });

    const name = rawName.replace(/\s+/g, " ").slice(0, 40);
    const nameFold = name.toLocaleLowerCase();

    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: true },
    });
    if (!game) return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });

    // anti-doublon (insensible à la casse)
    const exists = game.players.find(p => p.name.toLocaleLowerCase() === nameFold);
    if (exists) {
      return NextResponse.json({ ok: true, player: exists, duplicate: true });
    }

    const order = game.players.length ? Math.max(...game.players.map(p => p.order)) + 1 : 0;
    const player = await prisma.player.create({ data: { name, order, gameId: game.id } });

    return NextResponse.json({ ok: true, player });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }
}
