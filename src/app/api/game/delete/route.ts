import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function msg(e: unknown) { return e instanceof Error ? e.message : String(e); }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { code?: string };
    const code = String(body?.code || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

    // onDelete: Cascade sur les relations Round/Player -> Game
    await prisma.game.deleteMany({ where: { code } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }
}
