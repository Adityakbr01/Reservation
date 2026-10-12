import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { testEmailRateLimiter } from "../../middleware/rate-limit";
import {
  draftPreviewEmailTemplateHandler,
  getEmailTemplateHandler,
  listEmailTemplatesHandler,
  previewEmailTemplateHandler,
  testEmailTemplateHandler,
  updateEmailTemplateHandler,
} from "./email-template.controller";
import {
  draftPreviewEmailTemplateSchema,
  emailTemplateKeyParamsSchema,
  listEmailTemplatesQuerySchema,
  testEmailTemplateSchema,
  updateEmailTemplateSchema,
} from "./email-template.schema";

export const adminEmailTemplatesRouter = Router();

adminEmailTemplatesRouter.use(authenticate, authorize("admin"));
adminEmailTemplatesRouter.get(
  "/",
  validate({ query: listEmailTemplatesQuerySchema }),
  listEmailTemplatesHandler,
);
adminEmailTemplatesRouter.get(
  "/:key",
  validate({ params: emailTemplateKeyParamsSchema }),
  getEmailTemplateHandler,
);
adminEmailTemplatesRouter.put(
  "/:key",
  validate({ params: emailTemplateKeyParamsSchema, body: updateEmailTemplateSchema }),
  updateEmailTemplateHandler,
);
adminEmailTemplatesRouter.post(
  "/:key/preview",
  validate({ params: emailTemplateKeyParamsSchema }),
  previewEmailTemplateHandler,
);
adminEmailTemplatesRouter.post(
  "/:key/draft-preview",
  validate({ params: emailTemplateKeyParamsSchema, body: draftPreviewEmailTemplateSchema }),
  draftPreviewEmailTemplateHandler,
);
adminEmailTemplatesRouter.post(
  "/:key/test",
  testEmailRateLimiter,
  validate({ params: emailTemplateKeyParamsSchema, body: testEmailTemplateSchema }),
  testEmailTemplateHandler,
);
