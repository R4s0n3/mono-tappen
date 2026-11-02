import { ChevronDownIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CheckoutForm } from "@/app/home-edition/_components/checkout-form";
import { SampleCard } from "@/app/home-edition/_components/sample-card";
import { HOME_SAMPLES } from "@/lib/home/samples";
import {
  HOME_SHIP_BY_LABEL,
  HOME_UNIT_AMOUNT_CENTS,
  formatEur,
  formatShipping,
} from "@/lib/home/product";

const unitPrice = formatEur(HOME_UNIT_AMOUNT_CENTS);

export function HomeEditionStory({
  deCents,
  euCents,
}: {
  deCents: number;
  euCents: number;
}) {
  const heroCard = HOME_SAMPLES[0];

  return (
    <>
      <section className="flex min-h-dvh w-full items-center px-6 pb-20 pt-28">
        <div className="mx-auto grid w-full max-w-screen-xl items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col items-start gap-6 text-left">
            <p className="rounded-full border border-tappen-sunset-400/50 px-4 py-1 text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
              Preorder · ships before Christmas 2026
            </p>
            <h1 className="font-bang text-6xl uppercase leading-none sm:text-7xl lg:text-8xl">
              Tappen Home
            </h1>
            <p className="max-w-xl text-2xl leading-snug text-tappen-blue-100 lg:text-3xl">
              One hundred cards. One box. The whole table.
            </p>
            <p className="max-w-xl text-lg leading-relaxed text-tappen-blue-200">
              The original English set, printed and boxed, including the newest
              questions. A QR code in the box opens a multiplayer room on
              play.tappen.app — one screen for the table, phones for everyone
              else.
            </p>
            <p className="text-4xl font-bold">
              {unitPrice}{" "}
              <span className="text-lg font-normal text-tappen-blue-200">
                incl. VAT, plus shipping
              </span>
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a
                href="#preorder"
                className="rounded-full bg-tappen-sunset-500 px-8 py-4 text-center text-lg font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
              >
                Preorder the box
              </a>
              <a
                href="#in-the-box"
                className="rounded-full border-2 border-tappen-blue-400/50 px-8 py-4 text-center text-lg transition hover:border-tappen-sunset-400"
              >
                What’s in the box
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            {heroCard ? (
              <div className="rotate-2">
                <SampleCard card={heroCard} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section
        id="in-the-box"
        className="w-full scroll-mt-28 border-t-2 border-tappen-blue-900 px-6 py-24"
      >
        <div className="mx-auto flex max-w-screen-xl flex-col gap-12">
          <div className="max-w-3xl text-left">
            <h2 className="font-bang text-5xl uppercase lg:text-7xl">
              In the box
            </h2>
            <p className="mt-4 text-xl leading-relaxed text-tappen-blue-200">
              A physical set you put on the table. No account required to read
              the cards. No ads.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <BoxTile title="100 cards" kicker="English">
              The original Tappen questions, printed, plus the new cards written
              for this set. The same prompts the app already knows.
            </BoxTile>
            <BoxTile title="A box" kicker="For the table">
              Boxed so it can live on a shelf and come out when people are
              actually in the room.
            </BoxTile>
            <BoxTile title="A QR code" kicker="play.tappen.app">
              Scan it to open a multiplayer room. One device is the stage. Every
              other phone is a controller.
            </BoxTile>
          </div>
        </div>
      </section>

      <section
        id="cards"
        className="w-full scroll-mt-28 border-t-2 border-tappen-blue-900 px-6 py-24"
      >
        <div className="mx-auto flex max-w-screen-xl flex-col gap-12">
          <div className="max-w-3xl text-left">
            <h2 className="font-bang text-5xl uppercase lg:text-7xl">
              From the set
            </h2>
            <p className="mt-4 text-xl leading-relaxed text-tappen-blue-200">
              Six prompts from the official Tappen deck, on the same card the
              stage and the phones show in a room.
            </p>
          </div>
          <div className="grid justify-items-center gap-10 sm:grid-cols-2 xl:grid-cols-3">
            {HOME_SAMPLES.map((card) => (
              <SampleCard key={card.text} card={card} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="play"
        className="w-full scroll-mt-28 border-t-2 border-tappen-blue-900 px-6 py-24"
      >
        <div className="mx-auto grid max-w-screen-xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-8 text-left">
            <h2 className="font-bang text-5xl uppercase lg:text-7xl">
              How it meets the app
            </h2>
            <p className="text-xl leading-relaxed text-tappen-blue-200">
              The card is the conversation. The app is the table’s shared
              screen. The box does not replace play.tappen.app, and the app does
              not replace the box.
            </p>
            <ol className="flex flex-col gap-6">
              <Step n="1" title="Scan the code">
                The insert opens play.tappen.app. The code on this page goes to
                the same place, so you can try the room before the box arrives.
              </Step>
              <Step n="2" title="One stage">
                Prop up a phone, a laptop, or a TV. That device shows the
                current card large enough for the whole table.
              </Step>
              <Step n="3" title="Everyone else joins">
                Other players open the room on their phones as controllers. They
                send the next move. They don’t need the card text on their own
                screen.
              </Step>
            </ol>
            <p className="text-lg text-tappen-blue-200">
              Playing online is free. Buying the box is optional, and it is a
              one-time payment.
            </p>
          </div>
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-[2rem] bg-tappen-blue-50 px-8 py-10 text-tappen-blue-900 shadow-2xl">
            <Image
              src="/home-play-qr.svg"
              alt="QR code that opens https://play.tappen.app"
              width={196}
              height={196}
              unoptimized
            />
            <p className="text-center text-sm font-bold uppercase tracking-[0.22em]">
              play.tappen.app
            </p>
            <Link
              href="https://play.tappen.app"
              className="text-center font-semibold underline decoration-tappen-blue-400 underline-offset-4"
            >
              Open a room
            </Link>
          </div>
        </div>
      </section>

      <section
        id="preorder"
        className="w-full scroll-mt-28 border-t-2 border-tappen-blue-900 px-6 py-24"
      >
        <div className="mx-auto grid max-w-screen-xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="flex flex-col gap-6 text-left">
            <h2 className="font-bang text-5xl uppercase lg:text-7xl">
              Preorder
            </h2>
            <div className="rounded-3xl border-l-4 border-tappen-sunset-400 bg-tappen-blue-900/70 p-6">
              <p className="text-xl font-bold">
                This is a preorder, not a box we ship tomorrow.
              </p>
              <p className="mt-2 text-lg leading-relaxed text-tappen-blue-200">
                We expect to hand orders to the carrier before Christmas 2026,
                by {HOME_SHIP_BY_LABEL}. Transit inside Germany and the EU is on
                top of that and depends on the destination.
              </p>
            </div>
            <dl className="grid gap-4 text-lg">
              <InfoRow label="Price">{unitPrice} incl. VAT, each box</InfoRow>
              <InfoRow label="Shipping, Germany">
                {formatShipping(deCents)} incl. VAT
              </InfoRow>
              <InfoRow label="Shipping, rest of the EU">
                {formatShipping(euCents)} incl. VAT
              </InfoRow>
              <InfoRow label="Payment">
                One-time. Charged today on Stripe.
              </InfoRow>
              <InfoRow label="Delivery">Ships by {HOME_SHIP_BY_LABEL}</InfoRow>
              <InfoRow label="Where">
                Germany and European Union member states
              </InfoRow>
              <InfoRow label="Withdrawal">
                14 days after you receive the box.{" "}
                <Link
                  className="underline underline-offset-4"
                  href="/legal/withdrawal"
                >
                  Read the notice
                </Link>
                .
              </InfoRow>
            </dl>
            <p className="text-base leading-relaxed text-tappen-blue-200">
              The seller is established in Germany. The legal name, address, and
              VAT identification are on the{" "}
              <Link
                className="underline underline-offset-4"
                href="/legal#imprint"
              >
                imprint
              </Link>
              . By continuing you can check the total, including VAT and
              shipping, once more on Stripe before you pay.
            </p>
          </div>
          <div className="rounded-[2rem] border-2 border-tappen-sunset-400/40 bg-tappen-blue-900 p-6 shadow-2xl sm:p-8">
            <CheckoutForm deCents={deCents} euCents={euCents} />
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="w-full scroll-mt-28 border-t-2 border-tappen-blue-900 px-6 py-24"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-8 text-left">
          <h2 className="font-bang text-5xl uppercase lg:text-7xl">
            Questions
          </h2>
          <div className="divide-y divide-tappen-blue-700 border-y border-tappen-blue-700">
            <Faq q="Is this really a preorder?">
              Yes. Tappen Home is not sitting in a warehouse today. You pay once
              now, and we ship before Christmas 2026, by {HOME_SHIP_BY_LABEL}.
            </Faq>
            <Faq q="What will I be charged?">
              {unitPrice} incl. VAT per box, plus {formatShipping(deCents)}{" "}
              shipping in Germany or {formatShipping(euCents)} in the rest of
              the EU. The form shows the total for the quantity and region you
              pick. Stripe shows that same total again before you pay.
            </Faq>
            <Faq q="Where do you ship?">
              Germany and the other member states of the European Union.
              Checkout will not accept an address outside the region you select.
            </Faq>
            <Faq q="Do I need the app?">
              You can read the printed cards with no account and no phone. The
              QR code is there when you want a shared screen and a room on
              play.tappen.app. That part is free.
            </Faq>
            <Faq q="Can I send it back?">
              Yes. You can withdraw within 14 days of receiving the box, without
              giving a reason. If you tell us before we ship, we refund and do
              not send the box. The full notice and a model form are on the{" "}
              <Link
                className="underline underline-offset-4"
                href="/legal/withdrawal"
              >
                withdrawal page
              </Link>
              .
            </Faq>
            <Faq q="Is this a subscription?">
              No. One payment, one box. Nothing on this page signs you up for
              mail or a membership.
            </Faq>
          </div>
        </div>
      </section>
    </>
  );
}

function BoxTile({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border-2 border-tappen-blue-600 bg-tappen-blue-900/80 p-8 text-left">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-tappen-sunset-300">
        {kicker}
      </p>
      <h3 className="font-bang text-4xl uppercase">{title}</h3>
      <p className="text-lg leading-relaxed text-tappen-blue-200">{children}</p>
    </article>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-tappen-blue-200 font-bang text-2xl">
        {n}
      </span>
      <span>
        <span className="block text-xl font-bold">{title}</span>
        <span className="mt-1 block text-lg leading-relaxed text-tappen-blue-200">
          {children}
        </span>
      </span>
    </li>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-tappen-blue-800 pb-3 sm:grid-cols-[12rem_1fr]">
      <dt className="font-bold text-tappen-sunset-300">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-bold [&::-webkit-details-marker]:hidden">
        {q}
        <ChevronDownIcon className="size-5 shrink-0 transition group-open:rotate-180" />
      </summary>
      <p className="pt-3 text-lg leading-relaxed text-tappen-blue-200">
        {children}
      </p>
    </details>
  );
}
