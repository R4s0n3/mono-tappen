import type { Metadata } from "next";

import { StorefrontShell } from "@/app/_components/storefront-shell";
import { HomeEditionStory } from "@/app/home-edition/_components/story";
import {
  HOME_SHIP_BY_LABEL,
  HOME_UNIT_AMOUNT_CENTS,
  formatEur,
} from "@/lib/home/product";
import { env } from "@/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tappen Home — preorder the printed set",
  description: `Preorder Tappen Home: 100 original English cards, boxed, with a QR code to play.tappen.app. ${formatEur(HOME_UNIT_AMOUNT_CENTS)} incl. VAT. Ships to Germany and the EU before Christmas 2026 (by ${HOME_SHIP_BY_LABEL}).`,
};

export default function HomeEditionPage() {
  return (
    <StorefrontShell>
      <HomeEditionStory
        deCents={env.HOME_SHIPPING_DE_CENTS}
        euCents={env.HOME_SHIPPING_EU_CENTS}
      />
    </StorefrontShell>
  );
}
