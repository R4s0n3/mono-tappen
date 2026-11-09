import type { Metadata } from "next";
import Link from "next/link";

import { getServerAuthSession } from "@/server/auth";
import { redeemCopy } from "@/server/home/box-code";
import { entitlementCopy } from "@/server/home/entitlement";
import { api } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tappen Home code",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const COPY: Record<string, string> = {
  claimed: redeemCopy.claimed,
  already_yours: redeemCopy.already,
  conflict: redeemCopy.conflict,
  invalid: redeemCopy.invalid,
  unauthenticated: redeemCopy.unauthenticated,
  rejected: redeemCopy.rejected,
  rate_limited: redeemCopy.rate,
  unavailable: redeemCopy.unavailable,
};

export default async function RedeemDonePage({
  searchParams,
}: {
  searchParams: { result?: string };
}) {
  const result = typeof searchParams.result === "string" ? searchParams.result : "";
  const message = COPY[result] ?? "Scan the code in the box to continue.";
  const session = await getServerAuthSession();
  const entitlement = session?.user ? await api.account.entitlement() : null;
  const showEntitlement = result === "claimed" || result === "already_yours";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 px-6 py-16 text-center text-tappen-blue-100">
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50">{redeemCopy.title}</h1>
      <div className="flex w-full max-w-md flex-col gap-4 text-lg leading-relaxed">
        <p>{message}</p>
        {showEntitlement && entitlement ? (
          <div className="flex flex-col gap-2 text-left">
            <p>{entitlement.premium ? entitlementCopy.premiumOn : entitlementCopy.premiumOff}</p>
            <p>
              {entitlement.ownsPremiumSkin ? entitlementCopy.skinOn : entitlementCopy.skinOff}{" "}
              {entitlement.ownsPremiumSkin ? (
                <a className="underline" href="https://hub.tappen.app/card/create">
                  {entitlementCopy.equip}
                </a>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
      <Link href="/" className="text-sm text-tappen-blue-300 underline">
        Back to play
      </Link>
    </main>
  );
}
