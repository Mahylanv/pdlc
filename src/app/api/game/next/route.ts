import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { renderCardText } from "@/lib/prompts";

const MAX_ROUNDS = 30;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String((body as any)?.code || "").trim().toUpperCase();
    const cats = Array.isArray((body as any)?.categories) ? (body as any).categories as string[] : [];
    if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: { orderBy: { order: "asc" } } },
    });
    if (!game) return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });
    if (game.players.length === 0) return NextResponse.json({ ok: false, error: "Add at least one player" }, { status: 400 });

    const playedCount = await prisma.round.count({ where: { gameId: game.id } });
    if (playedCount >= MAX_ROUNDS) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: MAX_ROUNDS, remaining: 0 });
    }

    const catFilter = cats.length ? cats : null;
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT c.id
      FROM "Card" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "Round" r
        WHERE r."gameId" = ${game.id} AND r."cardId" = c.id
      )
      ${catFilter ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "_CardToCategory" cc
        JOIN "Category" cat ON cat.id = cc."B"
        WHERE cc."A" = c.id AND cat.key = ANY(${catFilter})
      )` : Prisma.empty}
      ORDER BY random()
      LIMIT 1
    `);

    const cardId = rows[0]?.id;
    if (!cardId) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: MAX_ROUNDS, remaining: 0 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { categories: true },
    });
    if (!card) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: MAX_ROUNDS, remaining: 0 });
    }

    const rendered = renderCardText(card.text, game.players);

    await prisma.round.create({
      data: {
        gameId: game.id,
        cardId: card.id,
        payload: {
          cardText: card.text,
          rendered,
          players: game.players.map(p => ({ id: p.id, name: p.name })),
          categories: card.categories.map(c => ({ key: c.key, name: c.name, color: c.color })),
        },
      },
    });

    const newPlayed = playedCount + 1;
    const remainingByLimit = Math.max(0, MAX_ROUNDS - newPlayed);
    const finished = remainingByLimit === 0;
    const remaining = finished ? 0 : remainingByLimit;

    return NextResponse.json({
      ok: true,
      finished,
      played: newPlayed,
      total: MAX_ROUNDS,
      remaining,
      card: {
        id: card.id,
        slug: card.slug,
        text: rendered,
        level: card.level,
        answer: card.answer ?? null,
        answerNote: card.answerNote ?? null,
        categories: card.categories.map(c => ({ key: c.key, name: c.name, color: c.color })),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 400 });
  }
}
