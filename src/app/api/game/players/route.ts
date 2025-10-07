import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function msg(e: unknown) { return e instanceof Error ? e.message : String(e); }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = String(searchParams.get("code") || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: { orderBy: { order: "asc" } } },
    });
    if (!game) return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });

    return NextResponse.json({ ok: true, players: game.players });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }
}
