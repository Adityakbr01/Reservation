import { env } from "../config/env";
import { logger } from "../config/logger";
import { getResend } from "../integrations/resend/resend.client";
import type { RenderedEmail } from "./shared";

export interface SendResult {
  provider: string;
  providerMessageId: string | null;
}

export interface EmailProvider {
  name: string;
  send(to: string, email: RenderedEmail): Promise<SendResult>;
}

/** Production path: Resend (docs 06 §71 — replaceable provider). */
class ResendEmailProvider implements EmailProvider {
  name = "resend";

  async send(to: string, email: RenderedEmail): Promise<SendResult> {
    const result = await getResend().emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: email.subject,
      html: email.html,
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { provider: this.name, providerMessageId: result.data?.id ?? null };
  }
}

/**
 * Development path: used when no RESEND_API_KEY is configured. Logs the
 * render and marks SENT so local flows stay testable without a provider.
 */
class LogEmailProvider implements EmailProvider {
  name = "log";

  async send(to: string, email: RenderedEmail): Promise<SendResult> {
    logger.info("Email (log provider — not sent)", { to, subject: email.subject });
    return { provider: this.name, providerMessageId: null };
  }
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  cached = env.RESEND_API_KEY ? new ResendEmailProvider() : new LogEmailProvider();
  return cached;
}

/** Test seam: resets the cached provider between test cases. */
export function resetEmailProvider(): void {
  cached = null;
}
