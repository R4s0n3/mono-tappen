import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

import { calculateDamage } from "@/util/functions";

export const cardRouter = createTRPCRouter({
  getByPublicId: publicProcedure
  .input(z.string())
  .query(async ({ctx, input}) => {
    const existingCard = await ctx.db.card.findFirst({
      where: { cardId: input },
      select: { 
        content: true,
        nsfw: true,
        likedBy: {
          select:{
            id: true
          }
        },
        author: {
          select: {
            name: true
          }
        },
      }
    });

    interface CardResponse {
      content: string;
      author: string;
      nsfw: boolean;
      isLiked: boolean;
    }

    if (!existingCard){ 
      return null
    }

    const { content, nsfw, author } = existingCard;

    const hasLiked = existingCard.likedBy
    .find(u => u.id === ctx.session?.user.id)

    const card: CardResponse = {
      content,
      author: author.name ?? "anonymous",
      nsfw,
      isLiked: (hasLiked !== undefined)
    };
    return card;
  }),
  reportCard: protectedProcedure
  .input(z.object({
    reason:z.string(),
    cardId: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    const {cardId, reason } = input
    return ctx.db.card.update({
      where:{
        cardId
      },
      data:{
        health: {
          decrement: calculateDamage(reason)
        }
      }
    })
  }),
  toggleStarred: protectedProcedure
  .input(z.string())
  .mutation(async ({ ctx, input }) => {
    
    const existingCard = await ctx.db.card.findFirst({
      where: { cardId: input },
      select: { 
        likedBy: {
          select: { id: true } 
        },
        author: {
          select: {
            name: true
          }
        },
      }
    });
    
    if (!existingCard){ 
      return null
    }

    const isLiked = existingCard.likedBy.some(item => item.id === ctx.session?.user.id)

    await ctx.db.card.update({
      where: { cardId: input },
      data: {
        likedBy: {
          [isLiked ? 'disconnect' : 'connect']: { 
            id: ctx.session.user.id 
          }
        },
        health: {
          [isLiked ? 'decrement' : 'increment']: 50
        }
      }
    });

    return isLiked ? 'unstarred' : 'starred'
  }),
  getByParams: publicProcedure.input(z.object({
    mode: z.string().optional(),
    uid: z.string().optional(),
    did: z.string().optional(),
    tid: z.string().array().optional(),
    game: z.string().array().optional()
  })).query(async ({ ctx,input }) => {
  const { db } = ctx;

  if(input.mode === "tappen"){
    const cards = await db.card.findMany({
      where: {
        author: {
          name: { equals: "Tappen", mode: "insensitive" },
          email: { equals: "admio@tappen.app", mode: "insensitive" },
          emailVerified: { not: null }
        },
        nsfw: false,
        visible: "PUBLIC",
        health: { gte: 700000 }
      },
      take: 100, // Get more cards than needed
      select:{
        cardId:true,
        skinId:true
      }
    });
    // Shuffle array using Fisher-Yates algorithm
    const shuffled = cards.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 30); // Return first 30 after
    }

    if(input.mode === "discover"){
      const cards = await db.card.findMany({
        where: {
          visible: "PUBLIC",
          nsfw: false,
          health: { gte: 500000 }
        },
        take: 100, // Get more cards than needed
        select:{
          cardId:true,
          skinId:true
        }
      });
      // Shuffle array using Fisher-Yates algorithm
      const shuffled = cards.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 20); // Return first 30 after
      }

  if(input.did !== undefined){
    if(input.did === "favs"){
      return db.card.findMany({
        where: {
              likedBy: {
                some: {
                  id: ctx.session?.user.id,
                }
              }
  
          
        },
        orderBy:{
          createdAt: "desc"
        },
        select:{
          cardId:true,
          skinId:true,
        }
      })
    }
    
    return db.card.findMany({
    where:{
      decks:{
        some:{
          id: input.did
        }
      }
    },
    select:{
      skinId:true,
      cardId:true
    }
  })
}

if(input.tid && input.tid?.length > 0){
  const cards = await db.card.findMany({
    where:{
      tags: {
        some: {  
          name: { in: input.tid, mode: "insensitive" }
        }
      }
    },
    take:100,
    select:{
      skinId:true,
      cardId:true
    }
  })
   // Shuffle array using Fisher-Yates algorithm
   const shuffled = cards.sort(() => Math.random() - 0.5);
   return shuffled.slice(0, 20); // Return first 30 after
}

if(input.game !== undefined && input.game?.length > 0){
  return db.card.findMany({
    where:{
      cardId:{
        in:input.game.filter(Boolean)
      }
    },
    select:{
      skinId:true,
      cardId:true
    }
  })
}

return db.card.findMany({
  where:{
    visible: "PUBLIC",
    health: {
      gte: 1000000
    }
  },
  take:20
})
  }),

});
