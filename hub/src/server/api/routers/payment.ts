import Stripe from 'stripe';
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure
} from "@/server/api/trpc";

import { env } from '@/env'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',

});

const RECENT_RECEIPTS_COUNT = 5

export const paymentRouter = createTRPCRouter({
  getBill: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) => {
      if (!ctx.session.user) return

      const generateReceipt = async (sessionId: string) => {
        // Create an invoice from the payment
        const confirmedPayment = await stripe.checkout.sessions.retrieve(sessionId)
        const invoice = confirmedPayment?.invoice as string

        const retrievedInvoice = await stripe.invoices.retrieve(invoice)
        return retrievedInvoice.invoice_pdf
      }
      const receiptUrl = generateReceipt(input)
      return receiptUrl
    }),
  retrieve: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user) return
      const confirmedPayment = await stripe.checkout.sessions.retrieve(input)
      return {
        status: confirmedPayment.status,
        type: confirmedPayment.metadata?.type,
        price: confirmedPayment.amount_total
      }
    }),
  getHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const payments = await ctx.db.payment.findMany({
        where: {
          user: {
            id: ctx.session.user.id
          },
          status: {
            not: "PENDING"
          }
        },

        orderBy: {
          purchasedAt: 'desc'  // Most recent payments first
        },
        take: 50
      })

      const recentReceipts = await Promise.all(
        payments
          .slice(0, RECENT_RECEIPTS_COUNT)
          .map(async (payment) => {
            if (!payment.shopId) return {}
            const confirmedPayment = await stripe.checkout.sessions.retrieve(payment.shopId)
            const invoice = confirmedPayment?.invoice
            const type = confirmedPayment.metadata?.type;

            return {
              shopId: payment.shopId,
              receiptUrl: invoice,
              type
            }
          })
      );

      return payments.map((payment, index) => ({
        ...payment,
        type: recentReceipts[index]?.type,
        receiptUrl: index < RECENT_RECEIPTS_COUNT
          ? recentReceipts.find(r => r?.shopId === payment.shopId)?.receiptUrl
          : null
      }))
    }),
  confirm: protectedProcedure
    .input(z.object({
      shopId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { shopId } = input
      const confirmedPayment = await stripe.checkout.sessions.retrieve(shopId)

      if (!confirmedPayment || confirmedPayment.payment_status !== "paid") return { status: "failed" }

      const purchasedProducts = confirmedPayment.metadata?.productIds ?? ""
      const productType = confirmedPayment.metadata?.type ?? ""
      const paymentId = confirmedPayment.metadata?.paymentId

      const hasHandled = await ctx.db.payment.findUnique({
        where: {
          id: paymentId
        }
      })

      if (hasHandled?.status === "COMPLETED") return { status: "success", message: "payment already handled." }
      if (hasHandled?.userId !== ctx.session.user.id) return { status: "failed", message: "none of your business bro." }

      async function handlePurchasedItems(product: string, type: string) {
        // Issue 1: Empty products array check
        if (!product) {
          throw new Error("No products found in payment");
        }

        const existingProduct = await ctx.db.product.findFirst({
          where: {
            id: product
          },
          include: {
            skins: {
              select: {
                id: true
              }
            }
          }
        })

        // Issue 2: Add verification that products were found
        if (!existingProduct) {
          throw new Error("No matching products found in database");
        }



        // Issue 3: Move the payment update inside the switch cases
        switch (type) {
          case "BUNDLE":

            await ctx.db.userSkin.createMany({
              data: existingProduct.skins.map(skin => ({
                userId: ctx.session.user.id,
                skinId: skin.id
              }))
            });

            await ctx.db.payment.update({
              where: { id: paymentId },
              data: {
                status: "COMPLETED",
                shopId,
                user: { connect: { id: ctx.session.user.id } }
              }
            });


            break
          case "SUBSCRIPTION":
            const hasSub = await ctx.db.subscription.findUnique({
              where: {
                userId: ctx.session.user.id
              }
            })
            // First create the subscription
            if (!hasSub) {
              await ctx.db.subscription.create({
                data: {
                  user: {
                    connect: {
                      id: ctx.session.user.id
                    }
                  },
                  stripeId: shopId,
                  status: "active",
                }
              });

              if (existingProduct.skins[0]) {
                await ctx.db.userSkin.create({
                  data: {
                    userId: ctx.session.user.id,
                    skinId: existingProduct.skins[0]?.id
                  },
                });
              }

              await ctx.db.payment.update({
                where: { id: paymentId },
                data: {
                  status: "COMPLETED",
                  shopId,
                  user: { connect: { id: ctx.session.user.id } }
                }
              });
            }
            break;
          case "SKIN":
            // Common logic for both SKIN and SUBSCRIPTION
            if (existingProduct.skins[0]) {
              await ctx.db.userSkin.create({
                data: {
                  userId: ctx.session.user.id,
                  skinId: existingProduct.skins[0]?.id
                },
              });
            }

            await ctx.db.payment.update({
              where: { id: paymentId },
              data: {
                status: "COMPLETED",
                shopId,
                user: { connect: { id: ctx.session.user.id } }
              }
            });
            break;

          default:
            throw new Error(`Unsupported purchase type: ${type}`);
        }
      }

      await handlePurchasedItems(purchasedProducts, productType)


      return { status: "success", message: "Thank you for your purchase!" }
    }),
  createBundleIntent: protectedProcedure
    .input(z.object({
      product: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx
      if (!session.user) return
      if (!session.user.email) throw new Error("EMAIL")

      const existingCustomers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });

      let customer;
      if (existingCustomers.data.length > 0) {
        // Customer exists, reuse the existing one
        customer = existingCustomers.data[0];
      } else {
        // Customer does not exist, create a new one
        customer = await stripe.customers.create({
          email: session.user.email,
          metadata: {
            userId: session.user.id
          }
        });
      }
      if (!customer) throw new Error("something went wrong. try again later.")

      const existingProduct = await db.product.findFirst({
        where: { id: input.product, type: "BUNDLE" },
        include: { skins: true }
      })

      if (!existingProduct) throw new Error("product not found.")

      const userSkins = await db.userSkin.findMany({ where: { userId: ctx.session.user.id } }) ?? []

      const boughtSkins = existingProduct?.skins.filter(skin => userSkins.some(uSkin => uSkin.skinId === skin.id))

      const reducedPrice = boughtSkins.reduce((acc, sk) => acc + sk.price, 0)
      const totalAmount: number = existingProduct.price - reducedPrice

      if (totalAmount <= 0) {
        throw new Error("amount must be positive.")
      }

      const createdPayment = await ctx.db.payment.create({
        data: {
          user: {
            connect: {
              id: ctx.session.user.id
            }
          }
        }
      })

      const checkout = await stripe.checkout.sessions.create({
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              product_data: {
                name: existingProduct.name,
                description: existingProduct.description ?? ""
              },
              unit_amount: totalAmount
            },
          },
        ],
        invoice_creation: {
          enabled: true
        },
        success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.STRIPE_CANCEL_URL}`,
        currency: 'eur',
        mode: "payment",
        customer: customer.id,
        metadata: {
          paymentId: createdPayment.id,
          productIds: existingProduct.id,
          type: "BUNDLE"
        },
      });

      return { checkout_session: checkout.url };
    }),
  createSubIntent: protectedProcedure
    .input(z.object({
      userId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx
      const { userId } = input

      if (!session.user) return null
      if (session.user.id !== userId) return null
      if (!session.user.email) throw new Error("EMAIL")

      const existingCustomers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });

      let customer;
      if (existingCustomers.data.length > 0) {
        // Customer exists, reuse the existing one
        customer = existingCustomers.data[0];
      } else {
        // Customer does not exist, create a new one
        customer = await stripe.customers.create({
          email: session.user.email,
          metadata: {
            userId: session.user.id
          }
        });
      }
      if (!customer) throw new Error("something went wrong. try again later.")


      const hasSub = await db.subscription.findUnique({
        where: {
          userId: input.userId
        }
      })

      if (hasSub) {
        throw new Error("Subscription already purchased")
      }

      const existingProduct = await db.product.findFirst({
        where: { name: "Premium", type: "SUBSCRIPTION" }
      })

      if (!existingProduct) throw new Error("product not found.")

      const totalAmount: number = existingProduct.price

      if (totalAmount <= 0) {
        throw new Error("amount must be positive.")
      }



      const createdPayment = await ctx.db.payment.create({
        data: {
          user: {
            connect: {
              id: ctx.session.user.id
            }
          }
        }
      })

      const checkout = await stripe.checkout.sessions.create({
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              product_data: {
                name: existingProduct.name,
                description: existingProduct.description ?? existingProduct.type // Dynamic product name
              },
              unit_amount: existingProduct.price
            },
          },
        ],
        invoice_creation: {
          enabled: true
        },
        success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.STRIPE_CANCEL_URL}`,
        currency: 'eur',
        mode: "payment",
        customer: customer.id,
        metadata: {
          paymentId: createdPayment.id,
          productIds: existingProduct.id,
          type: "SUBSCRIPTION"
        },
      });

      return { checkout_session: checkout.url };
    }),
  createSkinIntent: protectedProcedure
    .input(z.object({
      userId: z.string(),
      skin: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx
      const { userId, skin } = input

      if (!session.user) return null
      if (session.user.id !== userId) return null
      if (!skin) return null
      if (!session.user.email) throw new Error("EMAIL")

      const existingCustomers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });

      let customer;
      if (existingCustomers.data.length > 0) {
        // Customer exists, reuse the existing one
        customer = existingCustomers.data[0];
      } else {
        // Customer does not exist, create a new one
        customer = await stripe.customers.create({
          email: session.user.email,
          metadata: {
            userId: session.user.id
          }
        });
      }
      if (!customer) throw new Error("something went wrong. try again later.")


      const hasSkin = await db.userSkin.findFirst({
        where: {
          userId: session.user.id,
          skinId: skin
        }
      })

      if (hasSkin) {
        throw new Error("Skin already purchased")
      }

      const existingSkin = await db.skin.findUnique({
        where: { id: skin }
      })

      if (!existingSkin) return null

      const totalAmount: number = existingSkin.price

      if (totalAmount <= 0) {
        throw new Error("amount must be positive.")
      }

      let existingProduct
      const isProduct = await db.product.findFirst({
        where: {
          type: "SKIN",
          skins: {
            some: {
              id: existingSkin.id
            }
          }
        }
      })

      if (!isProduct) {
        existingProduct = await db.product.create({
          data: {
            name: existingSkin.name,
            price: existingSkin.price,
            type: "SKIN",
            skins: {
              connect: {
                id: existingSkin.id
              }
            }
          }
        })
      }


      const createdPayment = await ctx.db.payment.create({
        data: {
          user: {
            connect: {
              id: ctx.session.user.id
            }
          }
        }
      })

      const checkout = await stripe.checkout.sessions.create({
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              product_data: {
                name: existingSkin.name,
                description: existingProduct?.description ?? existingProduct?.type // Dynamic product name
              },
              unit_amount: existingSkin.price
            },
          },
        ],
        success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.STRIPE_CANCEL_URL}`,
        customer: customer.id,
        invoice_creation: {
          enabled: true,

        },
        mode: "payment",
        metadata: {
          paymentId: createdPayment.id,
          productIds: existingProduct?.id ?? isProduct?.id ?? "",
          type: "SKIN"
        },
      });

      return { checkout_session: checkout.url };
    }),
})
