import { NextResponse } from "next/server";
import { pgPool } from "@/lib/pg";
import { renderCardText } from "@/lib/prompts";
import { randomUUID } from "crypto";

const DEFAULT_MAX_ROUNDS = 30;
const ALLOWED_ROUNDS = new Set([30, 50, 75, 100]);
const MAX_BATCH = 20;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function POST(req: Request) {
  const client = await pgPool.connect();
  try {
    const body = await req.json().catch(() => ({}));
    const code = String((body as any)?.code || "").trim().toUpperCase();
    const cats = Array.isArray((body as any)?.categories) ? (body as any).categories as string[] : [];
    const requestedRounds = Number((body as any)?.rounds ?? DEFAULT_MAX_ROUNDS);
    const maxRounds = ALLOWED_ROUNDS.has(requestedRounds) ? requestedRounds : DEFAULT_MAX_ROUNDS;
    const requestedBatch = Number((body as any)?.batchSize ?? 6);
    const batchSize = Math.max(1, Math.min(MAX_BATCH, requestedBatch));
    if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

    const gameRes = await client.query(
      `SELECT g.id, g.code, g."isDraft", g."draftKey"
       FROM "Game" g
       WHERE g.code = $1
       LIMIT 1`,
      [code]
    );
    if (gameRes.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });
    }
    const game = gameRes.rows[0];

    const playersRes = await client.query(
      `SELECT id, name, "order"
       FROM "Player"
       WHERE "gameId" = $1
       ORDER BY "order" ASC`,
      [game.id]
    );
    if (playersRes.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Add at least one player" }, { status: 400 });
    }

    if (game.isDraft) {
      await client.query(
        `UPDATE "Game" SET "isDraft" = FALSE WHERE id = $1`,
        [game.id]
      );
    }

    const playedCountRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM "Round" WHERE "gameId" = $1`,
      [game.id]
    );
    let playedCount = playedCountRes.rows[0].count as number;
    if (playedCount >= maxRounds) {
      return NextResponse.json({ ok: true, finished: true, played: playedCount, total: maxRounds, remaining: 0, cards: [] });
    }

    const chainRes = await client.query(
      `SELECT c."chainGroup"
       FROM "Round" r
       JOIN "Card" c ON c.id = r."cardId"
       WHERE r."gameId" = $1
         AND c."chainGroup" IS NOT NULL
         AND COALESCE(c."chainOrder", 0) <= 1`,
      [game.id]
    );
    const activeChainGroups = new Set<string>(
      chainRes.rows.map((r: { chainGroup: string }) => r.chainGroup)
    );

    const results: any[] = [];
    const catsArr = cats.length ? cats : null;

    for (let i = 0; i < batchSize; i++) {
      if (playedCount >= maxRounds) break;

      let idx = 2;
      const params: any[] = [game.id];
      const chainClause = activeChainGroups.size
        ? `OR (c."chainOrder" > 1 AND c."chainGroup" = ANY($${idx++}))`
        : ``;
      if (activeChainGroups.size) params.push(Array.from(activeChainGroups));
      const catsClause = catsArr
        ? `AND EXISTS (
           SELECT 1 FROM "_CardToCategory" cc
           JOIN "Category" cat ON cat.id = cc."B"
           WHERE cc."A" = c.id AND cat.key = ANY($${idx++})
         )`
        : ``;
      if (catsArr) params.push(catsArr);

      const cardRes = await client.query(
        `SELECT c.id, c.slug, c.text, c.level, c.answer, c."answerNote", c."chainGroup", c."chainOrder"
         FROM "Card" c
         WHERE NOT EXISTS (
           SELECT 1 FROM "Round" r
           WHERE r."gameId" = $1 AND r."cardId" = c.id
         )
         AND (
           c."chainOrder" IS NULL
           OR c."chainOrder" <= 1
           ${chainClause}
         )
         ${catsClause}
         ORDER BY random()
         LIMIT 1`,
        params
      );
      if (cardRes.rowCount === 0) break;
      const card = cardRes.rows[0];

      const catRes = await client.query(
        `SELECT cat.key, cat.name, cat.color
         FROM "_CardToCategory" cc
         JOIN "Category" cat ON cat.id = cc."B"
         WHERE cc."A" = $1`,
        [card.id]
      );
      const categories = catRes.rows.map(
        (c: { key: string; name: string; color: string }) => ({
          key: c.key,
          name: c.name,
          color: c.color,
        })
      );

      const rendered = renderCardText(card.text, playersRes.rows);

      let dynamicAnswer: { answer?: string | null; answerNote?: string | null } = {};
      if (card.chainGroup && card.chainOrder === 1) {
        const optsRes = await client.query(
          `SELECT text, "answerNote", "chainOrder"
           FROM "Card"
           WHERE "chainGroup" = $1 AND "chainOrder" > 1`,
          [card.chainGroup]
        );
        if ((optsRes.rowCount ?? 0) > 0) {
          const options = optsRes.rows as { text: string; answerNote?: string | null; chainOrder?: number | null }[];
          const pick = card.chainGroup === "chaussettes"
            ? options.sort((a, b) => (a.chainOrder ?? 0) - (b.chainOrder ?? 0))[0]
            : options[Math.floor(Math.random() * options.length)];
          dynamicAnswer = {
            answer: renderCardText(pick.text, playersRes.rows),
            answerNote: pick.answerNote ? renderCardText(pick.answerNote, playersRes.rows) : null,
          };
        }
      }

      await client.query(
        `INSERT INTO "Round" ("id","gameId","cardId","payload","createdAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          randomUUID(),
          game.id,
          card.id,
          {
            cardText: card.text,
            rendered,
            players: (playersRes.rows as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name })),
            categories,
          },
        ]
      );

      if (card.chainGroup && (card.chainOrder ?? 0) <= 1) {
        activeChainGroups.add(card.chainGroup);
      }

      playedCount += 1;
      const remainingByLimit = Math.max(0, maxRounds - playedCount);
      const finished = remainingByLimit === 0;

      results.push({
        played: playedCount,
        total: maxRounds,
        remaining: remainingByLimit,
        finished,
        card: {
          id: card.id,
          slug: card.slug,
          text: rendered,
          level: card.level,
          answer: dynamicAnswer.answer ?? (card.answer ? renderCardText(card.answer, playersRes.rows) : null),
          answerNote: dynamicAnswer.answerNote ?? (card.answerNote ? renderCardText(card.answerNote, playersRes.rows) : null),
          categories,
        },
      });
      if (finished) break;
    }

    const remaining = Math.max(0, maxRounds - playedCount);
    return NextResponse.json({
      ok: true,
      finished: remaining === 0,
      played: playedCount,
      total: maxRounds,
      remaining,
      cards: results,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 400 });
  } finally {
    client.release();
  }
}
