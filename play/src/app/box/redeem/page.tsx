import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { getServerAuthSession } from "@/server/auth";
import {
  accountLabel,
  claimConfirmation,
  clientIp,
  handleBoxHttp,
  logBoxEvent,
  redeemCopy,
} from "@/server/home/box-code";
import { createPrismaBoxStore } from "@/server/home/box-code-prisma";
import { entitlementCopy } from "@/server/home/entitlement";
import { db } from "@/server/db";

import { claimBoxCodeAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim your Tappen Home code",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function EntitlementLines({
  premium,
  ownsPremiumSkin,
}: {
  premium: boolean;
  ownsPremiumSkin: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 text-left text-tappen-blue-100">
      <p>{premium ? entitlementCopy.premiumOn : entitlementCopy.premiumOff}</p>
      <p>
        {ownsPremiumSkin ? entitlementCopy.skinOn : entitlementCopy.skinOff}{" "}
        {ownsPremiumSkin ? entitlementCopy.equip : ""}
      </p>
    </div>
  );
}

export default async function RedeemPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = typeof searchParams.code === "string" ? searchParams.code : "";
  const session = await getServerAuthSession();
  const headerList = headers();
  const result = await handleBoxHttp({
    method: "GET",
    code,
    userId: session?.user.id ?? null,
    origin: null,
    host: null,
    fetchSite: null,
    ip: clientIp(headerList),
    pepper: process.env.BOX_CODE_PEPPER ?? "",
    store: createPrismaBoxStore(db),
    now: new Date(),
    log: logBoxEvent,
  });
  const label = accountLabel({
    email: session?.user.email,
    name: session?.user.name,
  });
  const signInHref = result.signInHref?.startsWith("/") ? result.signInHref : null;
  const signOutHref = result.signOutHref?.startsWith("/") ? result.signOutHref : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 px-6 py-16 text-center text-tappen-blue-100">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
        Tappen Home
      </p>
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50 sm:text-5xl">{redeemCopy.title}</h1>
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-lg leading-relaxed">
        <p>{redeemCopy.scanDoesNotClaim}</p>
        {result.outcome === "invalid" ? <p>{redeemCopy.invalid}</p> : null}
        {result.outcome === "rate_limited" ? <p>{redeemCopy.rate}</p> : null}
        {result.outcome === "unavailable" ? <p>{redeemCopy.unavailable}</p> : null}
        {result.outcome === "conflict" ? <p>{redeemCopy.conflict}</p> : null}
        {result.outcome === "already_yours" ? (
          <>
            <p>{redeemCopy.already}</p>
            {result.entitlement ? (
              <EntitlementLines
                premium={result.entitlement.premium}
                ownsPremiumSkin={result.entitlement.ownsPremiumSkin}
              />
            ) : null}
          </>
        ) : null}
        {result.outcome === "ready" && !session?.user ? (
          <>
            <p>{redeemCopy.signInLead}</p>
            {signInHref ? (
              <a
                href={signInHref}
                className="font-lilita-one w-full rounded-full bg-tappen-sunset-500 px-6 py-4 text-xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
              >
                {redeemCopy.signIn}
              </a>
            ) : null}
          </>
        ) : null}
        {result.outcome === "ready" && session?.user ? (
          <form action={claimBoxCodeAction} method="post" className="flex w-full flex-col gap-4 text-left">
            <p>{claimConfirmation(label)}</p>
            <p className="text-base text-tappen-blue-200">Signed in as {label}.</p>
            <input type="hidden" name="code" value={code} />
            <button
              type="submit"
              className="font-lilita-one rounded-full bg-tappen-sunset-500 px-6 py-4 text-xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
            >
              {redeemCopy.claimButton}
            </button>
            {signOutHref ? (
              <a href={signOutHref} className="text-center text-sm text-tappen-blue-200 underline">
                {redeemCopy.differentAccount}
              </a>
            ) : null}
          </form>
        ) : null}
      </div>
      <Link href="/" className="text-sm text-tappen-blue-300 underline">
        Back to play
      </Link>
    </main>
  );
}
