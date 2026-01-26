// prisma/import-cards.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

// Utiliser l'URL directe Neon si présente
process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

type CardIn = {
  slug: string;
  text: string;
  level?: number;
  categories?: string[];   // ex: ["mort_subite","tour"]
  answer?: string | null;
  answerNote?: string | null;
  chainGroup?: string | null;
  chainOrder?: number | null;
};

function normalizeCategoryKey(raw: string) {
  const base = raw.trim().toLowerCase();
  const noDiacritics = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const slug = noDiacritics.replace(/[\s-]+/g, "_");
  if (slug === "regles") return "regle";
  if (slug === "1_joueur") return "un_joueur";
  return slug;
}

async function importFile(jsonPath: string) {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const items = JSON.parse(raw) as CardIn[];

  // Récupère toutes les catégories une fois pour un mapping par key
  const cats = await prisma.category.findMany();
  const byKey = new Map(cats.map(c => [c.key, c.id]));

  let created = 0, updated = 0, skipped = 0;

  for (const c of items) {
    if (!c.slug || !c.text) { skipped++; continue; }

    const connect = (c.categories ?? [])
      .map((k) => byKey.get(normalizeCategoryKey(k)))
      .filter(Boolean)
      .map(id => ({ id: id as string }));

    const existing = await prisma.card.findUnique({ where: { slug: c.slug } });

    if (existing) {
      await prisma.card.update({
        where: { slug: c.slug },
        data: {
          text: c.text,
          level: c.level ?? existing.level ?? 1,
          answer: c.answer ?? null,
          answerNote: c.answerNote ?? null,
          chainGroup: c.chainGroup ?? null,
          chainOrder: c.chainOrder ?? null,
          // on remplace l’affectation des catégories
          categories: { set: [], connect },
        },
      });
      updated++;
    } else {
      await prisma.card.create({
        data: {
          slug: c.slug,
          text: c.text,
          level: c.level ?? 1,
          answer: c.answer ?? null,
          answerNote: c.answerNote ?? null,
          chainGroup: c.chainGroup ?? null,
          chainOrder: c.chainOrder ?? null,
          categories: { connect },
        },
      });
      created++;
    }
  }

  console.log(`Import terminé: ${created} créées, ${updated} mises à jour, ${skipped} ignorées.`);
}

async function main() {
  const json = process.argv[2];
  if (!json) throw new Error("Usage: tsx prisma/import-cards.ts <chemin JSON>");

  await importFile(json);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
