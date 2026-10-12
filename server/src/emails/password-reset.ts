import { env } from "../config/env";
import { logger } from "../config/logger";
import { getEmailProvider } from "./email.provider";
import { resolveTemplate } from "../modules/emailTemplates/email-template.service";
import { passwordChangedEmail, passwordResetEmail } from "./templates/auth";
import { DEFAULT_BRAND_SITE_URL } from "./shared";

function brandContext(): {
  brandName: string;
  brandSiteUrl: string;
  bookingSiteUrl: string;
  loginUrl: string;
} {
  const bookingSiteUrl = env.CLIENT_URL;
  const brandSiteUrl =
    env.EXTRA_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)[0] ?? DEFAULT_BRAND_SITE_URL;
  return {
    // Brand name comes from the property at send time where available;
    // templates fall back to Hamptworth Stays so this stays dynamic.
    brandName: "Hamptworth Stays",
    brandSiteUrl,
    bookingSiteUrl,
    loginUrl: `${bookingSiteUrl.replace(/\/$/, "")}/login`,
  };
}

/**
 * Sends the password-reset email. Never throws: delivery failure is logged
 * (without links or tokens) and email failure must never invalidate the
 * auth flow (the endpoint already replied success for anti-enumeration).
 * An enabled admin override wins; otherwise the typed code default sends.
 */
export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const brand = brandContext();
  try {
    const { rendered } = await resolveTemplate(
      "PASSWORD_RESET",
      {
        guestName: name,
        brandName: brand.brandName,
        resetUrl,
        brandSiteUrl: brand.brandSiteUrl,
        bookingSiteUrl: brand.bookingSiteUrl,
        expiryNote: "For your security, the reset link expires after 1 hour.",
      },
      passwordResetEmail(name, resetUrl, brand),
    );
    await getEmailProvider().send(to, rendered);
    logger.info("Password reset email sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Password reset email failed", { message });
  }
}

/**
 * Sends the "password reset successful" confirmation. Never throws — called
 * only after resetPassword commits, so delivery failure must not fail the
 * request. Never includes the password or the reset token.
 */
export async function sendPasswordChangedEmail(to: string, name: string): Promise<void> {
  const brand = brandContext();
  try {
    const { rendered } = await resolveTemplate(
      "PASSWORD_CHANGED",
      {
        guestName: name,
        brandName: brand.brandName,
        loginUrl: brand.loginUrl,
        brandSiteUrl: brand.brandSiteUrl,
        bookingSiteUrl: brand.bookingSiteUrl,
      },
      passwordChangedEmail(name, brand),
    );
    await getEmailProvider().send(to, rendered);
    logger.info("Password changed email sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Password changed email failed", { message });
  }
}
