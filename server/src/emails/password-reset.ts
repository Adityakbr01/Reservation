import { env } from "../config/env";
import { logger } from "../config/logger";
import { getEmailProvider } from "./email.provider";
import { passwordResetEmail } from "./templates/auth";

/**
 * Sends the password-reset email. Never throws: delivery failure is logged
 * and email failure must never invalidate the auth flow (the endpoint
 * already replied success for anti-enumeration).
 */
export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await getEmailProvider().send(to, passwordResetEmail(name, resetUrl));
    logger.info("Password reset email sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Password reset email failed", { message });
  }
}
