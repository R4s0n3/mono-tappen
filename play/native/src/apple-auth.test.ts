import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("native Sign in with Apple", () => {
  const auth = fs.readFileSync(path.join(root, "src/platform/auth.ts"), "utf8");
  const api = fs.readFileSync(path.join(root, "src/platform/api.ts"), "utf8");
  const account = fs.readFileSync(path.join(root, "src/screens/account.tsx"), "utf8");
  const claim = fs.readFileSync(path.join(root, "src/screens/claim.tsx"), "utf8");

  it("keeps the session token in the Keychain plugin", () => {
    assert.match(auth, /SecureStorage/);
    assert.match(auth, /SignInWithApple/);
    assert.doesNotMatch(auth, /localStorage/);
    assert.match(auth, /app\.tappen\.ios/);
    assert.match(api, /export \{ getAccessToken \} from "\.\/auth"/);
    assert.doesNotMatch(api, /signInWithApple/);
    assert.match(claim, /claim\.isError/);
    assert.match(claim, /UNAUTHORIZED/);
  });

  it("offers sign out and account deletion", () => {
    assert.match(account, /Sign out/);
    assert.match(account, /Delete account/);
    assert.match(account, /Delete my account/);
    assert.match(account, /SignInWithAppleButton/);
  });
});
