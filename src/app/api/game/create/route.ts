import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function genCode(len = 5) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function uniqueCode() {
  for (let k = 0; k < 10; k++) {
    const code = genCode();
    const exists = await prisma.game.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error("Cannot generate unique code");
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const inputPlayers: { name: string }[] = Array.isArray((body as any)?.players) ? (body as any).players : [];
    const code =
      (typeof (body as any)?.code === "string" && (body as any).code.trim().toUpperCase()) ||
      (await uniqueCode());

    const game = await prisma.game.create({
      data: {
        code,
        players: { create: inputPlayers.map((p, idx) => ({ name: p.name.slice(0, 40), order: idx })) },
      },
      include: { players: true },
    });

    return NextResponse.json({ ok: true, game: { id: game.id, code: game.code, players: game.players } }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 400 });
  }
}
