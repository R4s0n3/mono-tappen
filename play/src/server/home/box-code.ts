import crypto from "node:crypto";

import { describeEntitlement, type EntitlementView } from "./entitlement";

export const BOX_CODE_BYTES = 32;
export const FAILURE_LIMIT = 8;
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const MAX_ISSUE_COUNT = 100;
export const MIN_PEPPER_LENGTH = 32;

const BOX_CODE_PATTERN = /^tbx_[A-Za-z0-9_-]{43}$/;

export const redeemCopy = {
  title: "Claim your Tappen Home code",
  scanDoesNotClaim: "Scanning this code does not claim it.",
  signInLead:
    "Sign in to the account that should keep Tappen Premium and the Premium card skin. The unlock is permanent and belongs to one account.",
  signIn: "Sign in and return to this page",
  claimButton: "Claim for this account",
  differentAccount: "Use a different account",
  invalid: "This code is not valid.",
  conflict: "This code has already been claimed by another account.",
  rate: "Too many attempts. Wait a few minutes and try again.",
  unavailable: "Claiming is not available right now. Nothing was claimed.",
  claimed: "Tappen Premium and the Premium card skin are now on this account.",
  already:
    "This account already claimed this code. Tappen Premium and the Premium card skin stay on this account.",
  unauthenticated: "Sign in before claiming this code. Scanning it does not claim it.",
  rejected: "This claim could not be accepted.",
} as const;

const ALLOWED_REDEEM_ORIGINS = new Set([
  "https://play.tappen.app",
  "http://play.tappen.local:3001",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]);

export class BoxCodeError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "BoxCodeError";
    this.reason = reason;
  }
}

export type BoxCodeStatus = "ISSUED" | "REDEEMED" | "VOID";

export type BoxCodeRecord = {
  id: string;
  codeHash: string;
  status: BoxCodeStatus;
  homeOrderId: string | null;
  redeemedByUserId: string | null;
  redeemedAt: Date | null;
  voidedAt: Date | null;
};

export type SubscriptionRecord = {
  status: string;
  stripeId: string;
  endsAt: Date | null;
};

export type SkinGrant = {
  skinId: string;
  acquiredAt: Date;
};

export type AccountRecord = {
  subscription: SubscriptionRecord | null;
  skins: SkinGrant[];
};

export type HomeOrderLock = {
  id: string;
  status: string;
  quantity: number;
};

export type BoxCodeDraft = {
  id: string;
  code: string;
  codeHash: string;
};

export interface BoxTx {
  findCode(codeHash: string): Promise<BoxCodeRecord | null>;
  lockCode(codeHash: string): Promise<BoxCodeRecord | null>;
  markRedeemed(id: string, userId: string, at: Date): Promise<boolean>;
  readAccount(userId: string): Promise<AccountRecord>;
  writeAccount(userId: string, account: AccountRecord): Promise<void>;
  premiumSkinId(): Promise<string | null>;
  countActiveCodes(homeOrderId: string): Promise<number>;
  lockOrder(homeOrderId: string): Promise<HomeOrderLock | null>;
  insertCodes(
    rows: readonly { id: string; codeHash: string; homeOrderId: string | null }[],
  ): Promise<void>;
  voidIssued(homeOrderId: string, at: Date): Promise<number>;
  countFailures(ipHash: string, since: Date): Promise<number>;
  recordFailure(ipHash: string, at: Date): Promise<void>;
}

export interface BoxStore {
  transaction<T>(fn: (tx: BoxTx) => Promise<T>): Promise<T>;
}

export type BoxLog = (
  event: string,
  fields: Readonly<Record<string, string | number | boolean | null>>,
) => void;

export type BoxOutcome =
  | "invalid"
  | "ready"
  | "claimed"
  | "already_yours"
  | "conflict"
  | "unauthenticated"
  | "rejected"
  | "rate_limited"
  | "unavailable";

export type BoxHttpResult = {
  httpStatus: number;
  outcome: BoxOutcome;
  entitlement: EntitlementView | null;
  signInHref: string | null;
  signOutHref: string | null;
};

export type BoxHttpInput = {
  method: string;
  code: string;
  userId: string | null;
  origin: string | null;
  host: string | null;
  fetchSite: string | null;
  ip: string;
  pepper: string;
  store: BoxStore;
  now: Date;
  log: BoxLog;
};

type MemoryState = {
  codes: Map<string, BoxCodeRecord>;
  accounts: Map<string, AccountRecord>;
  orders: Map<string, HomeOrderLock>;
  attempts: { ipHash: string; createdAt: Date }[];
  premiumSkinId: string | null;
};

export type MemoryBoxStore = BoxStore & {
  snapshot(): MemoryState;
  seedOrder(order: HomeOrderLock): void;
  seedAccount(userId: string, account: AccountRecord): void;
};

export function logBoxEvent(
  event: string,
  fields: Readonly<Record<string, string | number | boolean | null>>,
): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

export function isBoxCode(code: string): boolean {
  return BOX_CODE_PATTERN.test(code);
}

export function assertPepper(pepper: string): void {
  if (typeof pepper !== "string" || pepper.length < MIN_PEPPER_LENGTH) {
    throw new BoxCodeError("pepper");
  }
}

export function hashBoxCode(code: string, pepper: string): string {
  assertPepper(pepper);
  return crypto.createHmac("sha256", pepper).update(`code:${code}`).digest("hex");
}

export function hashIp(ip: string, pepper: string): string {
  assertPepper(pepper);
  return crypto.createHmac("sha256", pepper).update(`ip:${ip}`).digest("hex");
}

export function generateBoxCode(): string {
  return `tbx_${crypto.randomBytes(BOX_CODE_BYTES).toString("base64url")}`;
}

export function claimIssuedRow(
  row: BoxCodeRecord,
  userId: string,
  at: Date,
): BoxCodeRecord | null {
  if (row.status !== "ISSUED") return null;
  return {
    ...row,
    status: "REDEEMED",
    redeemedByUserId: userId,
    redeemedAt: at,
  };
}

export function applyPremiumGrant(input: {
  boxCodeId: string;
  now: Date;
  account: AccountRecord;
  premiumSkinId: string;
}): AccountRecord {
  const existing = input.account.subscription;
  let subscription: SubscriptionRecord;
  if (existing && existing.status === "active" && existing.endsAt == null) {
    subscription = existing;
  } else if (existing) {
    subscription = {
      status: "active",
      stripeId: existing.stripeId,
      endsAt: null,
    };
  } else {
    subscription = {
      status: "active",
      stripeId: `home-box:${input.boxCodeId}`,
      endsAt: null,
    };
  }

  const owns = input.account.skins.some((skin) => skin.skinId === input.premiumSkinId);
  const skins = owns
    ? input.account.skins
    : [...input.account.skins, { skinId: input.premiumSkinId, acquiredAt: input.now }];

  return { subscription, skins };
}

export function redemptionReturnPath(code: string): string | null {
  if (!isBoxCode(code)) return null;
  return `/box/redeem?code=${encodeURIComponent(code)}`;
}

export function signInHref(code: string): string | null {
  const path = redemptionReturnPath(code);
  if (!path) return null;
  return `/api/auth/signin?callbackUrl=${encodeURIComponent(path)}`;
}

export function signOutHref(code: string): string | null {
  const path = redemptionReturnPath(code);
  if (!path) return null;
  return `/api/auth/signout?callbackUrl=${encodeURIComponent(path)}`;
}

export function isSafeRedeemReturn(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(path, "https://play.tappen.app");
  } catch {
    return false;
  }
  if (url.origin !== "https://play.tappen.app") return false;
  if (url.pathname !== "/box/redeem") return false;
  const code = url.searchParams.get("code");
  return code !== null && isBoxCode(code) && path === redemptionReturnPath(code);
}

export function postOriginAllowed(input: {
  origin: string | null;
  host: string | null;
  fetchSite: string | null;
}): boolean {
  const host = input.host?.split(",")[0]?.trim().toLowerCase();
  if (!host || !input.origin) return false;
  let originUrl: URL;
  try {
    originUrl = new URL(input.origin);
  } catch {
    return false;
  }
  if (originUrl.protocol !== "https:" && originUrl.protocol !== "http:") return false;
  if (originUrl.host.toLowerCase() !== host) return false;
  if (input.fetchSite && input.fetchSite !== "same-origin") return false;
  return true;
}

export function clientIp(headerList: { get(name: string): string | null }): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return "unknown";
}

export function accountLabel(input: { email?: string | null; name?: string | null }): string {
  const email = input.email?.trim() ?? "";
  const name = input.name?.trim() ?? "";
  const raw = email.length > 0 ? email : name.length > 0 ? name : "this account";
  return raw.replace(/[\u0000-\u001f]/g, " ").slice(0, 80);
}

export function claimConfirmation(label: string): string {
  const account = label.trim() || "this account";
  return `Claiming permanently unlocks Tappen Premium and the Premium card skin for ${account}. It stays on this account. It is not limited to one room or a stretch of time, and another account cannot claim this code.`;
}

export function boxRedeemUrl(baseOrigin: string, code: string): string {
  if (!isBoxCode(code)) throw new BoxCodeError("code");
  let url: URL;
  try {
    url = new URL(baseOrigin);
  } catch {
    throw new BoxCodeError("base_url");
  }
  if (!ALLOWED_REDEEM_ORIGINS.has(url.origin)) throw new BoxCodeError("base_url");
  if (url.username || url.password || (url.pathname !== "/" && url.pathname !== "")) {
    throw new BoxCodeError("base_url");
  }
  return `${url.origin}/box/redeem?code=${encodeURIComponent(code)}`;
}

export function generateBoxDrafts(count: number, pepper: string): BoxCodeDraft[] {
  assertPepper(pepper);
  if (!Number.isInteger(count) || count < 1 || count > MAX_ISSUE_COUNT) {
    throw new BoxCodeError("count");
  }
  return Array.from({ length: count }, () => {
    const code = generateBoxCode();
    return {
      id: crypto.randomUUID(),
      code,
      codeHash: hashBoxCode(code, pepper),
    };
  });
}

export async function commitBoxDrafts(
  store: BoxStore,
  input: {
    drafts: readonly Pick<BoxCodeDraft, "id" | "codeHash">[];
    homeOrderId: string | null;
    unassigned: boolean;
  },
): Promise<void> {
  if (input.drafts.length < 1 || input.drafts.length > MAX_ISSUE_COUNT) {
    throw new BoxCodeError("count");
  }
  if (input.homeOrderId && input.unassigned) throw new BoxCodeError("order_conflict");
  if (!input.homeOrderId && !input.unassigned) throw new BoxCodeError("unassigned_required");

  await store.transaction(async (tx) => {
    if (input.homeOrderId) {
      const order = await tx.lockOrder(input.homeOrderId);
      if (!order) throw new BoxCodeError("order_missing");
      if (order.status !== "PAID" && order.status !== "SHIPPED") {
        throw new BoxCodeError("order_not_payable");
      }
      const existing = await tx.countActiveCodes(input.homeOrderId);
      if (existing + input.drafts.length > order.quantity) {
        throw new BoxCodeError("order_quantity");
      }
    }
    await tx.insertCodes(
      input.drafts.map((draft) => ({
        id: draft.id,
        codeHash: draft.codeHash,
        homeOrderId: input.homeOrderId,
      })),
    );
  });
}

export async function issueBoxCodes(
  store: BoxStore,
  input: {
    count: number;
    pepper: string;
    homeOrderId: string | null;
    unassigned: boolean;
  },
): Promise<{ id: string; code: string }[]> {
  const drafts = generateBoxDrafts(input.count, input.pepper);
  await commitBoxDrafts(store, {
    drafts,
    homeOrderId: input.homeOrderId,
    unassigned: input.unassigned,
  });
  return drafts.map((draft) => ({ id: draft.id, code: draft.code }));
}

export async function voidIssuedBoxCodes(
  store: BoxStore,
  homeOrderId: string,
  now: Date,
): Promise<number> {
  if (!homeOrderId) throw new BoxCodeError("order_missing");
  return store.transaction(async (tx) => {
    const order = await tx.lockOrder(homeOrderId);
    if (!order) throw new BoxCodeError("order_missing");
    return tx.voidIssued(homeOrderId, now);
  });
}

export function createMemoryBoxStore(seed?: { premiumSkinId?: string | null }): MemoryBoxStore {
  let state: MemoryState = {
    codes: new Map(),
    accounts: new Map(),
    orders: new Map(),
    attempts: [],
    premiumSkinId: seed?.premiumSkinId !== undefined ? seed.premiumSkinId : "skin_premium",
  };
  let tail: Promise<void> = Promise.resolve();

  const tx: BoxTx = {
    async findCode(codeHash) {
      const row = state.codes.get(codeHash);
      return row ? structuredClone(row) : null;
    },
    async lockCode(codeHash) {
      const row = state.codes.get(codeHash);
      return row ? structuredClone(row) : null;
    },
    async markRedeemed(id, userId, at) {
      const current = [...state.codes.values()].find((row) => row.id === id);
      if (!current) return false;
      const next = claimIssuedRow(current, userId, at);
      if (!next) return false;
      state.codes.set(next.codeHash, next);
      return true;
    },
    async readAccount(userId) {
      const account = state.accounts.get(userId);
      return account
        ? structuredClone(account)
        : { subscription: null, skins: [] };
    },
    async writeAccount(userId, account) {
      state.accounts.set(userId, structuredClone(account));
    },
    async premiumSkinId() {
      return state.premiumSkinId;
    },
    async countActiveCodes(homeOrderId) {
      let count = 0;
      for (const row of state.codes.values()) {
        if (row.homeOrderId === homeOrderId && (row.status === "ISSUED" || row.status === "REDEEMED")) {
          count += 1;
        }
      }
      return count;
    },
    async lockOrder(homeOrderId) {
      const order = state.orders.get(homeOrderId);
      return order ? structuredClone(order) : null;
    },
    async insertCodes(rows) {
      for (const row of rows) {
        if (state.codes.has(row.codeHash)) throw new BoxCodeError("duplicate");
        state.codes.set(row.codeHash, {
          id: row.id,
          codeHash: row.codeHash,
          status: "ISSUED",
          homeOrderId: row.homeOrderId,
          redeemedByUserId: null,
          redeemedAt: null,
          voidedAt: null,
        });
      }
    },
    async voidIssued(homeOrderId, at) {
      let count = 0;
      for (const [hash, row] of state.codes) {
        if (row.homeOrderId === homeOrderId && row.status === "ISSUED") {
          state.codes.set(hash, { ...row, status: "VOID", voidedAt: at });
          count += 1;
        }
      }
      return count;
    },
    async countFailures(ipHash, since) {
      return state.attempts.filter(
        (attempt) => attempt.ipHash === ipHash && attempt.createdAt.getTime() >= since.getTime(),
      ).length;
    },
    async recordFailure(ipHash, at) {
      state.attempts.push({ ipHash, createdAt: at });
    },
  };

  return {
    snapshot() {
      return structuredClone(state);
    },
    seedOrder(order) {
      state.orders.set(order.id, structuredClone(order));
    },
    seedAccount(userId, account) {
      state.accounts.set(userId, structuredClone(account));
    },
    transaction(fn) {
      const run = tail.then(async () => {
        const snapshot = structuredClone(state);
        try {
          return await fn(tx);
        } catch (error) {
          state = snapshot;
          throw error;
        }
      });
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}

function emptyResult(outcome: BoxOutcome, httpStatus: number): BoxHttpResult {
  return {
    httpStatus,
    outcome,
    entitlement: null,
    signInHref: null,
    signOutHref: null,
  };
}

function emit(
  log: BoxLog,
  event: string,
  fields: Readonly<Record<string, string | number | boolean | null>>,
  secrets: readonly string[],
): void {
  const encoded = JSON.stringify(fields);
  for (const secret of secrets) {
    if (secret.length >= 8 && encoded.includes(secret)) {
      throw new Error("Refusing to log a box secret");
    }
  }
  log(event, fields);
}

async function overLimit(store: BoxStore, ipHash: string, now: Date): Promise<boolean> {
  return store.transaction(async (tx) => {
    const since = new Date(now.getTime() - FAILURE_WINDOW_MS);
    const count = await tx.countFailures(ipHash, since);
    return count >= FAILURE_LIMIT;
  });
}

async function rememberFailure(store: BoxStore, ipHash: string, now: Date): Promise<void> {
  await store.transaction(async (tx) => {
    await tx.recordFailure(ipHash, now);
  });
}

async function entitlementFor(tx: BoxTx, userId: string): Promise<EntitlementView> {
  const premiumSkinId = await tx.premiumSkinId();
  const account = await tx.readAccount(userId);
  return describeEntitlement({
    subscription: account.subscription,
    ownedSkinIds: account.skins.map((skin) => skin.skinId),
    premiumSkinId,
  });
}

async function ensurePremium(
  tx: BoxTx,
  userId: string,
  boxCodeId: string,
  now: Date,
): Promise<EntitlementView> {
  const premiumSkinId = await tx.premiumSkinId();
  if (!premiumSkinId) throw new BoxCodeError("premium_skin_missing");
  const account = await tx.readAccount(userId);
  const next = applyPremiumGrant({
    boxCodeId,
    now,
    account,
    premiumSkinId,
  });
  await tx.writeAccount(userId, next);
  return describeEntitlement({
    subscription: next.subscription,
    ownedSkinIds: next.skins.map((skin) => skin.skinId),
    premiumSkinId,
  });
}

async function redeemInTransaction(
  tx: BoxTx,
  input: { codeHash: string; userId: string; now: Date },
): Promise<{ outcome: "invalid" | "claimed" | "already_yours" | "conflict"; entitlement: EntitlementView | null; codeId: string | null }> {
  const row = await tx.lockCode(input.codeHash);
  if (!row || row.status === "VOID") {
    return { outcome: "invalid", entitlement: null, codeId: null };
  }
  if (row.status === "REDEEMED") {
    if (row.redeemedByUserId !== input.userId) {
      return { outcome: "conflict", entitlement: null, codeId: row.id };
    }
    const entitlement = await ensurePremium(tx, input.userId, row.id, input.now);
    return { outcome: "already_yours", entitlement, codeId: row.id };
  }
  const entitlement = await ensurePremium(tx, input.userId, row.id, input.now);
  const marked = await tx.markRedeemed(row.id, input.userId, input.now);
  if (!marked) throw new BoxCodeError("race");
  return { outcome: "claimed", entitlement, codeId: row.id };
}

export async function handleBoxHttp(input: BoxHttpInput): Promise<BoxHttpResult> {
  const code = input.code.trim();
  const secrets = [code, input.pepper];
  const log: BoxLog = (event, fields) => {
    emit(input.log, event, fields, secrets);
  };

  if (input.pepper.length < MIN_PEPPER_LENGTH) {
    log("box_redeem", { outcome: "unavailable" });
    return emptyResult("unavailable", 503);
  }

  const ipHash = hashIp(input.ip || "unknown", input.pepper);
  const limited = await overLimit(input.store, ipHash, input.now);
  if (limited) {
    log("box_redeem", { outcome: "rate_limited" });
    return emptyResult("rate_limited", 429);
  }

  if (input.method === "GET") {
    return preview(input, code, ipHash, log);
  }

  if (input.method !== "POST") {
    log("box_redeem", { outcome: "rejected" });
    return emptyResult("rejected", 405);
  }
  if (!postOriginAllowed(input)) {
    log("box_redeem", { outcome: "rejected" });
    return emptyResult("rejected", 403);
  }
  if (!input.userId) {
    log("box_redeem", { outcome: "unauthenticated" });
    return {
      ...emptyResult("unauthenticated", 401),
      signInHref: isBoxCode(code) ? signInHref(code) : null,
    };
  }

  return consume(input, code, input.userId, ipHash, log);
}

async function preview(
  input: BoxHttpInput,
  code: string,
  ipHash: string,
  log: BoxLog,
): Promise<BoxHttpResult> {
  if (!isBoxCode(code)) {
    await rememberFailure(input.store, ipHash, input.now);
    log("box_redeem", { outcome: "invalid" });
    return emptyResult("invalid", 400);
  }

  const codeHash = hashBoxCode(code, input.pepper);
  const viewed = await input.store.transaction(async (tx) => {
    const row = await tx.findCode(codeHash);
    if (!row || row.status === "VOID") return { outcome: "invalid" as const, entitlement: null, codeId: null };
    if (row.status === "REDEEMED") {
      if (input.userId && row.redeemedByUserId === input.userId) {
        const entitlement = await entitlementFor(tx, input.userId);
        return { outcome: "already_yours" as const, entitlement, codeId: row.id };
      }
      return { outcome: "conflict" as const, entitlement: null, codeId: row.id };
    }
    return { outcome: "ready" as const, entitlement: null, codeId: row.id };
  });

  if (viewed.outcome === "invalid") {
    await rememberFailure(input.store, ipHash, input.now);
  }

  log("box_redeem", { outcome: viewed.outcome, codeId: viewed.codeId });
  return {
    httpStatus: viewed.outcome === "invalid" ? 400 : 200,
    outcome: viewed.outcome,
    entitlement: viewed.entitlement,
    signInHref: input.userId ? null : signInHref(code),
    signOutHref: input.userId ? signOutHref(code) : null,
  };
}

async function consume(
  input: BoxHttpInput,
  code: string,
  userId: string,
  ipHash: string,
  log: BoxLog,
): Promise<BoxHttpResult> {
  if (!isBoxCode(code)) {
    await rememberFailure(input.store, ipHash, input.now);
    log("box_redeem", { outcome: "invalid" });
    return emptyResult("invalid", 400);
  }

  const codeHash = hashBoxCode(code, input.pepper);
  const run = () =>
    input.store.transaction((tx) => redeemInTransaction(tx, { codeHash, userId, now: input.now }));

  let redeemed: Awaited<ReturnType<typeof run>>;
  try {
    redeemed = await run();
  } catch (error) {
    if (error instanceof BoxCodeError && error.reason === "premium_skin_missing") {
      log("box_redeem", { outcome: "unavailable" });
      return emptyResult("unavailable", 503);
    }
    if (error instanceof BoxCodeError && error.reason === "race") {
      try {
        redeemed = await run();
      } catch (retryError) {
        if (retryError instanceof BoxCodeError && retryError.reason === "premium_skin_missing") {
          log("box_redeem", { outcome: "unavailable" });
          return emptyResult("unavailable", 503);
        }
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  if (redeemed.outcome === "invalid" || redeemed.outcome === "conflict") {
    await rememberFailure(input.store, ipHash, input.now);
  }

  log("box_redeem", { outcome: redeemed.outcome, codeId: redeemed.codeId });
  const httpStatus =
    redeemed.outcome === "invalid" ? 400 : redeemed.outcome === "conflict" ? 409 : 200;
  return {
    httpStatus,
    outcome: redeemed.outcome,
    entitlement: redeemed.entitlement,
    signInHref: null,
    signOutHref: signOutHref(code),
  };
}
