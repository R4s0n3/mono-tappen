"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { z } from "zod";

import { shippingCountries } from "@/lib/home/countries";
import {
  HOME_CURRENCY,
  HOME_MAX_QUANTITY,
  HOME_PRODUCT_META,
  HOME_PRODUCT_NAME,
  HOME_SHIP_BY_LABEL,
  HOME_UNIT_AMOUNT_CENTS,
  homeOrderTotal,
  type CheckoutFormState,
  type HomeRegion,
} from "@/lib/home/product";
import { db } from "@/server/db";
import { env } from "@/env";

import { cancelUnpaidHomeCheckout } from "./orders";
import { stripe } from "./stripe";

const checkoutSchema = z.object({
  quantity: z.number().int().min(1).max(HOME_MAX_QUANTITY),
  region: z.enum(["DE", "EU"]),
  acceptedTerms: z.literal(true),
});

function siteUrl(path: string): string {
  const base = env.NEXTAUTH_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function shippingCentsFor(region: HomeRegion): number {
  return region === "DE"
    ? env.HOME_SHIPPING_DE_CENTS
    : env.HOME_SHIPPING_EU_CENTS;
}

export async function createHomeCheckout(
  _previous: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const quantityRaw = formData.get("quantity");
  const regionRaw = formData.get("region");
  const accepted = formData.get("acceptedTerms") === "on";
  const parsed = checkoutSchema.safeParse({
    quantity:
      typeof quantityRaw === "string" ? Number(quantityRaw) : quantityRaw,
    region: regionRaw,
    acceptedTerms: accepted ? true : false,
  });

  if (!parsed.success) {
    if (!accepted) {
      return {
        error:
          "Please confirm that you have read the withdrawal notice and the terms.",
      };
    }
    return {
      error: `Choose a quantity from 1 to ${HOME_MAX_QUANTITY} and a shipping region.`,
    };
  }

  const { quantity, region } = parsed.data;
  const shippingCents = shippingCentsFor(region);
  if (!Number.isInteger(shippingCents) || shippingCents < 0) {
    return { error: "Shipping is not configured yet. Please try again later." };
  }

  const amount = homeOrderTotal(quantity, shippingCents);
  const countries = shippingCountries(region);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "en",
      currency: HOME_CURRENCY,
      submit_type: "pay",
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: countries,
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name:
              region === "DE"
                ? "Shipping within Germany"
                : "Shipping within the EU",
            fixed_amount: {
              amount: shippingCents,
              currency: HOME_CURRENCY,
            },
            tax_behavior: "inclusive",
          },
        },
      ],
      line_items: [
        {
          quantity,
          price_data: {
            currency: HOME_CURRENCY,
            unit_amount: HOME_UNIT_AMOUNT_CENTS,
            tax_behavior: "inclusive",
            product_data: {
              name: HOME_PRODUCT_NAME,
              description: `Boxed set of 100 original English Tappen cards. Includes a single-use code that permanently unlocks Tappen Premium and the Premium card skin for one account. Preorder, ships by ${HOME_SHIP_BY_LABEL}.`,
              metadata: { product: HOME_PRODUCT_META },
            },
          },
        },
      ],
      invoice_creation: { enabled: true },
      custom_text: {
        submit: {
          message: `Tappen Home is a preorder of a physical card set. Payment is due now. The total includes VAT and shipping. We ship before Christmas 2026 (by ${HOME_SHIP_BY_LABEL}). You may withdraw within 14 days of receiving the box.`,
        },
        shipping_address: {
          message:
            region === "DE"
              ? "This rate is for addresses in Germany."
              : "This rate is for European Union addresses outside Germany.",
        },
      },
      success_url: `${siteUrl("/home-edition/success")}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl("/home-edition/cancel")}?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        product: HOME_PRODUCT_META,
        quantity: String(quantity),
        region,
        shippingAmount: String(shippingCents),
      },
      payment_intent_data: {
        description: `${HOME_PRODUCT_NAME} preorder × ${quantity}`,
        metadata: {
          product: HOME_PRODUCT_META,
        },
      },
    });
  } catch (error) {
    console.error("Failed to create Tappen Home checkout", error);
    return { error: "Could not start checkout. Please try again." };
  }

  if (!session.url) {
    return { error: "Could not start checkout. Please try again." };
  }

  try {
    await db.homeOrder.create({
      data: {
        stripeSessionId: session.id,
        quantity,
        amount,
        shippingAmount: shippingCents,
        currency: HOME_CURRENCY,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error("Failed to store Tappen Home order", error);
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(session.url);
}

export async function cancelHomeCheckout(sessionId: string): Promise<void> {
  try {
    await cancelUnpaidHomeCheckout(sessionId);
  } catch (error) {
    console.error("Cancel checkout failed", error);
  }
}
