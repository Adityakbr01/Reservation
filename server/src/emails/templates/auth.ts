import {
  brandLinks,
  emailButton,
  escapeHtml,
  infoCard,
  layout,
  p,
  safeSubjectText,
  textLinks,
} from "../shared";
import type { BrandLinks, RenderedEmail } from "../shared";

export interface AuthEmailBrand {
  brandName?: string | null;
  brandSiteUrl?: string | null;
  bookingSiteUrl?: string | null;
  loginUrl?: string | null;
}

function resolveBrand(opts?: AuthEmailBrand): BrandLinks & { loginUrl: string } {
  const links = brandLinks({
    ...(opts?.brandName ? { brandName: opts.brandName } : {}),
    ...(opts?.brandSiteUrl ? { brandSiteUrl: opts.brandSiteUrl } : {}),
    ...(opts?.bookingSiteUrl ? { bookingSiteUrl: opts.bookingSiteUrl } : {}),
  });
  return {
    ...links,
    loginUrl: opts?.loginUrl?.trim() || `${links.bookingSiteUrl.replace(/\/$/, "")}/login`,
  };
}

export function passwordResetEmail(
  name: string,
  resetUrl: string,
  opts?: AuthEmailBrand,
): RenderedEmail {
  const brand = resolveBrand(opts);
  return {
    subject: safeSubjectText(`Reset Your ${brand.brandName} Password`),
    html: layout(
      "Reset your password",
      escapeHtml(name),
      p(
        `We’ve received a request to reset the password for your <strong>${escapeHtml(brand.brandName)}</strong> account.`,
      ) +
        p(`Click the button below to choose a new password.`) +
        emailButton(resetUrl, "Reset Your Password") +
        infoCard(
          p(
            `<span style="font-size: 13.5px;">If you didn’t request a password reset, you can safely ignore this email. Your password will remain unchanged.<br />For your security, the reset link will expire after 1 hour.</span>`,
          ),
        ) +
        textLinks([
          { url: brand.brandSiteUrl, label: `Explore ${brand.brandName} →` },
          { url: brand.bookingSiteUrl, label: `Visit our booking website →` },
        ]),
      "If you did not request this, you can ignore this email.",
      { preheader: "Choose a new password for your account" },
    ),
    text: [
      `Hello ${name},`,
      ``,
      `We've received a request to reset the password for your ${brand.brandName} account.`,
      ``,
      `Click the link below to choose a new password:`,
      resetUrl,
      ``,
      `If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.`,
      ``,
      `For your security, the reset link will expire after 1 hour.`,
      ``,
      `Warm wishes,`,
      `The ${brand.brandName} Team`,
      ``,
      brand.brandSiteUrl,
    ].join("\n"),
  };
}

export function passwordChangedEmail(name: string, opts?: AuthEmailBrand): RenderedEmail {
  const brand = resolveBrand(opts);
  return {
    subject: `Your Password Has Been Updated`,
    html: layout(
      "Password reset successful",
      escapeHtml(name),
      p(
        `Your <strong>${escapeHtml(brand.brandName)}</strong> account password has been successfully reset.`,
      ) +
        p(`You can now sign in using your new password.`) +
        emailButton(brand.loginUrl, "Sign In to Your Account") +
        infoCard(
          p(
            `<span style="font-size: 13.5px;">If you didn’t make this change, please contact our team immediately through our booking website.</span>`,
          ),
        ) +
        textLinks([
          { url: brand.brandSiteUrl, label: `Explore ${brand.brandName} →` },
          { url: brand.bookingSiteUrl, label: `Visit our booking website →` },
        ]),
      `Questions? Contact us through ${escapeHtml(brand.bookingSiteUrl)}.`,
      { preheader: "Your password was updated — sign in with your new password" },
    ),
    text: [
      `Hello ${name},`,
      ``,
      `Your ${brand.brandName} account password has been successfully reset.`,
      ``,
      `You can now sign in using your new password:`,
      brand.loginUrl,
      ``,
      `If you didn't make this change, please contact our team immediately through our booking website.`,
      ``,
      `Warm wishes,`,
      `The ${brand.brandName} Team`,
      ``,
      brand.brandSiteUrl,
    ].join("\n"),
  };
}
