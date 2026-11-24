/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { cardBackTone } from "./card-back";
import { OWN_SKIN_PALETTES, ownSkinCatalog, renderOwnSkin } from "./own-skin.js";
import {
  accountAccess,
  applyDraftChoice,
  builderSurfacePrompt,
  canCreateOwnSkin,
  canMutateSkins,
  cardBackInputForOwnSkin,
  choiceLabel,
  classicPreviewDraft,
  defaultOwnSkinDraft,
  draftFromPlaySkin,
  draftMatchesPlaySkin,
  hasForbiddenDash,
  previewOwnSkin,
  readSkinName,
  saveAction,
  skinBuilderLabels,
  skinBuilderText,
  skinSlotLabel,
  suggestSkinName,
} from "./skin-builder.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");

function cardBackMarkup(source: string) {
  const start = source.indexOf("<CardBack");
  const end = source.indexOf("/>", start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}

describe("skin builder drafts", () => {
  it("paints a safe card from the default draft and updates as choices change", () => {
    const draft = defaultOwnSkinDraft();
    const first = previewOwnSkin(draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.playSkin.background.colors.primary, OWN_SKIN_PALETTES.sunset?.primary);
    assert.equal(first.playSkin.pattern, "dots");
    assert.equal(first.playSkin.font.type, "bang");
    assert.equal(first.playSkin.border.rarity, "rare");

    const next = previewOwnSkin(applyDraftChoice(applyDraftChoice(draft, "palette", "night"), "pattern", "waves"));
    assert.equal(next.ok, true);
    if (!next.ok) return;
    assert.equal(next.playSkin.background.colors.primary, OWN_SKIN_PALETTES.night?.primary);
    assert.equal(next.playSkin.pattern, "waves");
    assert.equal(applyDraftChoice(draft, "palette", "nope").palette, draft.palette);
    assert.equal(applyDraftChoice(draft, "frame", "gold").frame, "classic");
  });

  it("keeps the card back to skin color, the mark, and gloss", () => {
    const legendary = previewOwnSkin({ ...defaultOwnSkinDraft(), tier: "legendary", pattern: "grid" });
    assert.equal(legendary.ok, true);
    if (!legendary.ok) return;
    const input = cardBackInputForOwnSkin(legendary.playSkin);
    assert.ok(input);
    assert.equal(input?.highlight, null);
    assert.equal(Object.hasOwn(input ?? {}, "pattern"), false);
    assert.equal(JSON.stringify(input).includes("grid"), false);
    const tone = cardBackTone(input);
    assert.equal(tone.fill, OWN_SKIN_PALETTES.sunset?.primary);
    assert.ok(tone.gloss > 0.75);
    assert.equal(tone.glossTint, "#ffffff");

    const roundTrip = draftFromPlaySkin(legendary.playSkin);
    assert.equal(roundTrip?.tier, "legendary");
    assert.equal(roundTrip?.pattern, "grid");
    assert.equal(draftMatchesPlaySkin(roundTrip ?? defaultOwnSkinDraft(), legendary.playSkin), true);
    assert.equal(draftFromPlaySkin(renderOwnSkin(classicPreviewDraft()))?.pattern, "plain");
  });

  it("names looks, counts the 12 slots, and gates saving", () => {
    assert.equal(suggestSkinName("sunset", []), "Sunset");
    assert.equal(suggestSkinName("sunset", ["Sunset"]), "Sunset 2");
    assert.equal(choiceLabel("fonts", "cursive"), "Script");
    assert.equal(choiceLabel("missing", "nope"), "nope");
    assert.equal(readSkinName("  Sunset table ").ok, true);
    assert.equal(readSkinName("").ok, false);
    assert.equal(skinSlotLabel(3), "3 / 12");
    assert.equal(skinSlotLabel(0), "0 / 12");
    assert.equal(skinSlotLabel(null), "Up to 12");
    assert.equal(canCreateOwnSkin(11), true);
    assert.equal(canCreateOwnSkin(12), false);
    assert.equal(saveAction({ editing: false, count: 12 }), "blocked");
    assert.equal(saveAction({ editing: true, count: 12 }), "update");
    assert.equal(saveAction({ editing: false, count: 2 }), "create");
  });

  it("lets guests explore and only lets Premium change skins", () => {
    assert.equal(accountAccess({ signedInProp: false, pending: true, success: false, unauthorized: false, premium: false }), "guest");
    assert.equal(accountAccess({ signedInProp: undefined, pending: true, success: false, unauthorized: false, premium: false }), "loading");
    assert.equal(accountAccess({ signedInProp: true, pending: false, success: false, unauthorized: true, premium: false }), "guest");
    assert.equal(accountAccess({ signedInProp: true, pending: false, success: false, unauthorized: false, premium: false }), "error");
    assert.equal(accountAccess({ signedInProp: true, pending: false, success: true, unauthorized: false, premium: true }), "edit");
    assert.equal(accountAccess({ signedInProp: true, pending: false, success: true, unauthorized: false, premium: false }), "readonly");
    assert.equal(canMutateSkins("edit"), true);
    assert.equal(canMutateSkins("readonly"), false);
    assert.equal(canMutateSkins("guest"), false);
  });

  it("keeps shop and checkout links off the iOS prompt", () => {
    const ios = builderSurfacePrompt("ios");
    const encoded = JSON.stringify(ios);
    assert.equal(ios.premiumHref, null);
    assert.equal(ios.premiumAction, null);
    assert.equal(ios.signInHref, "/account");
    assert.equal(/https?:|stripe|checkout|shop/i.test(encoded), false);

    const play = builderSurfacePrompt("play");
    assert.equal(play.premiumHref, "https://hub.tappen.app/shop/subscribe");
    const hub = builderSurfacePrompt("hub");
    assert.equal(hub.premiumHref, "/shop/subscribe");
  });

  it("keeps builder copy free of dashes and clinical wording", () => {
    const text = skinBuilderText();
    assert.equal(hasForbiddenDash(text), false);
    assert.equal(/therap|drinking/i.test(text), false);
    for (const group of Object.values(skinBuilderLabels)) {
      for (const label of Object.values(group)) assert.equal(hasForbiddenDash(label), false);
    }
    for (const key of ["palettes", "gradients", "patterns", "tiers", "fonts", "fontColors"] as const) {
      for (const id of ownSkinCatalog[key]) assert.equal(typeof choiceLabel(key, id), "string");
    }
  });

  it("keeps the helper and the card back identical in hub and play", () => {
    const pairs: Array<[string, string]> = [
      ["play/src/shared/skin-builder.js", "hub/src/shared/skin-builder.js"],
      ["play/src/shared/card-back.ts", "hub/src/shared/card-back.ts"],
      ["play/src/app/_components/tappen-card/card-back.tsx", "hub/src/app/_components/tappen-card/card-back.tsx"],
      ["play/src/app/_components/tappen-card/mark.tsx", "hub/src/app/_components/tappen-card/mark.tsx"],
    ];
    for (const [left, right] of pairs) {
      assert.equal(
        fs.readFileSync(path.join(repo, left), "utf8"),
        fs.readFileSync(path.join(repo, right), "utf8"),
        left,
      );
    }
  });

  it("does not put a shop link in the iOS builder screen", () => {
    const playUi = fs.readFileSync(path.join(repo, "play/src/app/_components/skin-builder/skin-builder.tsx"), "utf8");
    const nativeScreen = fs.readFileSync(path.join(repo, "play/native/src/screens/skins.tsx"), "utf8");
    const screens = fs.readFileSync(path.join(repo, "play/native/src/screens.tsx"), "utf8");
    for (const source of [playUi, nativeScreen]) {
      assert.equal(source.includes("\u2014"), false);
      assert.equal(source.includes("\u2013"), false);
      assert.equal(source.includes(" - "), false);
    }
    assert.match(playUi, /getRuntime\(\)\.platform === "ios"/);
    assert.match(playUi, /builderSurfacePrompt\(surface\)/);
    assert.doesNotMatch(playUi, /stripe|checkout|hub\.tappen|shop\/subscribe/i);
    assert.doesNotMatch(nativeScreen, /stripe|checkout|hub\.tappen|shop\/subscribe/i);
    assert.match(screens, /path: "\/skins"/);
    const back = cardBackMarkup(playUi);
    assert.match(back, /primary=\{back\.primary\}/);
    assert.doesNotMatch(back, /pattern/);
    assert.equal(back.includes(">"), false);
  });
});
