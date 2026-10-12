import { env } from "../config/env";
import { logger } from "../config/logger";
import { getEmailProvider } from "./email.provider";
import { resolveTemplate } from "../modules/emailTemplates/email-template.service";
import { welcomeEmail } from "./templates/welcome";
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
    brandName: "Hamptworth Stays",
    brandSiteUrl,
    bookingSiteUrl,
    loginUrl: `${bookingSiteUrl.replace(/\/$/, "")}/login`,
  };
}

/**
 * Welcome mail for a newly registered account. Fire-and-forget by design:
 * registration already succeeded, so delivery failure is logged and never
 * thrown back into signup.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const brand = brandContext();
  try {
    const { rendered } = await resolveTemplate(
      "WELCOME",
      {
        guestName: name,
        brandName: brand.brandName,
        brandSiteUrl: brand.brandSiteUrl,
        bookingSiteUrl: brand.bookingSiteUrl,
        loginUrl: brand.loginUrl,
      },
      welcomeEmail(name, brand),
    );
    await getEmailProvider().send(to, rendered);
    logger.info("Welcome email sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Welcome email failed", { message });
  }
}
