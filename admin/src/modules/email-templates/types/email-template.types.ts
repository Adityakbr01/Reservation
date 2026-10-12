export type EmailTemplateCategory = "booking" | "payment" | "account" | "admin";

export interface EmailTemplateListItem {
  key: string;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  requiredVars: string[];
  optionalVars: string[];
  essential: boolean;
  notificationType: string | null;
  subject: string;
  isEnabled: boolean;
  isCustomized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface EmailTemplateDetail extends EmailTemplateListItem {
  htmlBody: string | null;
  textBody: string | null;
  starter: { subject: string; htmlBody: string; textBody: string };
  /** Code-default render converted back to editable {{variables}}. */
  editableSource: { subject: string; htmlBody: string; textBody: string };
}

export interface EmailTemplatePreview {
  subject: string;
  html: string;
  text: string;
  source: "custom" | "default" | "draft";
  variables: { required: string[]; optional: string[] };
  /** Dummy {{variable}} values backing the preview (also used for local live render). */
  dummyVars: Record<string, string>;
}

export interface EmailTemplateFilters {
  search?: string;
  category?: EmailTemplateCategory | "all";
  status?: "enabled" | "disabled" | "all";
}

export interface UpdateEmailTemplatePayload {
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  isEnabled?: boolean;
}
