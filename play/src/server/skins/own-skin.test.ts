/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { describeEntitlement } from "../home/entitlement";
import {
  OWN_SKIN_LIMIT,
  OWN_SKIN_PALETTES,
  OwnSkinError,
  cardFaceSkin,
  createOwnSkin,
  deleteOwnSkin,
  equipOwnSkin,
  isOwnSkinLimitError,
  isPremiumStatus,
  isSafePlaySkin,
  listOwnSkins,
  ownSkinCopy,
  ownSkinTrpcCode,
  parseOwnSkinConfig,
  parseOwnSkinName,
  patternOverlay,
  readEquippedOwnSkin,
  renderOwnSkin,
  renderStoredOwnSkin,
  updateOwnSkin,
  type OwnSkinConfig,
  type OwnSkinStore,
} from "../../shared/own-skin.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../..");

function sample(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    palette: "sunset",
    gradient: "linear",
    pattern: "dots",
    frame: "classic",
    tier: "rare",
    font: "serif",
    fontColor: "dark",
    ...overrides,
  };
}

type Row = {
  id: string;
  userId: string;
  name: string;
  configVersion: number;
  config: OwnSkinConfig | null;
  createdAt: string;
  updatedAt: string;
};

function createMemory(users: Record<string, string | null>) {
  const status = new Map(Object.entries(users));
  const skins: Row[] = [];
  const equipped = new Map<string, string>();
  const ops: string[] = [];
  let n = 0;

  const store: OwnSkinStore = {
    async transaction(run) {
      return run(store);
    },
    async lockUser(userId) {
      ops.push(`lock:${userId}`);
    },
    async premiumActive(userId) {
      return isPremiumStatus(status.get(userId) ?? null);
    },
    async countSkins(userId) {
      return skins.filter((skin) => skin.userId === userId).length;
    },
    async listSkins(userId) {
      return skins
        .filter((skin) => skin.userId === userId)
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async findSkin(id) {
      return skins.find((skin) => skin.id === id) ?? null;
    },
    async insertSkin(input) {
      const owned = skins.filter((skin) => skin.userId === input.userId).length;
      if (owned >= OWN_SKIN_LIMIT) throw new Error("own_skin_limit");
      n += 1;
      const now = new Date(Date.UTC(2026, 10, 20, 12, 0, n)).toISOString();
      const row: Row = {
        id: `own_${n}`,
        userId: input.userId,
        name: input.name,
        configVersion: input.configVersion,
        config: input.config,
        createdAt: now,
        updatedAt: now,
      };
      skins.push(row);
      ops.push(`insert:${row.id}`);
      return row;
    },
    async updateSkin(id, patch) {
      const row = skins.find((skin) => skin.id === id);
      if (!row) throw new Error("missing");
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.config !== undefined) row.config = patch.config;
      if (patch.configVersion !== undefined) row.configVersion = patch.configVersion;
      row.updatedAt = new Date(Date.UTC(2026, 10, 20, 13, 0, n)).toISOString();
      return row;
    },
    async deleteSkin(id) {
      const index = skins.findIndex((skin) => skin.id === id);
      if (index >= 0) skins.splice(index, 1);
      for (const [userId, skinId] of equipped) {
        if (skinId === id) equipped.delete(userId);
      }
    },
    async equippedSkinId(userId) {
      return equipped.get(userId) ?? null;
    },
    async equippedSkin(userId) {
      const id = equipped.get(userId);
      if (!id) return null;
      return skins.find((skin) => skin.id === id) ?? null;
    },
    async setEquipped(userId, skinId) {
      equipped.set(userId, skinId);
    },
  };

  return { store, skins, ops, status, equipped };
}

function rejected(error: unknown) {
  assert.ok(error instanceof OwnSkinError);
  return error;
}

describe("own skin config", () => {
  it("accepts a v1 allowlist and drops nothing the painter needs", () => {
    const config = parseOwnSkinConfig(sample());
    assert.deepEqual(config, sample());
    const skin = renderOwnSkin(config);
    assert.equal(skin.background.colors.primary, OWN_SKIN_PALETTES.sunset?.primary);
    assert.equal(skin.background.colors.secondary, OWN_SKIN_PALETTES.sunset?.secondary);
    assert.equal(skin.patternColor, OWN_SKIN_PALETTES.sunset?.pattern);
    assert.equal(skin.background.type, "linear");
    assert.equal(skin.background.animation, "liquid");
    assert.equal(skin.border.frame, "classic");
    assert.equal(skin.border.rarity, "rare");
    assert.equal(skin.font.type, "serif");
    assert.equal(isSafePlaySkin(skin), true);
    const overlay = patternOverlay(skin.pattern, skin.patternColor);
    assert.ok(overlay);
    assert.match(overlay.backgroundImage, new RegExp(skin.patternColor));
    assert.doesNotMatch(overlay.backgroundImage, /url\s*\(|:\/\//i);
  });

  it("rejects css, urls, extra keys, and unknown versions", () => {
    const bad = [
      sample({ palette: "url(https://evil.example/a.png)" }),
      sample({ gradient: "linear-gradient(red, blue)" }),
      sample({ pattern: "dots; background: url(https://evil.example)" }),
      sample({ font: "serif}body{background:url(https://evil.example)}" }),
      sample({ fontColor: "dark" , extra: "red" }),
      sample({ version: 2 }),
      sample({ version: "1" }),
      { ...sample(), highlight: "#fff" },
      ["sunset"],
      "sunset",
      null,
      { version: 1, palette: "sunset" },
    ];
    for (const input of bad) {
      assert.throws(() => parseOwnSkinConfig(input), (error: unknown) => {
        const own = rejected(error);
        assert.equal(own.code, "INVALID");
        assert.equal(own.message, ownSkinCopy.invalid);
        return true;
      });
    }
    assert.equal(patternOverlay("dots", "#ff0000);background:url(https://evil.example)"), null);
    assert.equal(patternOverlay("mosaic", "#7d4a08"), null);
  });

  it("keeps names short and plain", () => {
    assert.equal(parseOwnSkinName("  Sunset table "), "Sunset table");
    assert.equal(parseOwnSkinName("Sam's card"), "Sam's card");
    assert.equal(parseOwnSkinName("A" + "b".repeat(23)).length, 24);
    for (const name of ["", "   ", "A".repeat(25), "<script>", "javascript:alert", "---", "look\nup"]) {
      assert.throws(() => parseOwnSkinName(name), (error: unknown) => rejected(error).code === "INVALID");
    }
  });

  it("falls back to the shop skin when the own skin is missing or unsafe", () => {
    const safe = renderOwnSkin(parseOwnSkinConfig(sample()));
    assert.equal(cardFaceSkin("shop-skin", safe).source, "own");
    assert.deepEqual(cardFaceSkin("shop-skin", null), {
      source: "catalog",
      playSkin: null,
      catalogSkinId: "shop-skin",
    });
    const tampered = {
      ...safe,
      background: {
        ...safe.background,
        colors: { ...safe.background.colors, primary: "#ff0000" },
      },
    };
    assert.equal(isSafePlaySkin(tampered), false);
    assert.equal(cardFaceSkin("shop-skin", tampered).source, "catalog");
    assert.equal(
      renderStoredOwnSkin({ id: "own_1", configVersion: 1, config: sample({ palette: "nope" }) }),
      null,
    );
    assert.equal(renderStoredOwnSkin({ id: "own_1", configVersion: 2, config: sample() }), null);
  });

  it("uses the same active subscription check as Premium", () => {
    for (const status of ["active", "canceled", "past_due", null]) {
      const premium = describeEntitlement({
        subscription: status ? { status } : null,
        ownedSkinIds: [],
        premiumSkinId: null,
      }).premium;
      assert.equal(isPremiumStatus(status), premium);
    }
  });

  it("keeps player-facing copy free of dashes and clinical wording", () => {
    const text = Object.values(ownSkinCopy).join("\n");
    assert.equal(text.includes("\u2014"), false);
    assert.equal(text.includes("\u2013"), false);
    assert.equal(/therap/i.test(text), false);
  });
});

describe("own skin rules", () => {
  it("lets an active subscription save, edit, equip, and delete", async () => {
    const memory = createMemory({ ada: "active", bea: "active" });
    const created = await createOwnSkin(memory.store, "ada", { name: "Sunset", config: sample() });
    assert.equal(created.name, "Sunset");
    assert.equal(memory.ops[0], "lock:ada");
    assert.equal(memory.ops[1], `insert:${created.id}`);
    const listed = await listOwnSkins(memory.store, "ada");
    assert.equal(listed.limit, 12);
    assert.equal(listed.equippedId, null);
    assert.equal(listed.skins[0]?.equipped, false);

    const renamed = await updateOwnSkin(memory.store, "ada", { id: created.id, name: "Table sunset" });
    assert.equal(renamed.name, "Table sunset");
    assert.equal(renamed.config?.palette, "sunset");
    const recolored = await updateOwnSkin(memory.store, "ada", {
      id: created.id,
      config: sample({ palette: "ink", gradient: "radial", pattern: "plain" }),
    });
    assert.equal(recolored.config?.palette, "ink");
    assert.equal(recolored.name, "Table sunset");

    const equipped = await equipOwnSkin(memory.store, "ada", created.id);
    assert.equal(equipped.equippedId, created.id);
    await equipOwnSkin(memory.store, "ada", created.id);
    const playing = await readEquippedOwnSkin(memory.store, "ada");
    assert.equal(playing?.id, created.id);
    assert.equal(playing?.playSkin.background.colors.primary, OWN_SKIN_PALETTES.ink?.primary);
    assert.equal((await listOwnSkins(memory.store, "ada")).skins[0]?.equipped, true);

    assert.deepEqual(await deleteOwnSkin(memory.store, "ada", created.id), { deleted: true });
    assert.equal(await readEquippedOwnSkin(memory.store, "ada"), null);
    assert.equal(memory.skins.length, 0);
  });

  it("blocks create, list, update, delete, and equip without Premium", async () => {
    const memory = createMemory({ ada: "active" });
    const created = await createOwnSkin(memory.store, "ada", { name: "Sunset", config: sample() });
    await equipOwnSkin(memory.store, "ada", created.id);
    memory.status.set("ada", "canceled");

    for (const status of ["canceled", "past_due", null]) {
      memory.status.set("ada", status);
      await assert.rejects(listOwnSkins(memory.store, "ada"), (error: unknown) => rejected(error).code === "PREMIUM");
      await assert.rejects(
        createOwnSkin(memory.store, "ada", { name: "Next", config: sample() }),
        (error: unknown) => rejected(error).code === "PREMIUM",
      );
      await assert.rejects(
        updateOwnSkin(memory.store, "ada", { id: created.id, name: "Nope" }),
        (error: unknown) => rejected(error).code === "PREMIUM",
      );
      await assert.rejects(deleteOwnSkin(memory.store, "ada", created.id), (error: unknown) => rejected(error).code === "PREMIUM");
      await assert.rejects(equipOwnSkin(memory.store, "ada", created.id), (error: unknown) => rejected(error).code === "PREMIUM");
    }

    const playing = await readEquippedOwnSkin(memory.store, "ada");
    assert.equal(playing?.playSkin.pattern, "dots");
    assert.equal(cardFaceSkin("catalog-skin", playing?.playSkin).source, "own");
    assert.equal(memory.skins.length, 1);
  });

  it("stops at 12 skins for each account", async () => {
    const memory = createMemory({ ada: "active", bea: "active" });
    for (let i = 0; i < OWN_SKIN_LIMIT; i += 1) {
      await createOwnSkin(memory.store, "ada", { name: `Look ${i + 1}`, config: sample({ palette: i % 2 === 0 ? "mist" : "green" }) });
    }
    assert.equal(memory.skins.length, 12);
    await assert.rejects(
      createOwnSkin(memory.store, "ada", { name: "One more", config: sample() }),
      (error: unknown) => {
        const own = rejected(error);
        assert.equal(own.code, "LIMIT");
        assert.equal(own.message, ownSkinCopy.limit);
        return true;
      },
    );
    assert.equal(memory.skins.length, 12);
    assert.equal(memory.ops.at(-1)?.startsWith("lock:ada"), true);
    const bea = await createOwnSkin(memory.store, "bea", { name: "Bea", config: sample() });
    assert.equal(bea.userId, "bea");
    assert.equal(memory.skins.length, 13);
  });

  it("maps the database limit error onto the same message", async () => {
    const memory = createMemory({ ada: "active" });
    memory.store.insertSkin = async () => {
      throw new Error("raw query failed: own_skin_limit");
    };
    assert.equal(isOwnSkinLimitError(new Error("own_skin_limit")), true);
    await assert.rejects(
      createOwnSkin(memory.store, "ada", { name: "Sunset", config: sample() }),
      (error: unknown) => rejected(error).code === "LIMIT",
    );
    assert.equal(ownSkinTrpcCode("PREMIUM"), "FORBIDDEN");
    assert.equal(ownSkinTrpcCode("LIMIT"), "BAD_REQUEST");
    assert.equal(ownSkinTrpcCode("INVALID"), "BAD_REQUEST");
    assert.equal(ownSkinTrpcCode("NOT_FOUND"), "NOT_FOUND");
  });

  it("only changes skins on the signed-in account", async () => {
    const memory = createMemory({ ada: "active", bea: "active" });
    const ada = await createOwnSkin(memory.store, "ada", { name: "Sunset", config: sample() });
    const bea = await createOwnSkin(memory.store, "bea", { name: "Ink", config: sample({ palette: "ink" }) });
    await equipOwnSkin(memory.store, "ada", ada.id);
    const denied = [
      () => updateOwnSkin(memory.store, "bea", { id: ada.id, name: "Stolen" }),
      () => deleteOwnSkin(memory.store, "bea", ada.id),
      () => equipOwnSkin(memory.store, "bea", ada.id),
      () => updateOwnSkin(memory.store, "ada", { id: "missing", name: "Nope" }),
      () => updateOwnSkin(memory.store, "ada", { id: ada.id }),
    ];
    for (const action of denied) {
      await assert.rejects(action(), (error: unknown) => {
        const own = rejected(error);
        assert.ok(own.code === "NOT_FOUND" || own.code === "INVALID");
        return true;
      });
    }
    assert.equal((await readEquippedOwnSkin(memory.store, "ada"))?.id, ada.id);
    assert.equal(memory.skins.some((skin) => skin.id === bea.id), true);
    const second = await createOwnSkin(memory.store, "ada", { name: "Night", config: sample({ palette: "night" }) });
    await equipOwnSkin(memory.store, "ada", second.id);
    assert.equal((await readEquippedOwnSkin(memory.store, "ada"))?.id, second.id);
    await deleteOwnSkin(memory.store, "ada", ada.id);
    assert.equal((await readEquippedOwnSkin(memory.store, "ada"))?.id, second.id);
  });

  it("ignores a saved config that is no longer v1", async () => {
    const memory = createMemory({ ada: null });
    memory.skins.push({
      id: "own_old",
      userId: "ada",
      name: "Old",
      configVersion: 1,
      config: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });
    memory.equipped.set("ada", "own_old");
    assert.equal(await readEquippedOwnSkin(memory.store, "ada"), null);
    assert.equal(cardFaceSkin("still-owned", null).catalogSkinId, "still-owned");
  });
});

describe("own skin migration", () => {
  it("adds tables and the 12 skin cap without rewriting existing tables", () => {
    const sql = fs.readFileSync(
      path.join(repo, "play/prisma/migrations/20261120183000_own_skins/migration.sql"),
      "utf8",
    );
    assert.match(sql, /CREATE TABLE "OwnSkin"/);
    assert.match(sql, /CREATE TABLE "OwnSkinEquip"/);
    assert.match(sql, /own_skin_limit/);
    assert.match(sql, /FOR UPDATE/);
    assert.match(sql, /skin_count >= 12/);
    assert.match(sql, /ON DELETE CASCADE/);
    assert.doesNotMatch(sql, /DROP TABLE/i);
    assert.doesNotMatch(sql, /ALTER TABLE "(User|Skin|UserSkin|Subscription|Card)"/);
  });

  it("keeps the shared schema identical in hub, landing, and play", () => {
    const playSchema = fs.readFileSync(path.join(repo, "play/prisma/schema.prisma"), "utf8");
    const hubSchema = fs.readFileSync(path.join(repo, "hub/prisma/schema.prisma"), "utf8");
    const landingSchema = fs.readFileSync(path.join(repo, "landing/prisma/schema.prisma"), "utf8");
    assert.equal(playSchema, hubSchema);
    assert.equal(playSchema, landingSchema);
    assert.match(playSchema, /model OwnSkin \{/);
    assert.match(playSchema, /model OwnSkinEquip \{/);
  });

  it("keeps the own skin module identical in hub and play", () => {
    const playModule = fs.readFileSync(path.join(repo, "play/src/shared/own-skin.js"), "utf8");
    const hubModule = fs.readFileSync(path.join(repo, "hub/src/shared/own-skin.js"), "utf8");
    assert.equal(playModule, hubModule);
    assert.match(playModule, /export function parseOwnSkinConfig/);
  });
});
