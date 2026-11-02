import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StorefrontShell } from "@/app/_components/storefront-shell";
import { ReleaseCheckout } from "@/app/home-edition/_components/release-checkout";
import { HOME_PRODUCT_META } from "@/lib/home/product";
import { stripe } from "@/server/home/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout cancelled — Tappen Home",
  robots: { index: false, follow: false },
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomeEditionCancelPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionId = firstParam(searchParams.session_id);
  let paid = false;

  if (sessionId?.startsWith("cs_")) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paid =
        session.metadata?.product === HOME_PRODUCT_META &&
        session.payment_status === "paid";
    } catch (error) {
      console.error("Could not read Tappen Home checkout", error);
    }
  }

  if (paid && sessionId) {
    redirect(
      `/home-edition/success?session_id=${encodeURIComponent(sessionId)}`,
    );
  }

  return (
    <StorefrontShell>
      {sessionId?.startsWith("cs_") ? (
        <ReleaseCheckout sessionId={sessionId} />
      ) : null}
      <article className="flex w-full max-w-2xl flex-col items-start gap-6 px-6 pb-24 pt-32 text-left">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
          Tappen Home
        </p>
        <h1 className="font-bang text-5xl uppercase sm:text-6xl">
          No payment taken
        </h1>
        <p className="text-xl leading-relaxed text-tappen-blue-100">
          You left checkout before paying. An unpaid preorder is not shipped. If
          a payment did go through, Stripe will send you to the confirmation
          page instead.
        </p>
        <Link
          href="/home-edition#preorder"
          className="rounded-full bg-tappen-sunset-500 px-6 py-3 font-bold text-tappen-blue-900"
        >
          Return to preorder
        </Link>
      </article>
    </StorefrontShell>
  );
}
