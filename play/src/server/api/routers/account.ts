import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { loadEntitlement } from "@/server/home/entitlement-db";

export const accountRouter = createTRPCRouter({
  entitlement: protectedProcedure.query(({ ctx }) => {
    return loadEntitlement(ctx.db, ctx.session.user.id);
  }),
});
