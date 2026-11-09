import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { loadEntitlement } from "@/server/home/entitlement-db";

export const userRouter = createTRPCRouter({
  entitlement: protectedProcedure.query(({ ctx }) => {
    return loadEntitlement(ctx.db, ctx.session.user.id);
  }),
  getData: protectedProcedure
  .query(({ctx}) => {
    const {db, session} = ctx
    if(!session.user) return null;
    return db.user.findFirst({
        where:{
            id: session.user.id
        },
        include:{
          subscription:true
        }
    })
  }),
  updateUsername: protectedProcedure
  .input(z.string().min(3).max(15))
  .mutation(async ({ctx, input}) => {
    const {db, session} = ctx
    if(!session.user) return null;

    const user = await db.user.findFirst({
      where: {
        id: session.user.id
      }
    });

    if (!user) return null;

    const lastNewNameDate = user.last_newName ?? null;
    const now = new Date();

    if (lastNewNameDate && lastNewNameDate !== null) {
      const hoursSinceLastChange = (now.getTime() - lastNewNameDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastChange < 24) {
       
      }
    }

    return db.user.update({
      where:{
        id: session.user.id
      },
      data:{
        name:input,
        last_newName: new Date()
      }
    })
  }),
  deleteUser: protectedProcedure
  .input(z.object({
    name:z.string(),
    id:z.string()
  }))
  .mutation(async ({ctx, input}) => {
    const {db, session} = ctx
    const {name, id} = input

    if(session.user.name !== name || !session.user.name && name !== "anonymous"){
      throw new Error("Deleted user name in field must be the same as yours. ('anonymous' if empty)");
    } 
    
    if (session.user.id === id){
    await db.user.update({ where: { id: input.id }, data: { deletedAt: new Date() } });

    return { message: `${session.user.id} DELETED ACCOUNT!` }
  }
  })
});
