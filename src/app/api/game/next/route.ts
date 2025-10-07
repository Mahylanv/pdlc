import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderCardText } from "@/lib/prompts";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String((body as any)?.code || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: { orderBy: { order: "asc" } } },
    });
    if (!game) return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });
    if (game.players.length === 0) return NextResponse.json({ ok: false, error: "Add at least one player" }, { status: 400 });

    const count = await prisma.card.count();
    if (count === 0) return NextResponse.json({ ok: false, error: "No cards in DB" }, { status: 400 });
    const skip = Math.floor(Math.random() * count);
    const card = await prisma.card.findFirst({ skip, take: 1 });
    if (!card) return NextResponse.json({ ok: false, error: "Card not found" }, { status: 500 });

    const rendered = renderCardText(card.text, game.players);

    const round = await prisma.round.create({
      data: {
        gameId: game.id,
        cardId: card.id,
        payload: {
          cardText: card.text,
          rendered,
          players: game.players.map((p) => ({ id: p.id, name: p.name })),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      card: { id: card.id, slug: card.slug, text: rendered, level: card.level },
      roundId: round.id,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 400 });
  }
}
