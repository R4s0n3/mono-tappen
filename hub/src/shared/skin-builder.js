// @ts-check
// Copied in play/src/shared/skin-builder.js and hub/src/shared/skin-builder.js.
// Coolify builds each app from its own folder, so these copies stay identical.
/**
 * Skin builder v1 helpers. Colors, patterns, and names still go through
 * own-skin.js. This file only shapes the draft the builder paints live.
 */
import {
  OWN_SKIN_LIMIT,
  OWN_SKIN_PALETTES,
  OwnSkinError,
  isSafePlaySkin,
  ownSkinCatalog,
  ownSkinCopy,
  parseOwnSkinConfig,
  parseOwnSkinName,
  renderOwnSkin,
} from "./own-skin.js";

/**
 * @typedef {import("./own-skin.js").OwnSkinConfig} OwnSkinConfig
 * @typedef {import("./own-skin.js").PlaySkin} PlaySkin
 */

export const skinBuilderCopy = {
  title: "Skin builder",
  lede: "Paint a card the room will see.",
  sample: "Who brings the speaker?",
  previewTag: "Preview",
  newLook: "New look",
  save: "Save look",
  update: "Update look",
  wear: "Wear it",
  wearing: "On your cards",
  classic: "Classic cards",
  classicHint: "Shop skins show again.",
  drop: "Drop look",
  dropAsk: "Drop this look?",
  keep: "Keep it",
  flipFace: "See the face",
  flipBack: "See the back",
  palette: "Palette",
  gradient: "Gradient",
  pattern: "Pattern",
  frame: "Frame",
  frameNote: "Classic shape.",
  font: "Font",
  ink: "Ink",
  name: "Name",
  namePlaceholder: "Sunset table",
  saved: "Your looks",
  empty: "No saved looks yet.",
  slotsTitle: "Saved looks",
  previewOnly: "Preview only. Saving waits for Premium.",
  guest: "Sign in to save this look.",
  signIn: "Sign in",
  lapsedSame: "This look stays on your cards.",
  lapsedDrift: "Preview only. The look on your cards stays put.",
  premium: "Tappen Premium lets you save your own card skins.",
  getPremium: "Get Premium",
  backHome: "Back home",
  yourSkins: "Your skins",
  paintYourOwn: "Paint your own",
  checking: "Checking Premium.",
  checkFailed: "Could not check Premium. The preview still works.",
  retry: "Try again",
  savedNotice: "Saved.",
  wornNotice: "The room will see this look.",
  droppedNotice: "Dropped.",
  errorGeneric: "That did not save. Try again.",
  unreadable: "That look cannot be shown. You can still drop it.",
  listError: "Could not load your looks.",
};

/** @type {Record<string, Record<string, string>>} */
export const skinBuilderLabels = {
  palettes: {
    mist: "Mist",
    ink: "Ink",
    sunset: "Sunset",
    orange: "Orange",
    purple: "Purple",
    green: "Green",
    night: "Night",
    cream: "Cream",
  },
  gradients: {
    linear: "Linear",
    radial: "Radial",
  },
  patterns: {
    plain: "Plain",
    dots: "Dots",
    stripes: "Stripes",
    waves: "Waves",
    grid: "Grid",
  },
  tiers: {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
  },
  fonts: {
    serif: "Serif",
    sans: "Sans",
    cursive: "Script",
    bang: "Bang",
  },
  fontColors: {
    dark: "Dark",
    mid: "Mid",
    light: "Light",
  },
};

/**
 * @returns {OwnSkinConfig}
 */
export function defaultOwnSkinDraft() {
  return {
    version: 1,
    palette: "sunset",
    gradient: "linear",
    pattern: "dots",
    frame: "classic",
    tier: "rare",
    font: "bang",
    fontColor: "dark",
  };
}

/**
 * The shop default: mist, radial, no pattern, common classic frame.
 * @returns {OwnSkinConfig}
 */
export function classicPreviewDraft() {
  return {
    version: 1,
    palette: "mist",
    gradient: "radial",
    pattern: "plain",
    frame: "classic",
    tier: "common",
    font: "serif",
    fontColor: "mid",
  };
}

/**
 * @param {OwnSkinConfig} config
 * @returns {OwnSkinConfig}
 */
export function draftFromConfig(config) {
  return {
    version: 1,
    palette: config.palette,
    gradient: config.gradient,
    pattern: config.pattern,
    frame: config.frame,
    tier: config.tier,
    font: config.font,
    fontColor: config.fontColor,
  };
}

/**
 * @param {OwnSkinConfig} draft
 * @param {string} key
 * @param {string} value
 * @returns {OwnSkinConfig}
 */
export function applyDraftChoice(draft, key, value) {
  /** @type {Record<string, readonly string[]>} */
  const allowed = {
    palette: ownSkinCatalog.palettes,
    gradient: ownSkinCatalog.gradients,
    pattern: ownSkinCatalog.patterns,
    tier: ownSkinCatalog.tiers,
    font: ownSkinCatalog.fonts,
    fontColor: ownSkinCatalog.fontColors,
  };
  if (!allowed[key]?.includes(value)) return draft;
  return { ...draft, [key]: value };
}

/**
 * @param {OwnSkinConfig | null | undefined} left
 * @param {OwnSkinConfig | null | undefined} right
 */
export function draftsEqual(left, right) {
  if (!left || !right) return false;
  return (
    left.palette === right.palette &&
    left.gradient === right.gradient &&
    left.pattern === right.pattern &&
    left.frame === right.frame &&
    left.tier === right.tier &&
    left.font === right.font &&
    left.fontColor === right.fontColor
  );
}

/**
 * @param {unknown} playSkin
 * @returns {OwnSkinConfig | null}
 */
export function draftFromPlaySkin(playSkin) {
  if (!isSafePlaySkin(playSkin)) return null;
  const palette = Object.keys(OWN_SKIN_PALETTES).find((name) => {
    const entry = OWN_SKIN_PALETTES[name];
    return (
      entry?.primary === playSkin.background.colors.primary &&
      entry.secondary === playSkin.background.colors.secondary &&
      entry.pattern === playSkin.patternColor
    );
  });
  if (!palette) return null;
  return {
    version: 1,
    palette,
    gradient: playSkin.background.type,
    pattern: playSkin.pattern,
    frame: playSkin.border.frame,
    tier: playSkin.border.rarity,
    font: playSkin.font.type,
    fontColor: playSkin.font.color,
  };
}

/**
 * @param {OwnSkinConfig} draft
 * @param {unknown} playSkin
 */
export function draftMatchesPlaySkin(draft, playSkin) {
  return draftsEqual(draft, draftFromPlaySkin(playSkin));
}

/**
 * @param {unknown} draft
 * @returns {{ ok: true, config: OwnSkinConfig, playSkin: PlaySkin } | { ok: false, message: string }}
 */
export function previewOwnSkin(draft) {
  try {
    const config = parseOwnSkinConfig(draft);
    return { ok: true, config, playSkin: renderOwnSkin(config) };
  } catch (error) {
    const message = error instanceof OwnSkinError ? error.message : ownSkinCopy.invalid;
    return { ok: false, message };
  }
}

/**
 * Card back input for an own skin. Full skin color, no pattern and no words.
 * Highlight stays empty so the back does not invent a second paint job.
 * @param {unknown} playSkin
 * @returns {{ primary: string, secondary: string, highlight: null, rarity: string } | null}
 */
export function cardBackInputForOwnSkin(playSkin) {
  if (!isSafePlaySkin(playSkin)) return null;
  return {
    primary: playSkin.background.colors.primary,
    secondary: playSkin.background.colors.secondary,
    highlight: null,
    rarity: playSkin.border.rarity,
  };
}

/**
 * @param {unknown} input
 * @returns {{ ok: true, name: string } | { ok: false, message: string }}
 */
export function readSkinName(input) {
  try {
    return { ok: true, name: parseOwnSkinName(input) };
  } catch (error) {
    const message = error instanceof OwnSkinError ? error.message : ownSkinCopy.name;
    return { ok: false, message };
  }
}

/**
 * @param {string} palette
 * @param {readonly string[]} taken
 */
export function suggestSkinName(palette, taken) {
  const base = skinBuilderLabels.palettes?.[palette] ?? "Look";
  if (!taken.includes(base)) return base;
  for (let i = 2; i <= OWN_SKIN_LIMIT; i += 1) {
    const name = `${base} ${i}`;
    if (!taken.includes(name)) return name;
  }
  return base;
}

/**
 * A known count renders as `3 / 12`. An unknown count does not pretend to be zero.
 * @param {number | null | undefined} count
 */
export function skinSlotLabel(count) {
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
    return `Up to ${OWN_SKIN_LIMIT}`;
  }
  return `${Math.min(count, OWN_SKIN_LIMIT)} / ${OWN_SKIN_LIMIT}`;
}

/**
 * @param {number} count
 */
export function canCreateOwnSkin(count) {
  return count < OWN_SKIN_LIMIT;
}

/**
 * @param {{ editing: boolean, count: number }} input
 * @returns {"create" | "update" | "blocked"}
 */
export function saveAction(input) {
  if (input.editing) return "update";
  if (!canCreateOwnSkin(input.count)) return "blocked";
  return "create";
}

/**
 * @param {"guest" | "loading" | "ready" | "error"} status
 * @param {boolean} premium
 * @returns {"guest" | "loading" | "error" | "edit" | "readonly"}
 */
export function builderAccess(status, premium) {
  if (status === "guest") return "guest";
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  return premium ? "edit" : "readonly";
}

/**
 * @param {"guest" | "loading" | "error" | "edit" | "readonly"} access
 */
export function canMutateSkins(access) {
  return access === "edit";
}

/**
 * Guest, loading, a failed Premium check, or a ready account.
 * `signedInProp === false` skips the network check (the iOS shell already knows).
 * @param {{
 *   signedInProp: boolean | undefined,
 *   pending: boolean,
 *   success: boolean,
 *   unauthorized: boolean,
 *   premium: boolean,
 * }} input
 * @returns {"guest" | "loading" | "error" | "edit" | "readonly"}
 */
export function accountAccess(input) {
  if (input.signedInProp === false) return builderAccess("guest", false);
  if (input.pending) return builderAccess("loading", false);
  if (input.unauthorized) return builderAccess("guest", false);
  if (!input.success) return builderAccess("error", false);
  return builderAccess("ready", input.premium);
}

/**
 * @param {string} name
 */
export function palettePrimary(name) {
  return OWN_SKIN_PALETTES[name]?.primary ?? "#1d1f2f";
}

/**
 * @param {string} group
 * @param {string} id
 */
export function choiceLabel(group, id) {
  return skinBuilderLabels[group]?.[id] ?? id;
}

/**
 * Where a Premium or sign-in prompt may send the person.
 * iOS never gets a shop or checkout URL.
 * @param {"hub" | "play" | "ios"} surface
 */
export function builderSurfacePrompt(surface) {
  if (surface === "ios") {
    return {
      premiumHref: null,
      premiumAction: null,
      signInHref: "/account",
      signInAction: skinBuilderCopy.signIn,
    };
  }
  if (surface === "hub") {
    return {
      premiumHref: "/shop/subscribe",
      premiumAction: skinBuilderCopy.getPremium,
      signInHref: "/api/auth/signin",
      signInAction: skinBuilderCopy.signIn,
    };
  }
  return {
    premiumHref: "https://hub.tappen.app/shop/subscribe",
    premiumAction: skinBuilderCopy.getPremium,
    signInHref: "/api/auth/signin",
    signInAction: skinBuilderCopy.signIn,
  };
}

/**
 * @param {string} text
 */
export function hasForbiddenDash(text) {
  return text.includes("\u2014") || text.includes("\u2013") || text.includes(" - ");
}

/**
 * Every player-facing string in this module, for the dash check.
 */
export function skinBuilderText() {
  /** @type {string[]} */
  const chunks = [];
  const walk = (/** @type {unknown} */ value) => {
    if (typeof value === "string") chunks.push(value);
    else if (value && typeof value === "object") {
      for (const nested of Object.values(value)) walk(nested);
    }
  };
  walk(skinBuilderCopy);
  walk(skinBuilderLabels);
  return chunks.join("\n");
}
