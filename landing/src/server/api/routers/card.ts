import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const cardRouter = createTRPCRouter({
  getPreview: publicProcedure
  .query(({ctx}) => {
    return ctx.db.card.findMany({
      take:7,
      where:{
        author:{
          name: "Tappen"
        }
      },
      select: {
        cardId: true,
        content:true,
        author:{
          select:{
            name: true
          }
        }
      },
      orderBy: {
        likedBy: {
          _count: 'desc'
        }
      }
    })
  }),
  getByPublicId: publicProcedure
  .input(z.string())
  .query(async ({ctx, input}) => {

    
    
    const existingCard = await ctx.db.card.findFirst({
      where: { cardId: input },
      select: { 
        content: true,
        nsfw: true,
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

    interface CardResponse {
      content: string;
      author: string;
      nsfw: boolean;
      isLiked: boolean;
    }

    if (!existingCard){ 
      return null
    }
    
    const isLiked = existingCard.likedBy.some(item => item.id === ctx.session?.user.id)
    const { content, nsfw, author } = existingCard;
  
    
    const card: CardResponse = {
      content,
      author: author.name ?? "anonymous",
      nsfw,
      isLiked
    };

    return card;
  }),
  getById: protectedProcedure
  .input(z.string())
  .query(async ({ctx, input}) => {

    const userId = ctx.session.user.id
    
    const existingCard = await ctx.db.card.findFirst({
      where: { cardId: input },
      select: { 
        content: true,
        nsfw: true,
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

    interface CardResponse {
      content: string;
      author: string;
      nsfw: boolean;
      isLiked: boolean;
    }

    if (!existingCard){ 
      return null
    }

    const { content, nsfw, author, likedBy } = existingCard;
    const isLiked = likedBy.some(item => item.id === userId)
    
    const card: CardResponse = {
      content,
      author: author.name ?? "anonymous",
      nsfw,
      isLiked,
    };

    return card;
  }),
});
