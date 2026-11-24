/**
 * Colors for the card back.
 * The back is one solid skin color. The mark is the other skin color when
 * that stays readable, and otherwise the light or dark brand ink.
 */

export type CardBackInput = {
  primary?: string | null;
  secondary?: string | null;
  highlight?: string | null;
  rarity?: string | null;
};

export type CardBackTone = {
  fill: string;
  symbol: string;
  /** 0 to 1. Legendary skins get a stronger gloss band. */
  gloss: number;
  /** Color of the highlight sweep. White, or the skin highlight on legendary. */
  glossTint: string;
};

const PAPER = "#f5f5fa";
const NAVY = "#1d1f2f";
const WHITE = "#ffffff";
const READABLE = 3;

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luma(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const left = luma(a);
  const right = luma(b);
  const hi = Math.max(left, right);
  const lo = Math.min(left, right);
  return (hi + 0.05) / (lo + 0.05);
}

export function cardBackTone(
  input: CardBackInput | null | undefined,
): CardBackTone {
  const primary = isHex(input?.primary) ? input.primary : null;
  const secondary = isHex(input?.secondary) ? input.secondary : null;
  const fill = primary ?? secondary ?? NAVY;
  const other =
    fill.toLowerCase() === primary?.toLowerCase() ? secondary : primary;
  let symbol = NAVY;
  let best = contrast(NAVY, fill);
  const paper = contrast(PAPER, fill);
  if (paper > best) {
    symbol = PAPER;
    best = paper;
  }
  // Keep the skin's second color when it reads clearly. Bright oranges
  // otherwise fall through to navy, which is the darker brand ink.
  if (
    other &&
    other.toLowerCase() !== fill.toLowerCase() &&
    contrast(other, fill) >= READABLE &&
    contrast(other, fill) + 0.45 >= best
  ) {
    symbol = other;
  }

  const legendary = input?.rarity === "legendary";
  const glossTint =
    legendary && isHex(input?.highlight) ? input.highlight : WHITE;

  return {
    fill,
    symbol,
    gloss: legendary ? 0.82 : 0.58,
    glossTint,
  };
}
