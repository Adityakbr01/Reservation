let currentCurrency =
  (typeof window !== "undefined" && localStorage.getItem("hs_currency")) ||
  "GBP";

/** Set default currency dynamically from admin settings. */
export function setDefaultCurrency(currency?: string | null): void {
  if (currency && typeof currency === "string" && currency.trim()) {
    currentCurrency = currency.trim().toUpperCase();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hs_currency", currentCurrency);
      } catch {}
    }
  }
}

/** Get the currently active currency code (e.g. "GBP", "USD", "EUR"). */
export function getDefaultCurrency(): string {
  return currentCurrency || "GBP";
}

/**
 * Returns the currency symbol for the given currency code (or currently active admin currency).
 * E.g., GBP -> "£", EUR -> "€", USD -> "$", INR -> "₹", AUD -> "A$", CAD -> "CA$"
 */
export function getCurrencySymbol(currency?: string | null): string {
  const code =
    currency && currency.trim()
      ? currency.trim().toUpperCase()
      : getDefaultCurrency();
  try {
    const formatted = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
      maximumFractionDigits: 0,
    }).format(0);
    return formatted.replace(/[0-9\s.,]/g, "") || code;
  } catch {
    return code;
  }
}

/**
 * Format money for display in the configured Currency.
 * Accepts minor units (pence/cents, e.g. 15000 for 150.00).
 * If a raw major unit (e.g. 150, 260, 450) is passed from legacy or unmigrated endpoints,
 * automatically normalizes to minor units so the UI never displays "1.50" instead of "150.00".
 */
export function formatMoney(amount: number, currency?: string | null): string {
  const code =
    currency && currency.trim()
      ? currency.trim().toUpperCase()
      : getDefaultCurrency();

  if (amount == null || isNaN(amount)) {
    const sym = getCurrencySymbol(code);
    return `${sym}0.00`;
  }

  // If amount is a small positive whole number (e.g. 150 or 450), it is unscaled major units.
  const minor =
    amount > 0 && amount < 1000 && Number.isInteger(amount)
      ? amount * 100
      : amount;

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    const sym = getCurrencySymbol(code);
    return `${sym}${(minor / 100).toFixed(2)}`;
  }
}
