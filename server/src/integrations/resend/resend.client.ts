import { Resend } from "resend";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";

let cached: Resend | null = null;

/**
 * Lazy Resend singleton. Call only from the notification/email layer
 * (never controllers) so delivery stays queued, retried, and idempotent.
 */
export function getResend(): Resend {
  if (cached) return cached;
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new AppError("Email provider is not configured", 503, "EMAIL_NOT_CONFIGURED");
  }
  cached = new Resend(apiKey);
  return cached;
}
