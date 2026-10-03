import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminBlogPostStatusHandler,
  adminBlogPreviewHandler,
  adminCreateBlogPostHandler,
  adminCreateFaqHandler,
  adminCreateOfferHandler,
  adminCreatePageHandler,
  adminDeleteFaqHandler,
  adminFaqStatusHandler,
  adminGetBlogPostHandler,
  adminGetOfferHandler,
  adminGetPageHandler,
  adminListBlogPostsHandler,
  adminListFaqsHandler,
  adminListOffersHandler,
  adminListPagesHandler,
  adminListPolicyDocsHandler,
  adminOfferStatusHandler,
  adminPagePreviewHandler,
  adminPageStatusHandler,
  adminPolicyDocStatusHandler,
  adminUpdateBlogPostHandler,
  adminUpdateFaqHandler,
  adminUpdateOfferHandler,
  adminUpdatePageHandler,
  adminUpsertPolicyDocHandler,
  publicGetBlogPostHandler,
  publicGetPageHandler,
  publicGetPolicyDocHandler,
  publicListBlogPostsHandler,
  publicListFaqsHandler,
  publicListOffersHandler,
  publicPreviewHandler,
} from "./cms.controller";
import {
  cmsIdParamsSchema,
  cmsListQuerySchema,
  createBlogPostSchema,
  createFaqSchema,
  createOfferSchema,
  createPageSchema,
  policyKeyParamsSchema,
  previewTokenParamsSchema,
  statusTransitionSchema,
  updateBlogPostSchema,
  updateFaqSchema,
  updateOfferSchema,
  updatePageSchema,
  upsertPolicyDocSchema,
} from "./cms.schema";

export const adminCmsRouter = Router();

adminCmsRouter.use(authenticate, authorize("admin"));

const idParams = { params: cmsIdParamsSchema };

adminCmsRouter.post("/pages", validate({ body: createPageSchema }), adminCreatePageHandler);
adminCmsRouter.get("/pages", validate({ query: cmsListQuerySchema }), adminListPagesHandler);
adminCmsRouter.get("/pages/:id", validate(idParams), adminGetPageHandler);
adminCmsRouter.patch("/pages/:id", validate({ ...idParams, body: updatePageSchema }), adminUpdatePageHandler);
adminCmsRouter.post(
  "/pages/:id/status",
  validate({ ...idParams, body: statusTransitionSchema }),
  adminPageStatusHandler,
);
adminCmsRouter.post("/pages/:id/preview", validate(idParams), adminPagePreviewHandler);

adminCmsRouter.post("/blogs", validate({ body: createBlogPostSchema }), adminCreateBlogPostHandler);
adminCmsRouter.get("/blogs", validate({ query: cmsListQuerySchema }), adminListBlogPostsHandler);
adminCmsRouter.get("/blogs/:id", validate(idParams), adminGetBlogPostHandler);
adminCmsRouter.patch(
  "/blogs/:id",
  validate({ ...idParams, body: updateBlogPostSchema }),
  adminUpdateBlogPostHandler,
);
adminCmsRouter.post(
  "/blogs/:id/status",
  validate({ ...idParams, body: statusTransitionSchema }),
  adminBlogPostStatusHandler,
);
adminCmsRouter.post("/blogs/:id/preview", validate(idParams), adminBlogPreviewHandler);

adminCmsRouter.post("/faqs", validate({ body: createFaqSchema }), adminCreateFaqHandler);
adminCmsRouter.get("/faqs", validate({ query: cmsListQuerySchema }), adminListFaqsHandler);
adminCmsRouter.patch("/faqs/:id", validate({ ...idParams, body: updateFaqSchema }), adminUpdateFaqHandler);
adminCmsRouter.post(
  "/faqs/:id/status",
  validate({ ...idParams, body: statusTransitionSchema }),
  adminFaqStatusHandler,
);
adminCmsRouter.delete("/faqs/:id", validate(idParams), adminDeleteFaqHandler);

adminCmsRouter.post("/offers", validate({ body: createOfferSchema }), adminCreateOfferHandler);
adminCmsRouter.get("/offers", validate({ query: cmsListQuerySchema }), adminListOffersHandler);
adminCmsRouter.get("/offers/:id", validate(idParams), adminGetOfferHandler);
adminCmsRouter.patch(
  "/offers/:id",
  validate({ ...idParams, body: updateOfferSchema }),
  adminUpdateOfferHandler,
);
adminCmsRouter.post(
  "/offers/:id/status",
  validate({ ...idParams, body: statusTransitionSchema }),
  adminOfferStatusHandler,
);

adminCmsRouter.put("/policies", validate({ body: upsertPolicyDocSchema }), adminUpsertPolicyDocHandler);
adminCmsRouter.get("/policies", adminListPolicyDocsHandler);
adminCmsRouter.post(
  "/policies/:key/status",
  validate({ params: policyKeyParamsSchema, body: statusTransitionSchema }),
  adminPolicyDocStatusHandler,
);

export const publicCmsRouter = Router();

publicCmsRouter.get("/pages/:slug", publicGetPageHandler);
publicCmsRouter.get("/blogs", validate({ query: cmsListQuerySchema }), publicListBlogPostsHandler);
publicCmsRouter.get("/blogs/:slug", publicGetBlogPostHandler);
publicCmsRouter.get("/faqs", publicListFaqsHandler);
publicCmsRouter.get("/offers", publicListOffersHandler);
publicCmsRouter.get("/policies/:key", publicGetPolicyDocHandler);
publicCmsRouter.get("/preview/:token", validate({ params: previewTokenParamsSchema }), publicPreviewHandler);
