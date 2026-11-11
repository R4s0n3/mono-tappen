/**
 * iOS replacement for play/src/client/links.ts.
 * Returning null hides the share button. No hub, shop, Stripe, or box URL
 * is present in this module, and Vite aliases the website module out.
 */
export function cardShareUrl(_cardId: string): string | null {
  return null;
}
