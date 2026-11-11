/**
 * Website-only outbound links. The iOS build aliases this module away
 * (play/native/vite.config.ts) so hub URLs are not in the native bundle.
 * Shop, Stripe, and box redeem are not linked from here.
 */
export function cardShareUrl(cardId: string): string | null {
  if (!cardId || cardId === "default") return null;
  return `https://hub.tappen.app/card/${cardId}`;
}
