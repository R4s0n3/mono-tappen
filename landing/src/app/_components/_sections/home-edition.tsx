import Link from "next/link";

import { SampleCard } from "@/app/home-edition/_components/sample-card";
import { HOME_SAMPLES, type SamplePrompt } from "@/lib/home/samples";
import {
  HOME_UNIT_AMOUNT_CENTS,
  formatEur,
  formatShipping,
} from "@/lib/home/product";

export function HomeEdition({
  deCents,
  euCents,
}: {
  deCents: number;
  euCents: number;
}) {
  const front = HOME_SAMPLES[0];
  const left = HOME_SAMPLES[1];
  const right = HOME_SAMPLES[2];

  return (
    <section id="home-edition" className="w-full scroll-mt-32">
      <div className="mx-auto grid max-w-screen-xl items-center gap-8 overflow-hidden rounded-[2rem] border-2 border-tappen-sunset-400/80 bg-tappen-blue-900 px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-12 lg:py-10">
        <div className="flex flex-col items-start gap-4 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
            The printed set
          </p>
          <h2 className="font-bang text-5xl uppercase leading-none sm:text-6xl lg:text-7xl">
            Tappen Home
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            <li className="rounded-full bg-tappen-blue-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-tappen-blue-100 sm:text-xs">
              100 cards
            </li>
            <li className="rounded-full bg-tappen-blue-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-tappen-blue-100 sm:text-xs">
              English only
            </li>
            <li className="rounded-full bg-tappen-blue-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-tappen-blue-100 sm:text-xs">
              Germany &amp; EU
            </li>
          </ul>
          <p className="text-4xl font-bold tracking-tight">
            {formatEur(HOME_UNIT_AMOUNT_CENTS)}
            <span className="ml-2 text-base font-normal text-tappen-blue-200">
              incl. VAT
            </span>
          </p>
          <p className="text-balance text-lg font-bold text-tappen-sunset-200">
            Preorder — arrives before{" "}
            <span className="whitespace-nowrap">Christmas 2026</span>
          </p>
          <p className="max-w-xl text-base leading-relaxed text-tappen-blue-100 sm:text-lg">
            Each box includes a single-use QR code that permanently unlocks
            Tappen Premium and the Premium card skin in the app for one account.
          </p>
          <p className="text-sm leading-relaxed text-tappen-blue-200 sm:text-base">
            Shipping, Germany: {formatShipping(deCents)} incl. VAT. Rest of the
            EU: {formatShipping(euCents)} incl. VAT. One-time payment.
          </p>
          <Link
            href="/home-edition"
            className="mt-1 inline-flex rounded-full bg-tappen-sunset-500 px-8 py-4 text-lg font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-blue-50"
          >
            Preorder the box
          </Link>
        </div>
        <CardStack front={front} left={left} right={right} />
      </div>
    </section>
  );
}

function CardStack({
  front,
  left,
  right,
}: {
  front: SamplePrompt | undefined;
  left: SamplePrompt | undefined;
  right: SamplePrompt | undefined;
}) {
  if (!front) return null;

  return (
    <div className="relative mx-auto w-full max-w-xs px-3 py-2 sm:px-4">
      <div className="relative aspect-[5/6.9] w-full">
        {left ? (
          <div className="absolute inset-0 origin-bottom -translate-x-5 translate-y-3 -rotate-6">
            <SampleCard card={left} />
          </div>
        ) : null}
        {right ? (
          <div className="absolute inset-0 origin-bottom translate-x-5 translate-y-4 rotate-6">
            <SampleCard card={right} />
          </div>
        ) : null}
        <div className="absolute inset-0 z-10 drop-shadow-2xl">
          <SampleCard card={front} />
        </div>
      </div>
    </div>
  );
}
