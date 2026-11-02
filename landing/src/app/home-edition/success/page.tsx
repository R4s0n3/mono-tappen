import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { StorefrontShell } from "@/app/_components/storefront-shell";
import { countryName } from "@/lib/home/countries";
import { HOME_SHIP_BY_LABEL, formatEur } from "@/lib/home/product";
import { markHomeOrderPaidFromSession } from "@/server/home/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tappen Home preorder",
  robots: { index: false, follow: false },
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomeEditionSuccessPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionId = firstParam(searchParams.session_id);

  if (!sessionId) {
    return (
      <StorefrontShell>
        <Status
          title="No checkout to confirm"
          body="Open the link from Stripe after you pay, or return to the preorder page and start again."
        />
      </StorefrontShell>
    );
  }

  try {
    const result = await markHomeOrderPaidFromSession(sessionId);
    if (result.outcome === "unrelated") {
      return (
        <StorefrontShell>
          <Status
            title="This isn’t a Tappen Home order"
            body="The checkout we found belongs to a different payment. If you just bought the box, use the link Stripe gave you."
          />
        </StorefrontShell>
      );
    }
    if (result.outcome === "unpaid") {
      return (
        <StorefrontShell>
          <Status
            title="Payment isn’t complete"
            body="Stripe hasn’t confirmed this preorder as paid. If money left your account, keep the Stripe receipt and write to info@tappen.app."
          />
        </StorefrontShell>
      );
    }

    const place = result.country ? countryName(result.country) : null;
    const statusCopy =
      result.status === "REFUNDED"
        ? "This preorder was refunded. We will not ship it."
        : result.status === "SHIPPED"
          ? "This preorder is marked as shipped."
          : `You’re on the list. We expect to ship before Christmas 2026, by ${HOME_SHIP_BY_LABEL}.`;

    return (
      <StorefrontShell>
        <article className="flex w-full max-w-2xl flex-col items-start gap-6 px-6 pb-24 pt-32 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
            Tappen Home
          </p>
          <h1 className="font-bang text-5xl uppercase sm:text-6xl">
            {result.status === "REFUNDED" ? "Refunded" : "Preorder received"}
          </h1>
          <p className="text-xl leading-relaxed text-tappen-blue-100">
            {statusCopy}
          </p>
          <dl className="grid w-full gap-3 rounded-3xl bg-tappen-blue-900/80 p-6 text-lg">
            <Row label="Reference">{result.id}</Row>
            <Row label="Quantity">{result.quantity}</Row>
            <Row label="Total incl. VAT and shipping">
              {formatEur(result.amount)}
            </Row>
            {result.shippingAmount != null ? (
              <Row label="Shipping included">
                {formatEur(result.shippingAmount)}
              </Row>
            ) : null}
            {result.name ? <Row label="Ship to">{result.name}</Row> : null}
            {place ? <Row label="Country">{place}</Row> : null}
            {result.email ? (
              <Row label="Receipt email">{result.email}</Row>
            ) : null}
          </dl>
          <p className="text-base leading-relaxed text-tappen-blue-200">
            Stripe keeps the payment receipt. Questions go to{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:info@tappen.app"
            >
              info@tappen.app
            </a>
            . The{" "}
            <Link
              className="underline underline-offset-4"
              href="/legal/withdrawal"
            >
              withdrawal notice
            </Link>{" "}
            explains the 14 days after the box arrives.
          </p>
          <Link
            href="/home-edition"
            className="rounded-full border-2 border-tappen-blue-400/50 px-6 py-3 font-bold"
          >
            Back to Tappen Home
          </Link>
        </article>
      </StorefrontShell>
    );
  } catch (error) {
    console.error("Could not confirm Tappen Home checkout", error);
    return (
      <StorefrontShell>
        <Status
          title="We couldn’t confirm it yet"
          body="If you were charged, keep the Stripe receipt and write to info@tappen.app with the time of the payment. We’ll match it to the order."
        />
      </StorefrontShell>
    );
  }
}

function Status({ title, body }: { title: string; body: string }) {
  return (
    <article className="flex w-full max-w-2xl flex-col items-start gap-6 px-6 pb-24 pt-32 text-left">
      <h1 className="font-bang text-5xl uppercase sm:text-6xl">{title}</h1>
      <p className="text-xl leading-relaxed">{body}</p>
      <Link
        href="/home-edition"
        className="font-bold underline underline-offset-4"
      >
        Back to Tappen Home
      </Link>
    </article>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-tappen-blue-300">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}
