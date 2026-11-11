import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Name and bundle id are copied from app.identity.json by
 * `npm run identity:apply`. Change them there. app.tappen.ios is the
 * owner's choice for the first App Store record.
 *
 * Do not set `server.url`. The app ships this bundle. It does not load a
 * dev server, and it does not wrap play.tappen.app in a web view.
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
