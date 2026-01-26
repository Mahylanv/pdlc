import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CATS = [
  { key: "tous",       name: "Tout le monde",      color: "#916D09" },
  { key: "un_joueur",  name: "Un joueur",          color: "#0C7A76" },
  { key: "vote",       name: "Vote",               color: "#583178" },
  { key: "tour",       name: "À tour de rôle",     color: "#783131" },
  { key: "mort_subite",name: "Mort subite",        color: "#3B3B3B" },
  { key: "regle",      name: "Règle",              color: "#267078" },
  { key: "qr",         name: "Question/Réponse",   color: "#5E1717" },
];

const CARDS = [
  {
    slug: "mois-naissance",
    text: "Bois autant de gorgées que le chiffre de ton mois de naissance.",
    level: 1,
    cats: ["tous"]
  },
  {
    slug: "enleve-vetement",
    text: "{player}, enlève un vêtement (chaussette = ok).",
    answerNote: "Bonus: si tu enlèves une chaussette, bois +1.",
    level: 2,
    cats: ["un_joueur"]
  },
  {
    slug: "capitales-asie",
    text: "À tour de rôle : citez des capitales d'Asie. Premier qui sèche boit 2.",
    level: 2,
    cats: ["tour","qr"]
  },
  {
    slug: "cultureg-flash",
    text: "{player}, Culture G : quelle est la capitale de la Croatie ?",
    answer: "Zagreb",
    level: 2,
    cats: ["qr","un_joueur"]
  },
  {
    slug: "regle-oui-interdit",
    text: "RÈGLE : interdit de dire « oui » pendant 3 tours. Chaque « oui » = 1 gorgée.",
    level: 1,
    cats: ["regle"]
  },
];

async function main() {
  // upsert catégories
  for (const c of CATS) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: { name: c.name, color: c.color },
      create: c,
    });
  }

  // dictionnaire cat by key
  const catMap = Object.fromEntries(
    (await prisma.category.findMany()).map(c => [c.key, c])
  );

  for (const c of CARDS) {
    await prisma.card.upsert({
      where: { slug: c.slug },
      update: {
        text: c.text,
        level: c.level,
        answer: (c as any).answer ?? null,
        answerNote: (c as any).answerNote ?? null,
        categories: {
          set: [],
          connect: c.cats.map((k: string) => ({ id: catMap[k].id })),
        },
      },
      create: {
        slug: c.slug,
        text: c.text,
        level: c.level,
        answer: (c as any).answer ?? null,
        answerNote: (c as any).answerNote ?? null,
        categories: {
          connect: c.cats.map((k: string) => ({ id: catMap[k].id })),
        },
      },
    });
  }

  console.log("Seed OK: categories + demo cards.");
}

main().finally(() => prisma.$disconnect());
