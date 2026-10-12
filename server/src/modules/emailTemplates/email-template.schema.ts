import { z } from "zod";
import { EMAIL_TEMPLATE_CATEGORIES, EMAIL_TEMPLATE_KEYS } from "../../emails/registry";

const templateKeySchema = z.enum(EMAIL_TEMPLATE_KEYS);

export const emailTemplateKeyParamsSchema = z.object({
  key: templateKeySchema,
});

export type EmailTemplateKeyParams = z.infer<typeof emailTemplateKeyParamsSchema>;

export const listEmailTemplatesQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.enum(EMAIL_TEMPLATE_CATEGORIES).optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
});

export type ListEmailTemplatesQuery = z.infer<typeof listEmailTemplatesQuerySchema>;

/** Admin-editable body: subject + inner HTML/text with approved {{variables}} only. */
export const updateEmailTemplateSchema = z.object({
  subject: z.string().trim().min(5).max(160).optional(),
  htmlBody: z.string().min(50).max(100_000).optional(),
  textBody: z.string().trim().min(20).max(20_000).optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;

export const testEmailTemplateSchema = z.object({
  to: z.string().trim().toLowerCase().email().max(160),
});

export type TestEmailTemplateInput = z.infer<typeof testEmailTemplateSchema>;

/**
 * Live draft preview: lenient on purpose — admins preview mid-typing, so
 * empty/short fields fall back to the code default instead of failing.
 */
export const draftPreviewEmailTemplateSchema = z.object({
  subject: z.string().trim().max(160).optional(),
  htmlBody: z.string().max(100_000).optional(),
  textBody: z.string().trim().max(20_000).optional(),
});

export type DraftPreviewEmailTemplateInput = z.infer<typeof draftPreviewEmailTemplateSchema>;
