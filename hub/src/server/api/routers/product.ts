
import {
  createTRPCRouter,
  publicProcedure,

} from "@/server/api/trpc";

export const productRouter = createTRPCRouter({
  getAll: publicProcedure
  .query(({ctx}) => {
    return ctx.db.product.findMany({
      select:{
        id:true,
        type:true,
        name:true,
        description:true,
        price:true,
        skins:true
      }
    })
  }),
});
