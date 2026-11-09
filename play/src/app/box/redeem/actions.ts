"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import {
  clientIp,
  handleBoxHttp,
  logBoxEvent,
  type BoxOutcome,
} from "@/server/home/box-code";
import { createPrismaBoxStore } from "@/server/home/box-code-prisma";

const OUTCOMES = new Set<BoxOutcome>([
  "invalid",
  "ready",
  "claimed",
  "already_yours",
  "conflict",
  "unauthenticated",
  "rejected",
  "rate_limited",
  "unavailable",
]);

export async function claimBoxCodeAction(formData: FormData): Promise<void> {
  const raw = formData.get("code");
  const code = typeof raw === "string" ? raw : "";
  const headerList = headers();
  const session = await getServerAuthSession();
  const result = await handleBoxHttp({
    method: "POST",
    code,
    userId: session?.user.id ?? null,
    origin: headerList.get("origin"),
    host: headerList.get("x-forwarded-host") ?? headerList.get("host"),
    fetchSite: headerList.get("sec-fetch-site"),
    ip: clientIp(headerList),
    pepper: process.env.BOX_CODE_PEPPER ?? "",
    store: createPrismaBoxStore(db),
    now: new Date(),
    log: logBoxEvent,
  });
  const outcome = OUTCOMES.has(result.outcome) ? result.outcome : "unavailable";
  redirect(`/box/redeem/done?result=${outcome}`);
}
