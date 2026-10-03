import { escapeHtml, layout } from "../shared";
import type { RenderedEmail } from "../shared";

export function passwordResetEmail(name: string, resetUrl: string): RenderedEmail {
  return {
    subject: "Reset your password",
    html: layout(
      "Reset your password",
      escapeHtml(name),
      `<p style="color: #2f2f2f;">Tap the button below to choose a new password. The link expires in 1 hour.</p><a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #ff8000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-size: 14px;">Reset password</a>`,
      "If you did not request this, you can ignore this email.",
    ),
  };
}
