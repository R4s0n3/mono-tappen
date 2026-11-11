import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Bundle id is a suggestion. The owner sets the real id in Xcode and
 * App Store Connect before the first upload. Do not set `server.url`:
 * the app ships this bundle, it does not wrap play.tappen.app.
 *
 * Sign in with Apple (M2) and StoreKit 2 (M3) are native capabilities
 * added on the Mac. Product ids live in src/platform/purchases.ts.
 */
const config: CapacitorConfig = {
  appId: "app.tappen.ios",
  appName: "Tappen",
  webDir: "dist",
  ios: {
    contentInset: "never",
    backgroundColor: "#1d1f2f",
  },
};

export default config;
