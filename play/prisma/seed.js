// Seed dev data: the official "Tappen" author, a skin, a deck, and cards.
// Mirrors the conditions the game queries for (mode=tappen, room default pool).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CARDS = [
  "What's the worst thing you've done to get out of plans?",
  "If your life had a theme song, what would it be and why?",
  "Tell us about a secret you've never told this table.",
  "What's the most embarrassing thing you've ever done in public?",
  "Who here would you trust with your life?",
  "Have you ever lied about your height?",
  "What's the biggest lie you've ever told to a partner?",
  "What's the weirdest thing you've ever eaten?",
  "What's a hill you're willing to die on?",
  "What's the most expensive mistake you've ever made?",
  "Tell us your best 'I regret that immediately' story.",
  "What's something you do when you're alone that you'd never admit to?",
  "Who's your celebrity hall pass and why?",
  "What's the dumbest reason you've ever cried?",
  "Tell the table something you're actually proud of.",
  "What's the worst date you've ever been on?",
  "What's a habit you know you need to break?",
  "Who in this room has the most chaotic energy?",
  "What's the most trouble you've gotten into at work?",
  "What's your guiltiest pleasure?",
];

async function main() {
  const author = await prisma.user.upsert({
    where: { email: "admio@tappen.app" },
    update: { name: "Tappen", emailVerified: new Date() },
    create: {
      name: "Tappen",
      email: "admio@tappen.app",
      emailVerified: new Date(),
    },
  });

  const bg = await prisma.skinBackground.create({
    data: {
      type: "radial",
      animation: "liquid",
      primary: "#eaeaef",
      secondary: "#f5f5fa",
    },
  });
  const border = await prisma.skinBorder.create({
    data: { frame: "classic", rarity: "common" },
  });
  const font = await prisma.skinFont.create({
    data: { type: "serif", color: "mid" },
  });
  const skin = await prisma.skin.create({
    data: {
      name: "Classic",
      price: 0,
      skinBackgroundId: bg.id,
      skinBorderId: border.id,
      skinFontId: font.id,
    },
  });

  const deck = await prisma.deck.create({
    data: {
      name: "Tappen Official",
      creatorId: author.id,
    },
  });

  let created = 0;
  for (const content of CARDS) {
    const exists = await prisma.card.findFirst({ where: { content } });
    if (exists) continue;
    await prisma.card.create({
      data: {
        content,
        nsfw: false,
        visible: "PUBLIC",
        health: 1000000,
        authorId: author.id,
        skinId: skin.id,
        decks: { connect: { id: deck.id } },
      },
    });
    created++;
  }

  console.log(`seed done: author=${author.name}, deck=${deck.name}, cards created=${created}, total=${CARDS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
