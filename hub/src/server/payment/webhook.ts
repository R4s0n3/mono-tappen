import type Stripe from "stripe";

import { env } from "@/env";
import {
  fulfillPaidCheckoutSession,
  markCheckoutExpired,
  markCheckoutFailed,
  syncChargeRefund,
} from "@/server/payment/fulfillment";
import { stripe } from "@/server/payment/stripe";

function chargeIdFromRefund(refund: Stripe.Refund): string | null {
  if (typeof refund.charge === "string") return refund.charge;
  return refund.charge?.id ?? null;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  if (env.NODE_ENV === "production" && !event.livemode) {
    console.error(`[stripe-webhook] dropped test-mode event ${event.id} in production`);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      await fulfillPaidCheckoutSession(event.data.object);
      return;
    }
    case "checkout.session.async_payment_failed": {
      await markCheckoutFailed(event.data.object);
      return;
    }
    case "checkout.session.expired": {
      await markCheckoutExpired(event.data.object);
      return;
    }
    case "charge.refunded": {
      await syncChargeRefund(event.data.object.id);
      return;
    }
    case "refund.updated": {
      if (event.data.object.status !== "succeeded") return;
      const chargeId = chargeIdFromRefund(event.data.object);
      if (!chargeId) return;
      await syncChargeRefund(chargeId);
      return;
    }
    default:
      return;
  }
}

export function constructStripeEvent(payload: string, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}
