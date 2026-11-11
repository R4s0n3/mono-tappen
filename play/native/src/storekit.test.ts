import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("native Premium purchase", () => {
  const purchases = fs.readFileSync(path.join(root, "src/platform/purchases.ts"), "utf8");
  const premium = fs.readFileSync(path.join(root, "src/screens/premium.tsx"), "utf8");
  const account = fs.readFileSync(path.join(root, "src/screens/account.tsx"), "utf8");
  const screens = fs.readFileSync(path.join(root, "src/screens.tsx"), "utf8");
  const api = fs.readFileSync(path.join(root, "src/platform/api.ts"), "utf8");
  const swift = fs.readFileSync(
    path.join(root, "plugins/capacitor-storekit/ios/Sources/StoreKitPremium/Plugin.swift"),
    "utf8",
  );
  const nativeSources = [purchases, premium, account, screens, api, swift].join("\n");

  it("sells one StoreKit product and shows the StoreKit price", () => {
    assert.match(purchases, /app\.tappen\.ios\.premium/);
    assert.match(purchases, /StoreKitPremium/);
    assert.match(purchases, /displayPrice/);
    assert.match(premium, /Get Premium/);
    assert.match(premium, /Restore purchases/);
    assert.match(premium, /displayPrice/);
    assert.match(account, /PremiumPanel/);
    assert.match(swift, /Product\.products/);
    assert.match(swift, /app\.tappen\.ios\.premium/);
    assert.match(swift, /jwsRepresentation/);
  });

  it("does not link to the web shop or sell skins", () => {
    assert.doesNotMatch(nativeSources, /hub\.tappen\.app/);
    assert.doesNotMatch(nativeSources, /stripe/i);
    assert.doesNotMatch(nativeSources, /6[,.]99/);
    assert.doesNotMatch(screens, /non-consumables/);
    assert.doesNotMatch(api, /bought through/);
  });
});
