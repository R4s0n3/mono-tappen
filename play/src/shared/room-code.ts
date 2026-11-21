/**
 * Join codes are six characters from an alphabet with no visually
 * confusable glyphs (0/O, 1/I/L removed). They are stored in uppercase so a
 * case sensitive lookup matches what a player types.
 */
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 6;

/**
 * Trim and uppercase a code before it is stored or looked up.
 * Typing, paste, and invite links may arrive in any case with extra spaces.
 */
export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Uppercase the field value as the player types or pastes.
 * A few letters grow when uppercased, so each caret follows the uppercased
 * prefix of the raw text instead of keeping the old index.
 */
export function uppercaseRoomCodeInput(
  raw: string,
  selectionStart: number | null,
  selectionEnd: number | null,
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = caretAfterUppercase(raw, selectionStart);
  const end = caretAfterUppercase(raw, selectionEnd);
  return {
    value: raw.toUpperCase(),
    selectionStart: Math.min(start, end),
    selectionEnd: Math.max(start, end),
  };
}

function caretAfterUppercase(raw: string, index: number | null): number {
  if (index === null || Number.isNaN(index)) return raw.toUpperCase().length;
  const clamped = Math.min(raw.length, Math.max(0, index));
  return raw.slice(0, clamped).toUpperCase().length;
}

/** A new room code. `random` returns a number in [0, 1), same as Math.random. */
export function randomRoomCode(random: () => number = Math.random): string {
  let code = "";
  const last = ROOM_CODE_ALPHABET.length - 1;
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const index = Math.min(
      last,
      Math.max(0, Math.floor(random() * ROOM_CODE_ALPHABET.length)),
    );
    code += ROOM_CODE_ALPHABET.charAt(index);
  }
  return code;
}
