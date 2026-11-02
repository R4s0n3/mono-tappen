import { NextResponse } from "next/server";

import { env } from "@/env";
import { HOME_PRODUCT_META } from "@/lib/home/product";

import {
  cancelUnpaidHomeCheckout,
  markHomeOrderPaidFromSession,
  markHomeOrderRefunded,
} from "@/server/home/orders";
import { stripe } from "@/server/home/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHomeSession(product: string | undefined): boolean {
  return product === HOME_PRODUCT_META;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Stripe webhook signature failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (!isHomeSession(session.metadata?.product)) break;
        if (
          session.payment_status !== "paid" &&
          event.type === "checkout.session.completed"
        )
          break;
        await markHomeOrderPaidFromSession(session.id);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        if (!isHomeSession(session.metadata?.product)) break;
        await cancelUnpaidHomeCheckout(session.id);
        break;
      }
      case "charge.refunded": {
        await markHomeOrderRefunded(event.data.object);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook handler failed for ${event.type}`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
