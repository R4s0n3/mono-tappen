/**
 * Client runtime shared by the website and the Capacitor shell.
 *
 * The website leaves this unset: API and WebSocket stay on the page origin,
 * and the session cookie is unchanged. The iOS shell calls `configureRuntime`
 * before the first render (see play/native/src/main.tsx).
 *
 * M2 reads `getAccessToken` (Sign in with Apple, bearer). M3 does not go
 * through here; StoreKit config lives in play/native/src/platform/purchases.ts.
 */

export type TappenPlatform = "web" | "ios";

export type TappenRuntime = {
  platform: TappenPlatform;
  /** Origin only, no trailing slash. Unset on the website. */
  apiBaseUrl?: string;
  /** Absolute WebSocket URL, including the /ws path. Unset on the website. */
  wsUrl?: string;
  /** Website shows the flame. The iOS shell turns it off. */
  showNsfwBadge: boolean;
  /** M2. Unset on the website, which keeps using the NextAuth cookie. */
  getAccessToken?: () => Promise<string | null> | string | null;
};

type RuntimeGlobal = typeof globalThis & {
  __TAPPEN__?: Partial<TappenRuntime>;
};

const defaults: TappenRuntime = {
  platform: "web",
  showNsfwBadge: true,
};

export function getRuntime(): TappenRuntime {
  const configured = (globalThis as RuntimeGlobal).__TAPPEN__;
  return { ...defaults, ...configured };
}

export function configureRuntime(next: Partial<TappenRuntime>): void {
  const g = globalThis as RuntimeGlobal;
  g.__TAPPEN__ = { ...g.__TAPPEN__, ...next };
}
