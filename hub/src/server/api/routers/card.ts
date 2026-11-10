import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { env } from "@/env";
import { calculateDamage } from "@/util/functions";

export const cardRouter = createTRPCRouter({
  getGame: publicProcedure.query(async ({ ctx }) => {
    const { db } = ctx;
    const cards = await db.card.findMany({
      where: {
        author: {
          name: { equals: "Tappen", mode: "insensitive" },
          email: { equals: "admio@tappen.app", mode: "insensitive" },
          emailVerified: { not: null },
        },
        nsfw: false,
        visible: "PUBLIC",
        health: { gte: 700000 },
      },
      include: {
        skin: {
          include: {
            background: true,
            border: true,
            font: true
          }
        },
        author: {
          select: {
            name: true,
          },
        },
        likedBy: {
          select: { id: true },
        },
      },
      take: 100, // Get more cards than needed
    });

    const currentUserId = ctx.session?.user.id;

    const transformedCards = cards.map((card) => ({
      ...card,
      isLiked: card.likedBy.some((user) => user.id === currentUserId),
    }));

    // Shuffle array using Fisher-Yates algorithm
    const shuffled = transformedCards.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 30); // Return first 30 after
  }),
  getRandom: publicProcedure.query(async ({ ctx }) => {
    const totalCards = await ctx.db.card.count();
    const randomSkip = Math.floor(Math.random() * totalCards);

    return ctx.db.card.findFirst({
      where: {
        visible: "PUBLIC",
        nsfw: false,
      },
      skip: randomSkip,
    });
  }),
  getById: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.card.findUnique({
      where: {
        cardId: input,
      },
      select: {
        tags: {
          select: {
            name: true,
          },
        },
        visible: true,
        nsfw: true,
        cardId: true,
        skinId: true,
        content: true,
        authorId: true,
      },
    });
  }),
  getByPublicId: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const existingCard = await ctx.db.card.findFirst({
        where: { cardId: input },
        select: {
          content: true,
          nsfw: true,
          likedBy: {
            where: { id: ctx.session?.user.id },
            select: { id: true },
          },
          author: {
            select: {
              name: true,
            },
          },
        },
      });
      const likes = existingCard?.likedBy.length ?? 0;

      const hasLiked = likes > 0;
      interface CardResponse {
        content: string;
        author: string;
        nsfw: boolean;
        isLiked: boolean;
      }

      if (!existingCard) {
        return null;
      }

      const { content, nsfw, author } = existingCard;

      const card: CardResponse = {
        content,
        author: author.name ?? "anonymous",
        nsfw,
        isLiked: hasLiked,
      };

      return card;
    }),
  reportCard: protectedProcedure
    .input(
      z.object({
        reason: z.string(),
        cardId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { cardId, reason } = input;
      return ctx.db.card.update({
        where: {
          cardId,
        },
        data: {
          health: {
            decrement: calculateDamage(reason),
          },
        },
      });
    }),
  toggleStarred: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const existingCard = await ctx.db.card.findFirst({
        where: { cardId: input },
        select: {
          likedBy: {
            select: { id: true },
          },
          author: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!existingCard) {
        return null;
      }

      const isLiked = existingCard.likedBy.some(
        (item) => item.id === ctx.session?.user.id,
      );

      await ctx.db.card.update({
        where: { cardId: input },
        data: {
          likedBy: {
            [isLiked ? "disconnect" : "connect"]: {
              id: ctx.session.user.id,
            },
          },
          health: {
            [isLiked ? "decrement" : "increment"]: 50,
          },
        },
      });

      return isLiked ? "unstarred" : "starred";
    }),
  getAllUserCards: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;
    return db.card.findMany({
      where: {
        OR: [
          {
            authorId: session.user.id,
          },
          {
            likedBy: {
              some: {
                id: session.user.id,
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        cardId: true,
        content: true,
        nsfw: true,
        tags: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            name: true,
          },
        },
        likedBy: {
          select: {
            id: true,
          },
        },
        skinId: true,
      },
    });
  }),
  getFavCards: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;
    return db.card.findMany({
      where: {
        likedBy: {
          some: {
            id: session.user.id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        cardId: true,
        content: true,
        nsfw: true,
        tags: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            name: true,
          },
        },
        likedBy: {
          select: {
            id: true,
          },
        },
        skinId: true,
      },
    });
  }),
  getUserCards: protectedProcedure.query(({ ctx }) => {
    const { db, session } = ctx;

    if (!session.user) return null;

    return db.card.findMany({
      where: {
        authorId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(69),
        tags: z.string().array().optional(),
        nsfw: z.boolean(),
        skin: z.string(),
        visible: z.enum(["PUBLIC", "PRIVATE", "SHARED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { content, tags, visible, nsfw, skin } = input;

      const existingTags = await ctx.db.tag.findMany({});

      const tappenAccount = await ctx.db.user.findFirst({
        where: {
          email: { equals: env.TAPPEN_MAIL, mode: "insensitive" },
        },
      });
      const lowerCaseTags = tags?.map((tag) => tag.toLowerCase()) ?? []; // Add this line
      const filteredTags = lowerCaseTags.filter((tag) => {
        // Modify this line
        if (ctx.session.user.id !== tappenAccount?.id && tag === "tappen") {
          return false;
        }
        return true;
      });

      const tagsToConnect = existingTags.filter((t) =>
        lowerCaseTags.includes(t.name.toLowerCase()),
      ); // Modify this line
      const tagsToCreate =
        filteredTags.filter((t) => !existingTags.some((tg) => tg.name.toLowerCase() === t)) ??
        []; // Modify this line

      let skinToConnect;
      const existingSkin = await ctx.db.skin.findFirst({
        where: {
          id: skin,
        },
      });
      if (!existingSkin) {
        const defaultSkin = await ctx.db.skin.findFirst({
          where: {
            name: { equals: "default", mode: "insensitive" },
          },
        });
        skinToConnect = defaultSkin!.id;
      } else {
        skinToConnect = existingSkin.id;
      }

      return ctx.db.card.create({
        data: {
          content,
          visible,
          nsfw,
          skin: {
            connect: { id: skinToConnect },
          },
          tags: {
            connect: tagsToConnect.map((t) => ({ id: t.id })),
            create: tagsToCreate.map((t) => ({ name: t })),
          },
          author: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(69),
        tags: z.string().array().optional(),
        nsfw: z.boolean(),
        skin: z.string(),
        visible: z.enum(["PUBLIC", "PRIVATE", "SHARED"]),
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { content, tags, visible, nsfw, skin, id } = input;

      const existingCard = await ctx.db.card.findUnique({
        where: {
          cardId: id,
        },
        include: {
          tags: true,
        },
      });
      if (existingCard?.authorId !== ctx.session.user.id) {
        throw new Error("you are not allowed to update this card.");
      }
      if (!existingCard) {
        throw new Error("the card you want to update don't exists.");
      }

      const existingTags = await ctx.db.tag.findMany({});
      const tappenAccount = await ctx.db.user.findFirst({
        where: {
          email: { equals: env.TAPPEN_MAIL, mode: "insensitive" },
        },
      });
      const lowerCaseTags = tags?.map((tag) => tag.toLocaleLowerCase());
      const filteredTags =
        lowerCaseTags?.filter((tag) => {
          // If user is not Tappen account, remove "tappen" tag
          if (ctx.session.user.id !== tappenAccount?.id && tag === "tappen") {
            return false;
          } else if (tag.length > 14) {
            return false;
          }
          return true;
        }) ?? [];

      const tagsToConnect = existingTags.filter((t) =>
        lowerCaseTags?.includes(t.name.toLocaleLowerCase()),
      );
      const tagsToCreate =
        filteredTags.filter((t) => !existingTags.some((tg) => tg.name.toLowerCase() === t)) ??
        [];
      const tagsToDisconnect = existingCard.tags.filter(
        (t) => !lowerCaseTags?.includes(t.name.toLocaleLowerCase()),
      );

      let skinToConnect;
      const existingSkin = await ctx.db.skin.findFirst({
        where: {
          id: skin,
        },
      });
      if (!existingSkin) {
        const defaultSkin = await ctx.db.skin.findFirst({
          where: {
            name: { equals: "default", mode: "insensitive" },
          },
        });
        skinToConnect = defaultSkin!.id;
      } else {
        skinToConnect = existingSkin.id;
      }

      return ctx.db.card.update({
        where: {
          cardId: id,
        },
        data: {
          content,
          visible,
          nsfw,
          skin: {
            connect: { id: skinToConnect },
          },
          tags: {
            connect: tagsToConnect.map((t) => ({ id: t.id })),
            disconnect: tagsToDisconnect.map((t) => ({ id: t.id })),
            create: tagsToCreate.map((t) => ({ name: t })),
          },
          author: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
  getLatest: protectedProcedure.query(({ ctx }) => {
    return ctx.db.card.findFirst({
      orderBy: { createdAt: "desc" },
      where: { author: { id: ctx.session.user.id } },
    });
  }),
});
