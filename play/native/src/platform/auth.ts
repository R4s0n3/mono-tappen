import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { Capacitor } from "@capacitor/core";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const TOKEN_KEY = "bearer";
const PREMIUM_ACCOUNT_KEY = "premium-account";
const BUNDLE_ID = "app.tappen.ios";

let memoryToken: string | null = null;
let storageReady: Promise<void> | null = null;

function prepareKeychain(): Promise<void> {
  storageReady ??= (async () => {
    await SecureStorage.setSynchronize(false);
    await SecureStorage.setKeyPrefix("tappen.");
  })().catch((error: unknown) => {
    storageReady = null;
    throw error;
  });
  return storageReady;
}

export function rememberAccessToken(token: string | null): void {
  memoryToken = token;
}

/** Keychain on iOS. The browser preview keeps the token in memory only. */
export async function getAccessToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    await prepareKeychain();
    const stored = await SecureStorage.get(TOKEN_KEY);
    memoryToken = typeof stored === "string" && stored !== "" ? stored : null;
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export async function saveAccessToken(token: string): Promise<void> {
  memoryToken = token;
  if (!Capacitor.isNativePlatform()) return;
  await prepareKeychain();
  await SecureStorage.set(TOKEN_KEY, token);
}

/**
 * Stable StoreKit account token for this Tappen user. A later approval is
 * claimed only when the signed-in user still owns this token.
 */
export async function premiumAppAccountToken(userId: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) return crypto.randomUUID();
  await prepareKeychain();
  let tokens: Record<string, string> = {};
  try {
    const stored = await SecureStorage.get(PREMIUM_ACCOUNT_KEY);
    if (typeof stored === "string" && stored !== "") {
      const parsed = JSON.parse(stored) as unknown;
      if (parsed && typeof parsed === "object") {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string") tokens[key] = value;
        }
      }
    }
  } catch {
    tokens = {};
  }
  const existing = tokens[userId];
  if (existing) return existing;
  const created = crypto.randomUUID();
  tokens[userId] = created;
  await SecureStorage.set(PREMIUM_ACCOUNT_KEY, JSON.stringify(tokens));
  return created;
}

export async function clearAccessToken(): Promise<void> {
  memoryToken = null;
  if (!Capacitor.isNativePlatform()) return;
  await prepareKeychain();
  await SecureStorage.remove(TOKEN_KEY);
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type AppleCredential = {
  nonce: string;
  identityToken: string;
  authorizationCode: string;
  givenName: string | null;
  familyName: string | null;
};

export async function requestAppleCredential(): Promise<AppleCredential> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Sign in with Apple runs on the iPhone app.");
  }
  const nonce = randomNonce();
  const result = await SignInWithApple.authorize({
    clientId: BUNDLE_ID,
    redirectURI: "https://play.tappen.app",
    scopes: "email name",
    nonce: await sha256Hex(nonce),
  });
  return {
    nonce,
    identityToken: result.response.identityToken,
    authorizationCode: result.response.authorizationCode,
    givenName: result.response.givenName,
    familyName: result.response.familyName,
  };
}

export function appleSignInCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}
