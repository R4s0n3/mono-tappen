import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,

} from "@/server/api/trpc";

export const skinRouter = createTRPCRouter({
 
  getStyle: publicProcedure
  .input(z.string())
  .query(async ({ctx, input}) => {
    const { db } = ctx
    const existingSkin = await db.skin.findFirst({
      where:{
        OR: [
          { id: input },
          { name: { equals: input, mode: "insensitive" } }
        ]
      },
      include:{
        font: {
          select:{
            type:true,
            color:true,
          }
        },
        background: true,
        border:{
          select:{
            frame: true,
            rarity: true,
          }
        }
      }
    })

    if (!existingSkin) return null

    const {font, border, background} = existingSkin

    return ({
    font,
    border,
    background:{
        type: background.type,
        colors:{
            primary: background.primary,
            secondary: background.secondary,
            highlight: background.highlight ?? "",
        },
        animation: background.animation
    }})

  }),
});
