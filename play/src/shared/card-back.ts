/**
 * Ink for the card back. The equipped skin already chose a font color
 * for this background, so the mark uses that same contrast.
 * An own skin pattern is painted by the card frame. The brand lattice
 * then stays quiet so the two patterns do not fight.
 */
export type CardBackTone = {
  ink: string;
  muted: string;
  lattice: string;
  quietLattice: boolean;
};

const LIGHT: Omit<CardBackTone, "quietLattice"> = {
  ink: "#f5f5fa",
  muted: "#c5c6d6",
  lattice: "#f5f5fa",
};

const DARK: Omit<CardBackTone, "quietLattice"> = {
  ink: "#1d1f2f",
  muted: "#555a8b",
  lattice: "#1d1f2f",
};

export function cardBackTone(
  fontColor: string,
  pattern: string | null | undefined,
): CardBackTone {
  const base = fontColor === "light" ? LIGHT : DARK;
  const quietLattice =
    typeof pattern === "string" && pattern.length > 0 && pattern !== "plain";
  return { ...base, quietLattice };
}
