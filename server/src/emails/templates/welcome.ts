/**
 * Welcome email for new accounts. No verification flow exists yet —
 * registration is complete on signup, so this is a greeting, not a gate.
 */
import { brandLinks, emailButton, escapeHtml, layout, p, safeSubjectText, textLinks } from "../shared";
import type { BrandLinks, RenderedEmail } from "../shared";

export interface WelcomeEmailBrand {
  brandName?: string | null;
  brandSiteUrl?: string | null;
  bookingSiteUrl?: string | null;
  loginUrl?: string | null;
}

function resolveBrand(opts?: WelcomeEmailBrand): BrandLinks & { loginUrl: string } {
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

export function welcomeEmail(name: string, opts?: WelcomeEmailBrand): RenderedEmail {
  const brand = resolveBrand(opts);
  return {
    subject: safeSubjectText(`Welcome to ${brand.brandName}`),
    html: layout(
      `Welcome to ${escapeHtml(brand.brandName)}`,
      escapeHtml(name),
      p(
        `Your account is ready. Thank you for joining <strong>${escapeHtml(brand.brandName)}</strong> — we’re delighted to have you with us.`,
      ) +
        p(
          `When you’re ready for a countryside escape, you can browse live availability and book direct for the best rate.`,
        ) +
        emailButton(brand.bookingSiteUrl, "Explore stays →") +
        textLinks([
          { url: brand.brandSiteUrl, label: `Explore ${brand.brandName} →` },
          { url: brand.bookingSiteUrl, label: `Visit our booking website →` },
        ]),
      `Questions? Contact us through ${escapeHtml(brand.bookingSiteUrl)}.`,
      { preheader: `Your ${brand.brandName} account is ready` },
    ),
    text: [
      `Hello ${name},`,
      ``,
      `Your account is ready. Thank you for joining ${brand.brandName} — we're delighted to have you with us.`,
      ``,
      `When you're ready for a countryside escape, browse live availability and book direct for the best rate:`,
      brand.bookingSiteUrl,
      ``,
      `Warm wishes,`,
      `The ${brand.brandName} Team`,
    ].join("\n"),
  };
}
