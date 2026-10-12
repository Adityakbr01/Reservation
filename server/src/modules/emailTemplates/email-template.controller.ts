import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { requireUser } from "../../middleware/auth";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import { isEmailTemplateKey } from "../../emails/registry";
import { AppError } from "../../utils/app-error";
import {
  getEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  renderDraftPreview,
  sendTestEmailTemplate,
  updateEmailTemplate,
} from "./email-template.service";
import type {
  DraftPreviewEmailTemplateInput,
  EmailTemplateKeyParams,
  ListEmailTemplatesQuery,
  TestEmailTemplateInput,
  UpdateEmailTemplateInput,
} from "./email-template.schema";

function templateKey(req: Request): EmailTemplateKeyParams["key"] {
  const key = req.params.key as string;
  if (!isEmailTemplateKey(key)) {
    throw new AppError("Email template not found", 404, "EMAIL_TEMPLATE_NOT_FOUND");
  }
  return key;
}

/** GET /api/v1/admin/email-templates?search=&category=&status= */
export const listEmailTemplatesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery)
    .validatedQuery as ListEmailTemplatesQuery;
  const data = await listEmailTemplates(query);
  res.status(200).json({ success: true, data });
});

/** GET /api/v1/admin/email-templates/:key */
export const getEmailTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getEmailTemplate(templateKey(req));
  res.status(200).json({ success: true, data });
});

/** PUT /api/v1/admin/email-templates/:key — edit subject / HTML / text / toggle. */
export const updateEmailTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const key = templateKey(req);
  const data = await updateEmailTemplate(
    key,
    req.body as UpdateEmailTemplateInput,
    requireUser(req).id,
  );
  await recordAudit(req, "EMAIL_TEMPLATE_UPDATED", "emailTemplate", {
    entityId: key,
    after: { subject: data.subject, isEnabled: data.isEnabled },
  });
  res.status(200).json({ success: true, data });
});

/** POST /api/v1/admin/email-templates/:key/preview — render with dummy data. */
export const previewEmailTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await previewEmailTemplate(templateKey(req));
  res.status(200).json({ success: true, data });
});

/**
 * POST /api/v1/admin/email-templates/:key/draft-preview — renders the
 * *unsaved* editor content with dummy data for live preview. Read-only:
 * nothing is written, nothing is sent.
 */
export const draftPreviewEmailTemplateHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const data = renderDraftPreview(
      templateKey(req),
      (req.body ?? {}) as DraftPreviewEmailTemplateInput,
    );
    res.status(200).json({ success: true, data });
  },
);

/**
 * POST /api/v1/admin/email-templates/:key/test — send the preview render to
 * one explicitly entered recipient. Rate-limited; audited; never queued.
 */
export const testEmailTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const key = templateKey(req);
  const body = req.body as TestEmailTemplateInput;
  const result = await sendTestEmailTemplate(key, body.to);
  await recordAudit(req, "EMAIL_TEST_SENT", "emailTemplate", {
    entityId: key,
    after: { to: body.to, provider: result.provider },
  });
  res.status(200).json({ success: true, data: result });
});
