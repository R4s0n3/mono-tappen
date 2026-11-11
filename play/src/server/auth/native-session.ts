import type { PrismaClient } from "@prisma/client";

import { displayName, normalizeEmail, planAppleSignIn } from "./apple-account";
import { exchangeAppleAuthorizationCode } from "./apple-client";
import { type AppleJwk, verifyAppleIdentityToken } from "./apple-token";
import { bearerExpiresAt, bearerRowUsable, hashBearerToken, newBearerToken } from "./bearer";
import { erasurePlan } from "./delete-account";
import type { RequestSession } from "./request-session";

const JWKS_URL = "https://appleid.apple.com/auth/keys";
export const APPLE_JWKS_TTL_MS = 60 * 60 * 1000;
export const APPLE_JWKS_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const JWKS_FETCH_TIMEOUT_MS = 10_000;
let jwksCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

export async function loadAppleJwks(
  fetchImpl: typeof fetch,
  options: { now?: number; force?: boolean } = {},
): Promise<AppleJwk[]> {
  const now = options.now ?? Date.now();
  if (jwksCache) {
    const age = now - jwksCache.fetchedAt;
    const withinTtl = age < APPLE_JWKS_TTL_MS;
    const cooldownElapsed = age >= APPLE_JWKS_REFRESH_COOLDOWN_MS;
    if (withinTtl && !(options.force && cooldownElapsed)) return jwksCache.keys;
  }
  const response = await fetchImpl(JWKS_URL, { signal: AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Apple JWKS request failed: ${response.status}`);
  const body = (await response.json()) as { keys?: AppleJwk[] };
  const keys = body.keys ?? [];
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

export function clearAppleJwksCache(): void {
  jwksCache = null;
}

type SignInInput = {
  identityToken: string;
  nonce: string;
  authorizationCode?: string | null;
  givenName?: string | null;
  familyName?: string | null;
};

export async function signInWithAppleIdentity(
  db: PrismaClient,
  input: SignInInput,
  deps: {
    keys: AppleJwk[];
    now?: Date;
    fetchImpl?: typeof fetch;
    env?: NodeJS.ProcessEnv;
    log?: (message: string) => void;
  },
): Promise<{ token: string; expiresAt: Date; user: { id: string; name: string | null; email: string | null } }> {
  const now = deps.now ?? new Date();
  const identity = verifyAppleIdentityToken(input.identityToken, {
    keys: deps.keys,
    nonce: input.nonce,
    now,
  });
  const refreshToken = input.authorizationCode
    ? await exchangeAppleAuthorizationCode(input.authorizationCode, {
        env: deps.env,
        fetchImpl: deps.fetchImpl,
        now,
        log: deps.log,
      })
    : null;
  const name = displayName(input.givenName, input.familyName);
  const email = identity.emailVerified ? normalizeEmail(identity.email) : null;

  const bySub = await db.appleSignIn.findUnique({
    where: { sub: identity.sub },
    include: { user: true },
  });
  const byEmail = email
    ? await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
        include: { appleSignIn: true },
      })
    : null;

  const plan = planAppleSignIn({
    sub: identity.sub,
    email: identity.email,
    emailVerified: identity.emailVerified,
    name,
    bySub: bySub
      ? { id: bySub.userId, email: bySub.user.email, name: bySub.user.name, appleSub: bySub.sub }
      : null,
    byEmail: byEmail
      ? {
          id: byEmail.id,
          email: byEmail.email,
          name: byEmail.name,
          appleSub: byEmail.appleSignIn?.sub ?? null,
        }
      : null,
  });

  const userId = await db.$transaction(async (tx) => {
    if (plan.kind === "create") {
      const created = await tx.user.create({
        data: {
          email: plan.email,
          name: plan.name,
          emailVerified: plan.email ? now : null,
          appleSignIn: {
            create: { sub: identity.sub, email: plan.email, refreshToken },
          },
        },
      });
      return created.id;
    }

    if (plan.attachSub) {
      await tx.appleSignIn.create({
        data: { userId: plan.userId, sub: identity.sub, email, refreshToken },
      });
    } else if (refreshToken !== null || email !== null) {
      await tx.appleSignIn.update({
        where: { userId: plan.userId },
        data: {
          ...(refreshToken ? { refreshToken } : {}),
          ...(email ? { email } : {}),
        },
      });
    }

    if (plan.setEmail !== null || plan.setName !== null) {
      await tx.user.update({
        where: { id: plan.userId },
        data: {
          ...(plan.setEmail ? { email: plan.setEmail, emailVerified: now } : {}),
          ...(plan.setName ? { name: plan.setName } : {}),
        },
      });
    }
    return plan.userId;
  });

  const token = newBearerToken();
  const expiresAt = bearerExpiresAt(now);
  await db.bearerToken.create({
    data: { tokenHash: hashBearerToken(token), userId, expiresAt },
  });
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  return { token, expiresAt, user };
}

export async function sessionForBearerToken(
  db: PrismaClient,
  tokenHash: string,
  now = new Date(),
): Promise<{ session: RequestSession; bearerTokenHash: string } | null> {
  const row = await db.bearerToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!row) return null;
  const usable = bearerRowUsable(
    { expiresAt: row.expiresAt, deletedAt: row.user.deletedAt },
    now,
  );
  if (!usable) {
    if (row.expiresAt.getTime() <= now.getTime()) {
      await db.bearerToken.delete({ where: { id: row.id } }).catch(() => undefined);
    }
    return null;
  }
  return {
    bearerTokenHash: row.tokenHash,
    session: {
      expires: row.expiresAt.toISOString(),
      user: {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        image: row.user.image,
      },
    },
  };
}

export async function eraseUserAccount(db: PrismaClient, userId: string, now: Date): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const orders = user?.email
    ? await db.homeOrder.findMany({
        where: { email: { equals: user.email, mode: "insensitive" } },
        select: { id: true, email: true, amount: true },
      })
    : [];
  const plan = erasurePlan({ email: user?.email ?? null }, orders, now);

  await db.$transaction(async (tx) => {
    await tx.bearerToken.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.appleSignIn.deleteMany({ where: { userId } });
    await tx.appleIapPurchase.deleteMany({ where: { userId } });
    await tx.userSkin.deleteMany({ where: { userId } });
    await tx.deck.updateMany({
      where: { creatorId: userId },
      data: { name: null, image: null, deletedAt: now },
    });
    await tx.player.updateMany({
      where: { userId },
      data: { userId: null, displayName: "Player" },
    });
    if (plan.scrubOrderIds.length > 0) {
      await tx.homeOrder.updateMany({
        where: { id: { in: plan.scrubOrderIds } },
        data: { email: null, name: null, address: null },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        ...plan.user,
        liked_cards: { set: [] },
        liked_decks: { set: [] },
      },
    });
  });
}
