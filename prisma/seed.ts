import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cards = [
    { slug: "cheers-1", text: "{player} boit 1 gorgée.", level: 1 },
    { slug: "duo-1", text: "{player} et {other} trinquent et boivent 1 gorgée.", level: 1 },
    { slug: "rule-1", text: "{player} invente une règle jusqu'à la fin de la partie.", level: 2 },
  ];
  for (const c of cards) {
    await prisma.card.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log("Seed OK");
}

main().finally(() => prisma.$disconnect());
