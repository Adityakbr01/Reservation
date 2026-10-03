import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { requireUser } from "../../middleware/auth";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import type { ContentStatus } from "./cms.types";
import {
  createBlogPost,
  createFaq,
  createOffer,
  createPage,
  deleteFaq,
  getBlogPostAdmin,
  getOfferAdmin,
  getPageAdmin,
  getPublishedBlogPost,
  getPublishedPage,
  getPublishedPolicyDoc,
  issueBlogPreview,
  issuePagePreview,
  listBlogPosts,
  listFaqs,
  listOffers,
  listPages,
  listPolicyDocs,
  listPublishedFaqs,
  listPublishedOffers,
  resolvePreviewToken,
  setBlogPostStatus,
  setFaqStatus,
  setOfferStatus,
  setPageStatus,
  setPolicyDocStatus,
  updateBlogPost,
  updateFaq,
  updateOffer,
  updatePage,
  upsertPolicyDoc,
} from "./cms.service";
import type { PolicyKey } from "./cms.types";
import type {
  CmsListQuery,
  CreateBlogPostInput,
  CreateFaqInput,
  CreateOfferInput,
  CreatePageInput,
  StatusTransitionInput,
  UpdateBlogPostInput,
  UpdateFaqInput,
  UpdateOfferInput,
  UpdatePageInput,
  UpsertPolicyDocInput,
} from "./cms.schema";

// --- Admin: pages ---

async function recordCmsStatus(
  req: Request,
  to: ContentStatus,
  entityType: string,
  entityId: string,
): Promise<void> {
  const action =
    to === "PUBLISHED" ? "CMS_PUBLISHED" : to === "ARCHIVED" ? "CMS_ARCHIVED" : "CMS_UNPUBLISHED";
  await recordAudit(req, action, entityType, {
    entityId,
    after: { status: to },
  });
}

export const adminCreatePageHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreatePageInput;
  const result = await createPage({ ...body, createdBy: requireUser(req).id });
  res.status(201).json({ success: true, data: result });
});

export const adminListPagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as CmsListQuery;
  const result = await listPages(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminUpdatePageHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdatePageInput;
  const result = await updatePage(req.params.id as string, body.version, body);
  res.status(200).json({ success: true, data: result });
});

export const adminGetPageHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getPageAdmin(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});

export const adminPageStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as StatusTransitionInput;
  await setPageStatus(req.params.id as string, body.version, body.to);
  await recordCmsStatus(req, body.to, 'cms-page', req.params.id as string);
  res.status(200).json({ success: true, data: { message: "Status updated" } });
});

export const adminPagePreviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await issuePagePreview(req.params.id as string);
  res.status(201).json({ success: true, data: result });
});

// --- Admin: blogs ---

export const adminCreateBlogPostHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateBlogPostInput;
  const result = await createBlogPost({ ...body, createdBy: requireUser(req).id });
  res.status(201).json({ success: true, data: result });
});

export const adminListBlogPostsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as CmsListQuery;
  const result = await listBlogPosts(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminUpdateBlogPostHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateBlogPostInput;
  const result = await updateBlogPost(req.params.id as string, body.version, body);
  res.status(200).json({ success: true, data: result });
});

export const adminGetBlogPostHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getBlogPostAdmin(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});

export const adminBlogPostStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as StatusTransitionInput;
  await setBlogPostStatus(req.params.id as string, body.version, body.to);
  await recordCmsStatus(req, body.to, 'cms-blog', req.params.id as string);
  res.status(200).json({ success: true, data: { message: "Status updated" } });
});

export const adminBlogPreviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await issueBlogPreview(req.params.id as string);
  res.status(201).json({ success: true, data: result });
});

// --- Admin: FAQs ---

export const adminCreateFaqHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await createFaq(req.body as CreateFaqInput);
  res.status(201).json({ success: true, data: result });
});

export const adminListFaqsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as CmsListQuery;
  const result = await listFaqs(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminUpdateFaqHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateFaqInput;
  const result = await updateFaq(req.params.id as string, body.version, body);
  res.status(200).json({ success: true, data: result });
});

export const adminFaqStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as StatusTransitionInput;
  await setFaqStatus(req.params.id as string, body.version, body.to);
  await recordCmsStatus(req, body.to, 'cms-faq', req.params.id as string);
  res.status(200).json({ success: true, data: { message: "Status updated" } });
});

export const adminDeleteFaqHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteFaq(req.params.id as string);
  res.status(200).json({ success: true, data: { message: "FAQ deleted" } });
});

// --- Admin: offers ---

export const adminCreateOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateOfferInput;
  const result = await createOffer({ ...body, createdBy: requireUser(req).id });
  res.status(201).json({ success: true, data: result });
});

export const adminListOffersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as CmsListQuery;
  const result = await listOffers(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminUpdateOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateOfferInput;
  const result = await updateOffer(req.params.id as string, body.version, body);
  res.status(200).json({ success: true, data: result });
});

export const adminGetOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getOfferAdmin(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});

export const adminOfferStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as StatusTransitionInput;
  await setOfferStatus(req.params.id as string, body.version, body.to);
  await recordCmsStatus(req, body.to, 'cms-offer', req.params.id as string);
  res.status(200).json({ success: true, data: { message: "Status updated" } });
});

// --- Admin: policy documents ---

export const adminUpsertPolicyDocHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await upsertPolicyDoc(req.body as UpsertPolicyDocInput);
  res.status(200).json({ success: true, data: result });
});

export const adminListPolicyDocsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const result = await listPolicyDocs();
  res.status(200).json({ success: true, data: result });
});

export const adminPolicyDocStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as StatusTransitionInput;
  await setPolicyDocStatus(req.params.key as PolicyKey, body.to);
  await recordCmsStatus(req, body.to, "cms-policy", req.params.key as string);
  res.status(200).json({ success: true, data: { message: "Status updated" } });
});

// --- Public readers (published only) ---

export const publicGetPageHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getPublishedPage(req.params.slug as string);
  res.status(200).json({ success: true, data: result });
});

export const publicListBlogPostsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as CmsListQuery;
  const result = await listBlogPosts({ ...query, status: "PUBLISHED" });
  // Strip admin fields (status/version) from the public payload.
  const items = result.data.map(({ status: _status, version: _version, ...rest }) => rest);
  res.status(200).json({ success: true, data: items, meta: result.meta });
});

export const publicGetBlogPostHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getPublishedBlogPost(req.params.slug as string);
  res.status(200).json({ success: true, data: result });
});

export const publicListFaqsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const result = await listPublishedFaqs();
  res.status(200).json({ success: true, data: result });
});

export const publicListOffersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const result = await listPublishedOffers();
  res.status(200).json({ success: true, data: result });
});

export const publicGetPolicyDocHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getPublishedPolicyDoc(
    req.params.key as Parameters<typeof getPublishedPolicyDoc>[0],
  );
  res.status(200).json({ success: true, data: result });
});

export const publicPreviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await resolvePreviewToken(req.params.token as string);
  res.status(200).json({ success: true, data: result });
});
