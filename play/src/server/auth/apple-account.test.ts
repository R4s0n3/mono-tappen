import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeEmail, planAppleSignIn, type KnownAppleUser } from "./apple-account";

const existing: KnownAppleUser = {
  id: "user-1",
  email: "person@example.com",
  name: "Ada",
  appleSub: null,
};

describe("planAppleSignIn", () => {
  it("lowercases emails", () => {
    assert.equal(normalizeEmail("  Person@Example.com "), "person@example.com");
    assert.equal(normalizeEmail("  "), null);
  });

  it("links a verified email, including a private relay address", () => {
    const linked = planAppleSignIn({
      sub: "apple-1",
      email: "Person@Example.com",
      emailVerified: true,
      name: null,
      bySub: null,
      byEmail: existing,
    });
    assert.deepEqual(linked, {
      kind: "existing",
      userId: "user-1",
      setEmail: null,
      setName: null,
      attachSub: true,
    });

    const relay = planAppleSignIn({
      sub: "apple-2",
      email: "abc@privaterelay.appleid.com",
      emailVerified: true,
      name: "Ada",
      bySub: null,
      byEmail: { ...existing, email: "abc@privaterelay.appleid.com", name: null },
    });
    assert.equal(relay.kind, "existing");
    if (relay.kind === "existing") assert.equal(relay.setName, "Ada");
  });

  it("does not link an unverified email", () => {
    const plan = planAppleSignIn({
      sub: "apple-1",
      email: "person@example.com",
      emailVerified: false,
      name: null,
      bySub: null,
      byEmail: existing,
    });
    assert.deepEqual(plan, { kind: "create", email: null, name: null });
  });

  it("uses the Apple sub on later logins when the email is omitted", () => {
    const plan = planAppleSignIn({
      sub: "apple-1",
      email: null,
      emailVerified: false,
      name: null,
      bySub: { ...existing, appleSub: "apple-1" },
      byEmail: null,
    });
    assert.deepEqual(plan, {
      kind: "existing",
      userId: "user-1",
      setEmail: null,
      setName: null,
      attachSub: false,
    });
  });

  it("does not attach a second Apple sub to an account that already has one", () => {
    const plan = planAppleSignIn({
      sub: "apple-2",
      email: "person@example.com",
      emailVerified: true,
      name: null,
      bySub: null,
      byEmail: { ...existing, appleSub: "apple-1" },
    });
    assert.deepEqual(plan, { kind: "create", email: null, name: null });
  });
});
