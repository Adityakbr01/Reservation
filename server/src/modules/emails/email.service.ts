import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { getResend } from "../../integrations/resend/resend.client";

function passwordResetHtml(name: string, resetUrl: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background: #f8f7f3; padding: 24px;">
    <div style="max-width: 480px; margin: auto; background: #ffffff; border-radius: 16px; padding: 32px;">
      <h1 style="font-size: 22px; color: #000000;">Reset your password</h1>
      <p style="color: #2f2f2f;">Hi ${name},</p>
      <p style="color: #2f2f2f;">Tap the button below to choose a new password. The link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; background: #ff8000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-size: 14px;">Reset password</a>
      <p style="color: #696969; font-size: 12px;">If you did not request this, you can ignore this email.</p>
    </div>
  </body>
</html>`;
}

/**
 * Sends the password-reset email. Never throws: delivery failure is logged
 * and email failure must never invalidate the auth flow (the endpoint
 * already replied success for anti-enumeration).
 */
export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await getResend().emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Reset your password",
      html: passwordResetHtml(name, resetUrl),
    });
    logger.info("Password reset email sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Password reset email failed", { message });
  }
}
