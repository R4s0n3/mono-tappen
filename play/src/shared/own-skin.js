// @ts-check
// Copied in play/src/shared/own-skin.js and hub/src/shared/own-skin.js.
// Coolify builds each app from its own folder, so these copies stay identical.
/**
 * Own skins: the account-level looks the Premium skin builder saves.
 *
 * Premium is `Subscription.status === "active"`. That is the same flag
 * `describeEntitlement` uses. A shop payment, a Tappen Home box code, and
 * the StoreKit purchase in PR #22 all set it. This module does not read
 * Apple purchase rows.
 *
 * Saving, editing, listing, and equipping require Premium. Rendering an
 * already equipped skin does not, so a look that is already on the account
 * keeps showing on cards.
 *
 * Config v1 is an allowlist: palette, gradient, pattern, frame, tier, font.
 * Callers never supply CSS or URLs. Colors come from the palette table.
 */

export const OWN_SKIN_VERSION = 1;
export const OWN_SKIN_LIMIT = 12;
export const OWN_SKIN_NAME_MAX = 24;

/** @type {Record<string, { primary: string, secondary: string, pattern: string }>} */
export const OWN_SKIN_PALETTES = {
  mist: { primary: "#eaeaef", secondary: "#f5f5fa", pattern: "#555a8b" },
  ink: { primary: "#1d1f2f", secondary: "#555a8b", pattern: "#c5c6d6" },
  sunset: { primary: "#ff9912", secondary: "#fff1e6", pattern: "#7d4a08" },
  orange: { primary: "#ff7512", secondary: "#ffddbf", pattern: "#7d3a08" },
  purple: { primary: "#501872", secondary: "#ece6f3", pattern: "#250a38" },
  green: { primary: "#137d13", secondary: "#e6f3e6", pattern: "#093a09" },
  night: { primary: "#0d0e17", secondary: "#501872", pattern: "#c5c6d6" },
  cream: { primary: "#fff8f2", secondary: "#ffd799", pattern: "#995c0a" },
};

export const OWN_SKIN_GRADIENTS = ["linear", "radial"];
export const OWN_SKIN_PATTERNS = ["plain", "dots", "stripes", "waves", "grid"];
/** The card painter only has the classic frame mask. Tier changes its treatment. */
export const OWN_SKIN_FRAMES = ["classic"];
export const OWN_SKIN_TIERS = ["common", "rare", "epic", "legendary"];
export const OWN_SKIN_FONTS = ["serif", "sans", "cursive", "bang"];
export const OWN_SKIN_FONT_COLORS = ["dark", "mid", "light"];

const CONFIG_KEYS = ["version", "palette", "gradient", "pattern", "frame", "tier", "font", "fontColor"];
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .'-]{0,23}$/u;
const UNSAFE_TEXT = /url\s*\(|:\/\/|[;<>{}\\]/i;

export const ownSkinCopy = {
  premium: "Tappen Premium lets you save your own card skins.",
  limit: "You can save up to 12 of your own skins.",
  missing: "That skin is not on this account.",
  invalid: "Choose a palette, gradient, pattern, frame, and font from the list.",
  name: "Give your skin a short name with letters and numbers.",
  save: "Add a name or a look before you save.",
};

export const ownSkinCatalog = {
  version: OWN_SKIN_VERSION,
  limit: OWN_SKIN_LIMIT,
  palettes: Object.keys(OWN_SKIN_PALETTES),
  gradients: OWN_SKIN_GRADIENTS,
  patterns: OWN_SKIN_PATTERNS,
  frames: OWN_SKIN_FRAMES,
  tiers: OWN_SKIN_TIERS,
  fonts: OWN_SKIN_FONTS,
  fontColors: OWN_SKIN_FONT_COLORS,
};

/**
 * @typedef {"common" | "rare" | "epic" | "legendary"} FrameTier
 */

/**
 * @typedef {Object} OwnSkinConfig
 * @property {1} version
 * @property {string} palette
 * @property {string} gradient
 * @property {string} pattern
 * @property {string} frame
 * @property {string} tier
 * @property {string} font
 * @property {string} fontColor
 */

/**
 * Safe look the card painter can apply. Colors are palette hex only.
 * @typedef {Object} PlaySkin
 * @property {{ type: string, color: string }} font
 * @property {{ frame: string, rarity: FrameTier }} border
 * @property {{ type: string, colors: { primary: string, secondary: string }, animation: string }} background
 * @property {string} pattern
 * @property {string} patternColor
 */

/**
 * @typedef {Object} OwnSkinRecord
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {number} configVersion
 * @property {OwnSkinConfig | null} config
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} OwnSkinStore
 * @property {(run: (tx: OwnSkinStore) => Promise<unknown>) => Promise<unknown>} transaction
 * @property {(userId: string) => Promise<void>} lockUser
 * @property {(userId: string) => Promise<boolean>} premiumActive
 * @property {(userId: string) => Promise<number>} countSkins
 * @property {(userId: string) => Promise<OwnSkinRecord[]>} listSkins
 * @property {(id: string) => Promise<OwnSkinRecord | null>} findSkin
 * @property {(input: { userId: string, name: string, configVersion: number, config: OwnSkinConfig }) => Promise<OwnSkinRecord>} insertSkin
 * @property {(id: string, patch: { name?: string, config?: OwnSkinConfig, configVersion?: number }) => Promise<OwnSkinRecord>} updateSkin
 * @property {(id: string) => Promise<void>} deleteSkin
 * @property {(userId: string) => Promise<string | null>} equippedSkinId
 * @property {(userId: string) => Promise<OwnSkinRecord | null>} equippedSkin
 * @property {(userId: string, skinId: string) => Promise<void>} setEquipped
 */

/**
 * @typedef {Object} SkinRow
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {number} configVersion
 * @property {unknown} config
 * @property {Date | string} createdAt
 * @property {Date | string} updatedAt
 */

/**
 * @typedef {Object} PrismaOwnSkinDb
 * @property {(fn: (tx: PrismaOwnSkinDb) => Promise<unknown>) => Promise<unknown>} $transaction
 * @property {(strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>} $executeRaw
 * @property {{ findUnique: (args: { where: { userId: string }, select: { status: true } }) => Promise<{ status: string } | null> }} subscription
 * @property {{
 *   count: (args: { where: { userId: string } }) => Promise<number>,
 *   findMany: (args: { where: { userId: string }, orderBy: { createdAt: "asc" } }) => Promise<SkinRow[]>,
 *   findUnique: (args: { where: { id: string } }) => Promise<SkinRow | null>,
 *   create: (args: { data: { userId: string, name: string, configVersion: number, config: OwnSkinConfig } }) => Promise<SkinRow>,
 *   update: (args: { where: { id: string }, data: { name?: string, config?: OwnSkinConfig, configVersion?: number } }) => Promise<SkinRow>,
 *   delete: (args: { where: { id: string } }) => Promise<unknown>,
 * }} ownSkin
 * @property {{
 *   findUnique: (args: { where: { userId: string }, select?: { skinId: true }, include?: { skin: true } }) => Promise<{ skinId?: string, skin?: SkinRow | null } | null>,
 *   upsert: (args: { where: { userId: string }, create: { userId: string, skinId: string }, update: { skinId: string } }) => Promise<unknown>,
 * }} ownSkinEquip
 */

export class OwnSkinError extends Error {
  /**
   * @param {"PREMIUM" | "LIMIT" | "NOT_FOUND" | "INVALID"} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = "OwnSkinError";
    this.code = code;
  }
}

/**
 * Shop, box codes, and the StoreKit grant all use this check.
 * @param {string | null | undefined} status
 */
export function isPremiumStatus(status) {
  return status === "active";
}

/**
 * @param {unknown} error
 */
export function isOwnSkinLimitError(error) {
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  return typeof error.message === "string" && error.message.includes("own_skin_limit");
}

/**
 * @param {OwnSkinError["code"]} code
 * @returns {"FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST"}
 */
export function ownSkinTrpcCode(code) {
  if (code === "PREMIUM") return "FORBIDDEN";
  if (code === "NOT_FOUND") return "NOT_FOUND";
  return "BAD_REQUEST";
}

/**
 * @param {unknown} error
 * @returns {{ code: "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST", message: string } | null}
 */
export function ownSkinTrpcError(error) {
  if (!(error instanceof OwnSkinError)) return null;
  return { code: ownSkinTrpcCode(error.code), message: error.message };
}

/**
 * @param {readonly string[]} list
 * @param {unknown} value
 * @returns {value is string}
 */
function oneOf(list, value) {
  return typeof value === "string" && list.includes(value);
}

/**
 * @param {string} name
 */
function paletteEntry(name) {
  const entry = OWN_SKIN_PALETTES[name];
  return entry ?? null;
}

/**
 * @param {unknown} value
 */
function unsafeText(value) {
  return typeof value === "string" && UNSAFE_TEXT.test(value);
}

/**
 * @param {unknown} input
 * @returns {OwnSkinConfig}
 */
export function parseOwnSkinConfig(input) {
  let encoded = "";
  try {
    encoded = JSON.stringify(input);
  } catch {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  if (!encoded || encoded.length > 500) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  const record = /** @type {Record<string, unknown>} */ (input);
  const keys = Object.keys(record);
  if (keys.length !== CONFIG_KEYS.length || CONFIG_KEYS.some((key) => !Object.hasOwn(record, key))) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  if (record.version !== OWN_SKIN_VERSION) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  const palette = record.palette;
  const gradient = record.gradient;
  const pattern = record.pattern;
  const frame = record.frame;
  const tier = record.tier;
  const font = record.font;
  const fontColor = record.fontColor;
  if (
    !oneOf(ownSkinCatalog.palettes, palette) ||
    !oneOf(OWN_SKIN_GRADIENTS, gradient) ||
    !oneOf(OWN_SKIN_PATTERNS, pattern) ||
    !oneOf(OWN_SKIN_FRAMES, frame) ||
    !oneOf(OWN_SKIN_TIERS, tier) ||
    !oneOf(OWN_SKIN_FONTS, font) ||
    !oneOf(OWN_SKIN_FONT_COLORS, fontColor) ||
    [palette, gradient, pattern, frame, tier, font, fontColor].some(unsafeText)
  ) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  return { version: 1, palette, gradient, pattern, frame, tier, font, fontColor };
}

/**
 * @param {unknown} input
 * @returns {string}
 */
export function parseOwnSkinName(input) {
  if (typeof input !== "string") throw new OwnSkinError("INVALID", ownSkinCopy.name);
  const name = input.trim();
  if (!NAME_PATTERN.test(name) || name.length > OWN_SKIN_NAME_MAX || unsafeText(name)) {
    throw new OwnSkinError("INVALID", ownSkinCopy.name);
  }
  return name;
}

/**
 * @param {unknown} input
 */
function parseSkinId(input) {
  if (typeof input !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(input)) {
    throw new OwnSkinError("NOT_FOUND", ownSkinCopy.missing);
  }
  return input;
}

/**
 * @param {OwnSkinConfig} config
 * @returns {PlaySkin}
 */
export function renderOwnSkin(config) {
  const colors = paletteEntry(config.palette);
  if (!colors || !oneOf(OWN_SKIN_TIERS, config.tier)) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  return {
    font: { type: config.font, color: config.fontColor },
    border: { frame: config.frame, rarity: /** @type {FrameTier} */ (config.tier) },
    background: {
      type: config.gradient,
      colors: { primary: colors.primary, secondary: colors.secondary },
      animation: "liquid",
    },
    pattern: config.pattern,
    patternColor: colors.pattern,
  };
}

/**
 * @param {{ id?: string, configVersion?: number, config?: unknown } | null | undefined} row
 * @returns {{ id: string, playSkin: PlaySkin } | null}
 */
export function renderStoredOwnSkin(row) {
  if (!row || row.configVersion !== OWN_SKIN_VERSION || typeof row.id !== "string") return null;
  try {
    return { id: row.id, playSkin: renderOwnSkin(parseOwnSkinConfig(row.config)) };
  } catch {
    return null;
  }
}

/**
 * @param {unknown} value
 * @returns {value is PlaySkin}
 */
export function isSafePlaySkin(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const skin = /** @type {Record<string, unknown>} */ (value);
  const font = skin.font;
  const border = skin.border;
  const background = skin.background;
  if (!font || typeof font !== "object" || !border || typeof border !== "object") return false;
  if (!background || typeof background !== "object") return false;
  const fontRecord = /** @type {Record<string, unknown>} */ (font);
  const borderRecord = /** @type {Record<string, unknown>} */ (border);
  const backgroundRecord = /** @type {Record<string, unknown>} */ (background);
  const colors = backgroundRecord.colors;
  if (!colors || typeof colors !== "object") return false;
  const colorRecord = /** @type {Record<string, unknown>} */ (colors);
  if (typeof colorRecord.highlight === "string" && colorRecord.highlight.length > 0) return false;
  if (backgroundRecord.animation !== "liquid") return false;
  if (
    !oneOf(OWN_SKIN_FONTS, fontRecord.type) ||
    !oneOf(OWN_SKIN_FONT_COLORS, fontRecord.color) ||
    !oneOf(OWN_SKIN_FRAMES, borderRecord.frame) ||
    !oneOf(OWN_SKIN_TIERS, borderRecord.rarity) ||
    !oneOf(OWN_SKIN_GRADIENTS, backgroundRecord.type) ||
    !oneOf(OWN_SKIN_PATTERNS, skin.pattern) ||
    typeof colorRecord.primary !== "string" ||
    typeof colorRecord.secondary !== "string" ||
    typeof skin.patternColor !== "string"
  ) {
    return false;
  }
  const match = Object.values(OWN_SKIN_PALETTES).find(
    (entry) =>
      entry.primary === colorRecord.primary &&
      entry.secondary === colorRecord.secondary &&
      entry.pattern === skin.patternColor,
  );
  if (!match) return false;
  if (skin.pattern === "plain") return true;
  return patternOverlay(skin.pattern, skin.patternColor) !== null;
}

/**
 * Overlay for a pattern. Returns null for "plain" and for anything off the list.
 * The color has to be a palette pattern color, so it cannot carry CSS.
 * @param {unknown} pattern
 * @param {unknown} color
 * @returns {{ backgroundImage: string, backgroundSize: string, opacity: number } | null}
 */
export function patternOverlay(pattern, color) {
  if (pattern === "plain") return null;
  if (!oneOf(OWN_SKIN_PATTERNS, pattern)) return null;
  if (typeof color !== "string") return null;
  const known = Object.values(OWN_SKIN_PALETTES).some((entry) => entry.pattern === color);
  if (!known || unsafeText(color)) return null;
  if (pattern === "dots") {
    return {
      backgroundImage: `radial-gradient(circle, ${color} 1.1px, transparent 1.2px)`,
      backgroundSize: "14px 14px",
      opacity: 0.4,
    };
  }
  if (pattern === "stripes") {
    return {
      backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 2px, transparent 2px 10px)`,
      backgroundSize: "auto",
      opacity: 0.35,
    };
  }
  if (pattern === "waves") {
    return {
      backgroundImage: `radial-gradient(circle at 20% 20%, transparent 0 8px, ${color} 8.5px 9px, transparent 9.5px)`,
      backgroundSize: "28px 18px",
      opacity: 0.4,
    };
  }
  if (pattern === "grid") {
    return {
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: "16px 16px",
      opacity: 0.35,
    };
  }
  return null;
}

/**
 * Equipped own skin wins. Otherwise the card keeps its shop skin.
 * @param {string} catalogSkinId
 * @param {unknown} playSkin
 * @returns {{ source: "own", playSkin: PlaySkin, catalogSkinId: string } | { source: "catalog", playSkin: null, catalogSkinId: string }}
 */
export function cardFaceSkin(catalogSkinId, playSkin) {
  if (isSafePlaySkin(playSkin)) return { source: "own", playSkin, catalogSkinId };
  return { source: "catalog", playSkin: null, catalogSkinId };
}

/**
 * @param {Date | string} value
 */
function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  return date.toISOString();
}

/**
 * @param {SkinRow} row
 * @returns {OwnSkinRecord}
 */
function toRecord(row) {
  let config = null;
  try {
    config = parseOwnSkinConfig(row.config);
  } catch (error) {
    if (!(error instanceof OwnSkinError)) throw error;
  }
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    configVersion: row.configVersion,
    config,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/**
 * @param {OwnSkinStore} store
 * @param {string} userId
 */
async function assertPremium(store, userId) {
  if (!(await store.premiumActive(userId))) {
    throw new OwnSkinError("PREMIUM", ownSkinCopy.premium);
  }
}

/**
 * @param {OwnSkinStore} store
 * @param {string} userId
 * @param {unknown} id
 */
async function requireOwned(store, userId, id) {
  const skinId = parseSkinId(id);
  const skin = await store.findSkin(skinId);
  if (!skin || skin.userId !== userId) throw new OwnSkinError("NOT_FOUND", ownSkinCopy.missing);
  return skin;
}

/**
 * @param {OwnSkinStore} store
 * @param {string} userId
 */
export async function listOwnSkins(store, userId) {
  await assertPremium(store, userId);
  const [skins, equippedId] = await Promise.all([store.listSkins(userId), store.equippedSkinId(userId)]);
  return {
    limit: OWN_SKIN_LIMIT,
    equippedId,
    skins: skins.map((skin) => ({
      id: skin.id,
      name: skin.name,
      config: skin.config,
      configVersion: skin.configVersion,
      equipped: skin.id === equippedId,
      createdAt: skin.createdAt,
      updatedAt: skin.updatedAt,
    })),
  };
}

/**
 * @param {OwnSkinStore} store
 * @param {string} userId
 * @param {{ name: unknown, config?: unknown }} input
 */
export async function createOwnSkin(store, userId, input) {
  const name = parseOwnSkinName(input.name);
  const config = parseOwnSkinConfig(input.config);
  const created = await store.transaction(async (tx) => {
    await assertPremium(tx, userId);
    await tx.lockUser(userId);
    const count = await tx.countSkins(userId);
    if (count >= OWN_SKIN_LIMIT) throw new OwnSkinError("LIMIT", ownSkinCopy.limit);
    try {
      return await tx.insertSkin({ userId, name, configVersion: OWN_SKIN_VERSION, config });
    } catch (error) {
      if (isOwnSkinLimitError(error)) throw new OwnSkinError("LIMIT", ownSkinCopy.limit);
      throw error;
    }
  });
  if (!created || typeof created !== "object" || !("id" in created)) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  return /** @type {OwnSkinRecord} */ (created);
}

/**
 * @param {OwnSkinStore} store
 * @param {string} userId
 * @param {{ id: unknown, name?: unknown, config?: unknown }} input
 */
export async function updateOwnSkin(store, userId, input) {
  const hasName = input.name !== undefined;
  const hasConfig = input.config !== undefined;
  if (!hasName && !hasConfig) throw new OwnSkinError("INVALID", ownSkinCopy.save);
  const name = hasName ? parseOwnSkinName(input.name) : undefined;
  const config = hasConfig ? parseOwnSkinConfig(input.config) : undefined;
  const updated = await store.transaction(async (tx) => {
    await assertPremium(tx, userId);
    await tx.lockUser(userId);
    const skin = await requireOwned(tx, userId, input.id);
    return tx.updateSkin(skin.id, {
      ...(name !== undefined ? { name } : {}),
      ...(config !== undefined ? { config, configVersion: OWN_SKIN_VERSION } : {}),
    });
  });
  if (!updated || typeof updated !== "object" || !("id" in updated)) {
    throw new OwnSkinError("INVALID", ownSkinCopy.invalid);
  }
  return /** @type {OwnSkinRecord} */ (updated);
}

/**
 * @param {OwnSkinStore} store
 * @param {string} userId
 * @param {unknown} id
 */
export async function deleteOwnSkin(store, userId, id) {
  await store.transaction(async (tx) => {
    await assertPremium(tx, userId);
    await tx.lockUser(userId);
    const skin = await requireOwned(tx, userId, id);
    await tx.deleteSkin(skin.id);
  });
  return { deleted: true };
}

/**
 * @param {OwnSkinStore} store
 * @param {string} userId
 * @param {unknown} id
 */
export async function equipOwnSkin(store, userId, id) {
  const equippedId = await store.transaction(async (tx) => {
    await assertPremium(tx, userId);
    await tx.lockUser(userId);
    const skin = await requireOwned(tx, userId, id);
    await tx.setEquipped(userId, skin.id);
    return skin.id;
  });
  if (typeof equippedId !== "string") throw new OwnSkinError("NOT_FOUND", ownSkinCopy.missing);
  return { equippedId };
}

/**
 * Render read. Premium is not required.
 * @param {OwnSkinStore} store
 * @param {string} userId
 */
export async function readEquippedOwnSkin(store, userId) {
  const row = await store.equippedSkin(userId);
  if (!row) return null;
  return renderStoredOwnSkin(row);
}

/**
 * @param {PrismaOwnSkinDb} client
 * @param {boolean} nested
 * @returns {OwnSkinStore}
 */
function storeFrom(client, nested) {
  return {
    transaction(run) {
      if (nested) return run(storeFrom(client, true));
      return client.$transaction((tx) => run(storeFrom(tx, true)));
    },
    async lockUser(userId) {
      await client.$executeRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    },
    async premiumActive(userId) {
      const row = await client.subscription.findUnique({
        where: { userId },
        select: { status: true },
      });
      return isPremiumStatus(row?.status ?? null);
    },
    countSkins(userId) {
      return client.ownSkin.count({ where: { userId } });
    },
    async listSkins(userId) {
      const rows = await client.ownSkin.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toRecord);
    },
    async findSkin(id) {
      const row = await client.ownSkin.findUnique({ where: { id } });
      return row ? toRecord(row) : null;
    },
    async insertSkin(input) {
      try {
        const row = await client.ownSkin.create({
          data: {
            userId: input.userId,
            name: input.name,
            configVersion: input.configVersion,
            config: input.config,
          },
        });
        return toRecord(row);
      } catch (error) {
        if (isOwnSkinLimitError(error)) throw new OwnSkinError("LIMIT", ownSkinCopy.limit);
        throw error;
      }
    },
    async updateSkin(id, patch) {
      const row = await client.ownSkin.update({ where: { id }, data: patch });
      return toRecord(row);
    },
    async deleteSkin(id) {
      await client.ownSkin.delete({ where: { id } });
    },
    async equippedSkinId(userId) {
      const row = await client.ownSkinEquip.findUnique({
        where: { userId },
        select: { skinId: true },
      });
      return row?.skinId ?? null;
    },
    async equippedSkin(userId) {
      const row = await client.ownSkinEquip.findUnique({
        where: { userId },
        include: { skin: true },
      });
      if (!row?.skin) return null;
      return toRecord(row.skin);
    },
    async setEquipped(userId, skinId) {
      await client.ownSkinEquip.upsert({
        where: { userId },
        create: { userId, skinId },
        update: { skinId },
      });
    },
  };
}

/**
 * @param {object} db
 * @returns {OwnSkinStore}
 */
export function bindPrismaOwnSkinStore(db) {
  return storeFrom(/** @type {PrismaOwnSkinDb} */ (db), false);
}
