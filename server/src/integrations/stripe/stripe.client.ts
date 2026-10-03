import Stripe from "stripe";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";

let cached: Stripe | null = null;

/**
 * Lazy Stripe SDK singleton. Business modules call getStripe() at use time;
 * a safe 503 is thrown when unconfigured instead of crashing boot.
 * Secret key never leaves the server.
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError("Stripe is not configured", 503, "STRIPE_NOT_CONFIGURED");
  }
  cached = new Stripe(secretKey);
  return cached;
}
