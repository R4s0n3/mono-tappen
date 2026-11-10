import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const tagRouter = createTRPCRouter({

  getAll: protectedProcedure
  .query(({ctx}) => {
    return ctx.db.tag.findMany({
      where:{
        name:{
          not: "tappen",
          mode: "insensitive",
        }
      },
    })
  }),
  getTrending: publicProcedure
  .query(({ctx}) => {
    return ctx.db.tag.findMany({
      where:{
        name:{
          not: "tappen",
          mode: "insensitive",
        }
      },
      take: 6,
      orderBy: {
        cards: {
          _count: 'desc'
        }
      },
    })
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(14) }))
    .mutation(async ({ ctx, input }) => {

    const existingTag = await ctx.db.tag.findFirst({
        where:{
            name: { equals: input.name, mode: "insensitive" }
        }
    })

    if (existingTag) return { name: existingTag.name}

    return await ctx.db.tag.create({
        data: {
          name: input.name,
        },
      });
    })

   

});
