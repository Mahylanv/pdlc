import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { renderCardText } from "@/lib/prompts";

const DEFAULT_MAX_ROUNDS = 30;
const ALLOWED_ROUNDS = new Set([30, 50, 75, 100]);

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String((body as any)?.code || "").trim().toUpperCase();
    const cats = Array.isArray((body as any)?.categories) ? (body as any).categories as string[] : [];
    const requestedRounds = Number((body as any)?.rounds ?? DEFAULT_MAX_ROUNDS);
    const maxRounds = ALLOWED_ROUNDS.has(requestedRounds) ? requestedRounds : DEFAULT_MAX_ROUNDS;
    if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

    const game = await prisma.game.findUnique({
      where: { code },
      include: { players: { orderBy: { order: "asc" } } },
    });
    if (!game) return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });
    if (game.players.length === 0) return NextResponse.json({ ok: false, error: "Add at least one player" }, { status: 400 });
    if (game.isDraft) {
      await prisma.game.update({ where: { id: game.id }, data: { isDraft: false } });
    }

    const playedCount = await prisma.round.count({ where: { gameId: game.id } });
    if (playedCount >= maxRounds) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: maxRounds, remaining: 0 });
    }

    const playedChains = await prisma.round.findMany({
      where: { gameId: game.id },
      select: { card: { select: { chainGroup: true, chainOrder: true } } },
    });
    const activeChainGroups = Array.from(
      new Set(
        playedChains
          .map((r) => r.card)
          .filter((c) => c.chainGroup && (c.chainOrder ?? 0) <= 1)
          .map((c) => c.chainGroup as string)
      )
    );

    const catFilter = cats.length ? cats : null;
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT c.id
      FROM "Card" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "Round" r
        WHERE r."gameId" = ${game.id} AND r."cardId" = c.id
      )
      AND (
        c."chainOrder" IS NULL
        OR c."chainOrder" <= 1
        ${activeChainGroups.length ? Prisma.sql`OR (
          c."chainOrder" > 1
          AND c."chainGroup" = ANY(${activeChainGroups})
        )` : Prisma.empty}
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
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: maxRounds, remaining: 0 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { categories: true },
    });
    if (!card) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: maxRounds, remaining: 0 });
    }

    const rendered = renderCardText(card.text, game.players);

    let dynamicAnswer: { answer?: string | null; answerNote?: string | null } = {};
    if (card.chainGroup && card.chainOrder === 1) {
      const options = await prisma.card.findMany({
        where: { chainGroup: card.chainGroup, chainOrder: { gt: 1 } },
        select: { text: true, answerNote: true, chainOrder: true },
      });
      if (options.length > 0) {
        const pick = card.chainGroup === "chaussettes"
          ? options.sort((a, b) => (a.chainOrder ?? 0) - (b.chainOrder ?? 0))[0]
          : options[Math.floor(Math.random() * options.length)];
        dynamicAnswer = {
          answer: renderCardText(pick.text, game.players),
          answerNote: pick.answerNote ? renderCardText(pick.answerNote, game.players) : null,
        };
      }
    }

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
    const remainingByLimit = Math.max(0, maxRounds - newPlayed);
    const finished = remainingByLimit === 0;
    const remaining = finished ? 0 : remainingByLimit;

    return NextResponse.json({
      ok: true,
      finished,
      played: newPlayed,
      total: maxRounds,
      remaining,
      card: {
        id: card.id,
        slug: card.slug,
        text: rendered,
        level: card.level,
        answer: dynamicAnswer.answer ?? (card.answer ? renderCardText(card.answer, game.players) : null),
        answerNote: dynamicAnswer.answerNote ?? (card.answerNote ? renderCardText(card.answerNote, game.players) : null),
        categories: card.categories.map(c => ({ key: c.key, name: c.name, color: c.color })),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 400 });
  }
}
