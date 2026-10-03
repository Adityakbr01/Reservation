import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

let cachedPromise: Promise<Stripe | null> | null = null;

/**
 * Lazily loads Stripe.js with the publishable key from
 * VITE_STRIPE_PUBLISHABLE_KEY. Returns null when unconfigured so the
 * payment step can render a configuration error instead of crashing.
 * Never put a secret key here — publishable keys are public by design.
 */
export function getStripePromise(): Promise<Stripe | null> | null {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key) return null;
  if (!cachedPromise) {
    cachedPromise = loadStripe(key);
  }
  return cachedPromise;
}
