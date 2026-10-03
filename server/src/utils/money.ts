/**
 * Centralized money math (docs: never floats for money).
 * Every amount is an integer in the currency's minor unit (paise/cents).
 */
export function percentOf(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

export interface DiscountSpec {
  type: "PERCENTAGE" | "FIXED";
  /** Percent (1-100) or fixed minor units, per type. */
  value: number;
  maxDiscount?: number | null;
}

/**
 * Discount for a subtotal. Never exceeds the subtotal, never negative,
 * honours an optional cap. Pure — shared by validate + quote.
 */
export function applyDiscount(subtotal: number, discount: DiscountSpec): number {
  if (subtotal <= 0) return 0;
  const raw = discount.type === "PERCENTAGE" ? percentOf(subtotal, discount.value) : discount.value;
  const bounded = Math.min(raw, subtotal);
  const capped = discount.maxDiscount != null ? Math.min(bounded, discount.maxDiscount) : bounded;
  return Math.max(0, capped);
}
