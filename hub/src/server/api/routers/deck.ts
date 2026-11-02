import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure
} from "@/server/api/trpc";

export const deckRouter = createTRPCRouter({
  getById: protectedProcedure
  .input(z.string())
  .query(({ctx, input}) => {
    const {db, session} = ctx

    if(!session.user) return null

    return db.deck.findFirst({
      where:{
        id: input
      },
      include:{
        cards:{
          include:{
            tags:{
              select:{
                name:true
              }
            },
            author: {
              select:{
                name: true
              }
            }
          }
        }
      }
    })
  }),
  getUserDecks: protectedProcedure
  .query(({ ctx }) => {
        const {db, session} = ctx

        if(!session.user) return null

        return db.deck.findMany({
            where: {
              deletedAt:null,
              creator:{ 
                id:session.user.id,

              }
            },
            include:{
              cards:{
                include:{
                    author:{
                        select:{
                            id: true
                        }
                    }
                }
              },
              creator:{
                select:{
                  name:true,
                }
              }
            }
        })
    }),
  delete: protectedProcedure
  .input(z.string())
  .mutation(async ({ctx, input}) => {

      const existingDeck = await ctx.db.deck.findUnique({
        where:{
          id:input
        }
      })

      if(!existingDeck){
        throw new Error("Deck to delete could not be found.")
      }

      if(existingDeck.creatorId !== ctx.session.user.id){
        throw new Error("You are not allowed to delete this deck")
      }

      console.log(`User ${ctx.session.user.id} is deleting deck ${input}`);


      return ctx.db.deck.update({ where: { id: input }, data: { deletedAt: new Date() } });

  }),
  create: protectedProcedure
    .input(z.object({ cards: z.string().array(), name: z.string()}))
    .mutation(async ({ ctx, input }) => {

      const currentDecks = await ctx.db.deck.findMany({
        where:{
          creatorId: ctx.session.user.id
        }
      })

      const hasSubscription = await ctx.db.subscription.findFirst({
        where:{
          userId: ctx.session.user.id,
          status:"active"
        } 
      })

      if(!hasSubscription && currentDecks?.length >= 1) return { message: "MAX. 1 DECK WITHOUT SUBSCRIPTION"}

      return ctx.db.deck.create({
        data: {
          name: input.name,
          cards: { 
            connect: input.cards.map( c => ({ cardId : c }))
        },
          creator: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
    update: protectedProcedure
    .input(z.object({ id:z.string(), cards: z.string().array(), name: z.string()}))
    .mutation(async ({ ctx, input }) => {

      const existingDeck = await ctx.db.deck.findFirst({
        where:{
          id: input.id,
        },
        include:{
          cards:{
            select:{
              cardId:true
            }
          },
          creator:{
            select:{
              id:true
            }
          }
        }
      })

    
      if(!existingDeck){
        throw new Error("no existing deck found.")
      }

      const isAuthor = existingDeck.creator.id === ctx.session.user.id

      if(!isAuthor){
        throw new Error("you are not allowed to do this.")
      }

      const currentCards = existingDeck.cards.map(card => card.cardId);

      const cardsToConnect = input.cards.filter(c => !currentCards.includes(c));
      const cardsToDisconnect = currentCards.filter(c => !input.cards.includes(c));

      return ctx.db.deck.update({
        where: {
          id: existingDeck.id
        },
        data: {
          name: input.name,
          cards: { 
            connect: cardsToConnect.map(c => ({ cardId: c })),
            disconnect: cardsToDisconnect.map(c => ({ cardId: c }))
          },
          creator: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
});
