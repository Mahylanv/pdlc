import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderCardText } from "@/lib/prompts";

const MAX_ROUNDS = 30;

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

    // Progression actuelle
    const playedCount = await prisma.round.count({ where: { gameId: game.id } });
    if (playedCount >= MAX_ROUNDS) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: MAX_ROUNDS, remaining: 0 });
    }

    // Exclure les cartes déjà jouées
    const used = await prisma.round.findMany({
      where: { gameId: game.id },
      select: { cardId: true },
    });
    const usedIds = used.map(u => u.cardId);

    const remainingCount = await prisma.card.count({
      where: usedIds.length ? { id: { notIn: usedIds } } : {},
    });

    if (remainingCount === 0) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: MAX_ROUNDS, remaining: 0 });
    }

    // Tirage aléatoire parmi les restantes (sans réduire artificiellement avec MAX_ROUNDS ici)
    const skip = Math.floor(Math.random() * remainingCount);
    const card = await prisma.card.findFirst({
      where: usedIds.length ? { id: { notIn: usedIds } } : {},
      skip,
      take: 1,
    });
    if (!card) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: MAX_ROUNDS, remaining: 0 });
    }

    const rendered = renderCardText(card.text, game.players);

    const round = await prisma.round.create({
      data: {
        gameId: game.id,
        cardId: card.id,
        payload: {
          cardText: card.text,
          rendered,
          players: game.players.map(p => ({ id: p.id, name: p.name })),
        },
      },
    });

    // === Nouveau calcul "fin de partie" après le tirage ===
    const newPlayed = playedCount + 1;
    const remainingInDeck = Math.max(0, remainingCount - 1);   // ce qu'il reste dans le deck après cette pioche
    const remainingByLimit = Math.max(0, MAX_ROUNDS - newPlayed); // ce qu'il reste avant la limite 30
    const remaining = Math.min(remainingInDeck, remainingByLimit);
    const finished = remaining === 0;

    return NextResponse.json({
      ok: true,
      finished,
      played: newPlayed,
      total: MAX_ROUNDS,
      remaining,
      card: { id: card.id, slug: card.slug, text: rendered, level: card.level },
      roundId: round.id,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 400 });
  }
}
