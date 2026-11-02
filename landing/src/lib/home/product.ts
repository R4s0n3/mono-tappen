export const HOME_PRODUCT_NAME = "Tappen Home";
export const HOME_PRODUCT_META = "tappen-home";
export const HOME_UNIT_AMOUNT_CENTS = 1999;
export const HOME_MAX_QUANTITY = 10;
export const HOME_CURRENCY = "eur";
export const HOME_SHIP_BY_LABEL = "24 December 2026";

export const HOME_REGIONS = ["DE", "EU"] as const;
export type HomeRegion = (typeof HOME_REGIONS)[number];

export type CheckoutFormState = {
  error: string | null;
};

export function formatEur(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(cents));
  const whole = Math.floor(absolute / 100);
  const frac = (absolute % 100).toString().padStart(2, "0");
  return `${sign}${whole},${frac}\u00a0€`;
}

export function formatShipping(cents: number): string {
  return cents === 0 ? "Free" : formatEur(cents);
}

export function homeOrderTotal(
  quantity: number,
  shippingCents: number,
): number {
  return HOME_UNIT_AMOUNT_CENTS * quantity + shippingCents;
}
