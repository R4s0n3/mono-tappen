import Link from "next/link";

import { SampleCard } from "@/app/home-edition/_components/sample-card";
import { HOME_SAMPLES } from "@/lib/home/samples";
import {
  HOME_SHIP_BY_LABEL,
  HOME_UNIT_AMOUNT_CENTS,
  formatEur,
} from "@/lib/home/product";

export function HomeEdition() {
  const featured = HOME_SAMPLES[0];

  return (
    <section
      id="home-edition"
      className="w-full border-t-2 border-tappen-blue-900 px-6 py-24"
    >
      <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-2xl flex-col items-start gap-5 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
            Preorder · ships by {HOME_SHIP_BY_LABEL}
          </p>
          <h2 className="font-bang text-6xl uppercase leading-none lg:text-7xl">
            Tappen Home
          </h2>
          <p className="text-2xl leading-snug lg:text-3xl">
            The original hundred, printed and boxed, with a QR code that opens a
            room on play.tappen.app.
          </p>
          <p className="text-lg leading-relaxed text-tappen-blue-200">
            One-time payment of {formatEur(HOME_UNIT_AMOUNT_CENTS)} incl. VAT,
            plus shipping to Germany and the EU. Not a subscription.
          </p>
          <Link
            href="/home-edition"
            className="rounded-full bg-tappen-sunset-500 px-8 py-4 text-lg font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
          >
            Preorder the box
          </Link>
        </div>
        {featured ? (
          <div className="rotate-2">
            <SampleCard card={featured} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
