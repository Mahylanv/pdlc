import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CATS = [
  { key: "culture_g",  name: "Culture G",     color: "#4B7303" },
  { key: "mort_subite",name: "Mort subite",   color: "#3B3B3B" },
  { key: "un_joueur",  name: "Un joueur",     color: "#0C7A76" },
  { key: "vote",       name: "Vote",          color: "#583178" },
  { key: "regle",      name: "Règle",         color: "#267078" },
  { key: "emoji_film", name: "Emoji Film",    color: "#8C6F14" },
  { key: "tous",       name: "Tout le monde", color: "#916D09" },
  { key: "encheres",   name: "ENCHERES",      color: "#992E47" },
];

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Round","Player","Game","_CardToCategory","Card","Category"
    RESTART IDENTITY CASCADE
  `);

  for (const c of CATS) await prisma.category.create({ data: c });
  console.log(`OK - Base vidée + ${CATS.length} catégories insérées.`);
}

main().finally(() => prisma.$disconnect());
