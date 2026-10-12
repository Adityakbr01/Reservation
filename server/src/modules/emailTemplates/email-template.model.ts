import mongoose from "mongoose";
import type { EmailTemplateCategory } from "../../emails/registry";

/**
 * Admin-editable email template override (brand email system).
 *
 * Rows are sparse: only templates an admin has customized exist here.
 * Everything else renders from the typed code defaults in
 * `src/emails/templates/*`, so disabling or deleting a row always falls
 * back to safe transactional mail — never to silence.
 */
export interface EmailTemplateOverride {
  key: string;
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface EmailTemplateDocument extends mongoose.Document {
  key: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new mongoose.Schema<EmailTemplateDocument>(
  {
    key: { type: String, required: true, unique: true, maxlength: 60 },
    subject: { type: String, required: true, maxlength: 160 },
    // Bodies are optional: a blank field falls back to the matching code
    // default part, so subject-only customizations work.
    htmlBody: { type: String, default: "", maxlength: 100_000 },
    textBody: { type: String, default: "", maxlength: 20_000 },
    isEnabled: { type: Boolean, required: true, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Guarded for --hot reloads.
export const EmailTemplateModel =
  mongoose.models.EmailTemplate ??
  mongoose.model<EmailTemplateDocument>("EmailTemplate", emailTemplateSchema);

export function toOverride(doc: EmailTemplateDocument): {
  key: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
} {
  return {
    key: doc.key,
    subject: doc.subject,
    htmlBody: doc.htmlBody,
    textBody: doc.textBody,
    isEnabled: doc.isEnabled,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
}
