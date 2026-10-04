import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "../../utils/app-error";
import { findCouponById } from "../coupons/coupon.repository";
import {
  BlogPostModel,
  FaqModel,
  OfferModel,
  PageModel,
  PolicyDocModel,
  paginateModel,
  textSearch,
  toSeoMeta,
} from "./cms.model";
import type {
  BlogPostDocument,
  CmsListFilter,
  FaqDocument,
  OfferDocument,
  PageDocument,
  PageSection,
  PolicyDocument,
} from "./cms.model";
import {
  canTransition,
  isReservedSlug,
  isValidSlug,
  sanitizeRichText,
  transitionError,
} from "./cms.types";
import type { ContentStatus, PolicyKey, SeoMeta } from "./cms.types";

const PREVIEW_TTL_MS = 24 * 3_600_000;

function assertSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    throw new AppError("Slug must be lowercase letters, numbers, and hyphens", 422, "INVALID_SLUG");
  }
  if (isReservedSlug(slug)) {
    throw new AppError("This slug is reserved", 422, "RESERVED_SLUG");
  }
}

function cleanSeo(input: Partial<SeoMeta> | undefined): Partial<SeoMeta> {
  if (!input) return {};
  const out: Partial<SeoMeta> = {};
  if (input.title !== undefined) out.title = input.title;
  if (input.description !== undefined) out.description = input.description;
  if (input.canonicalUrl !== undefined) out.canonicalUrl = input.canonicalUrl;
  if (input.robots !== undefined) out.robots = input.robots;
  if (input.ogTitle !== undefined) out.ogTitle = input.ogTitle;
  if (input.ogDescription !== undefined) out.ogDescription = input.ogDescription;
  if (input.ogImageMediaId !== undefined) out.ogImageMediaId = input.ogImageMediaId;
  return out;
}

function cleanSections(sections: PageSection[] | undefined): PageSection[] {
  if (!sections) return [];
  return sections.map((section) => ({
    ...section,
    html: section.html ? sanitizeRichText(section.html) : section.html,
  }));
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Error && (error as { code?: unknown }).code === 11000;
}

// --- Public DTOs (never leak createdBy/audit/drafts/admin notes) ---

export interface PublicPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  sections: PageSection[];
  featuredImageMediaId: string | null;
  seo: SeoMeta;
  publishedAt: Date | null;
  updatedAt: Date;
}

export interface PublicBlogPost extends PublicPage {
  content: string;
  author: string | null;
  category: string | null;
  tags: string[];
  readingMinutes: number;
}

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
}

export interface PublicOffer {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageMediaId: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  hasCoupon: boolean;
  seo: SeoMeta;
  publishedAt: Date | null;
}

export interface PublicPolicyDoc {
  key: PolicyKey;
  title: string;
  body: string;
  version: number;
  updatedAt: Date;
}

function toPublicPage(doc: PageDocument): PublicPage {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    sections: (doc.sections ?? []) as PageSection[],
    featuredImageMediaId: doc.featuredImageMediaId ? doc.featuredImageMediaId.toString() : null,
    seo: toSeoMeta(doc.seo),
    publishedAt: doc.publishedAt,
    updatedAt: doc.updatedAt,
  };
}

function toPublicBlogPost(doc: BlogPostDocument): PublicBlogPost {
  return {
    ...toPublicPage(doc as unknown as PageDocument),
    content: doc.content,
    author: doc.author,
    category: doc.category,
    tags: doc.tags ?? [],
    readingMinutes: doc.readingMinutes,
  };
}

// --- Pages ---

export async function createPage(input: {
  title: string;
  slug: string;
  excerpt?: string | null;
  sections?: PageSection[];
  featuredImageMediaId?: string | null;
  seo?: Partial<SeoMeta>;
  createdBy?: string | null;
}): Promise<PublicPage> {
  const slug = input.slug.toLowerCase();
  assertSlug(slug);
  try {
    const doc = await PageModel.create({
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      sections: cleanSections(input.sections),
      featuredImageMediaId: input.featuredImageMediaId ?? null,
      seo: cleanSeo(input.seo),
      createdBy: input.createdBy ?? null,
    });
    return toPublicPage(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("This slug is already in use", 409, "SLUG_EXISTS");
    }
    throw error;
  }
}

export async function listPages(filter: CmsListFilter) {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.q) textSearch(query, filter.q, ["title", "slug"]);
  return paginateModel(PageModel, query, filter, { updatedAt: -1 }, (doc) => ({
    ...toPublicPage(doc),
    status: doc.status,
    version: doc.version,
  }));
}

export async function updatePage(
  id: string,
  version: number,
  patch: Partial<{
    title: string;
    slug: string;
    excerpt: string | null;
    sections: PageSection[];
    featuredImageMediaId: string | null;
    seo: Partial<SeoMeta>;
  }>,
): Promise<PublicPage> {
  const update: Record<string, unknown> = { $inc: { version: 1 } };
  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.slug !== undefined) {
    const slug = patch.slug.toLowerCase();
    assertSlug(slug);
    set.slug = slug;
  }
  if (patch.excerpt !== undefined) set.excerpt = patch.excerpt;
  if (patch.sections !== undefined) set.sections = cleanSections(patch.sections);
  if (patch.featuredImageMediaId !== undefined) set.featuredImageMediaId = patch.featuredImageMediaId;
  if (patch.seo !== undefined) set.seo = cleanSeo(patch.seo);
  (update as { $set: unknown }).$set = set;
  try {
    const doc = await PageModel.findOneAndUpdate({ _id: id, version }, update, {
      returnDocument: "after",
    }).exec();
    if (!doc) {
      const exists = await PageModel.findById(id).exec();
      if (!exists) throw new AppError("Page not found", 404, "CONTENT_NOT_FOUND");
      throw new AppError("This page changed meanwhile — reload and retry", 409, "CONTENT_VERSION_CONFLICT");
    }
    return toPublicPage(doc);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isDuplicateKeyError(error)) {
      throw new AppError("This slug is already in use", 409, "SLUG_EXISTS");
    }
    throw error;
  }
}

async function transitionStatus<TDoc extends { status: ContentStatus }>(
  model: mongoose.Model<TDoc & mongoose.Document>,
  id: string,
  version: number,
  to: ContentStatus,
): Promise<void> {
  const doc = (await model.findById(id).exec()) as (TDoc & mongoose.Document & { version: number }) | null;
  if (!doc) throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
  if (doc.version !== version) {
    throw new AppError("This item changed meanwhile — reload and retry", 409, "CONTENT_VERSION_CONFLICT");
  }
  if (!canTransition(doc.status, to)) {
    throw new AppError(transitionError(doc.status, to), 400, "INVALID_TRANSITION");
  }
  doc.status = to;
  doc.version += 1;
  (doc as unknown as { publishedAt: Date | null }).publishedAt = to === "PUBLISHED" ? new Date() : (doc as unknown as { publishedAt: Date | null }).publishedAt;
  await doc.save();
}

export async function setPageStatus(id: string, version: number, to: ContentStatus): Promise<void> {
  await transitionStatus(PageModel, id, version, to);
}

export async function issuePagePreview(id: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const doc = await PageModel.findByIdAndUpdate(
    id,
    { $set: { previewToken: token, previewExpiresAt: expiresAt } },
    { returnDocument: "after" },
  ).exec();
  if (!doc) throw new AppError("Page not found", 404, "CONTENT_NOT_FOUND");
  return { token, expiresAt };
}

export async function getPublishedPage(slug: string): Promise<PublicPage> {
  const doc = await PageModel.findOne({ slug: slug.toLowerCase(), status: "PUBLISHED" }).exec();
  if (!doc) throw new AppError("Page not found", 404, "CONTENT_NOT_PUBLISHED");
  return toPublicPage(doc);
}

/** Admin detail (full sections + status/version for the editor). */
export async function getPageAdmin(id: string) {
  const doc = await PageModel.findById(id).exec();
  if (!doc) throw new AppError("Page not found", 404, "CONTENT_NOT_FOUND");
  return { ...toPublicPage(doc), status: doc.status, version: doc.version };
}

// --- Blog posts ---

function readingMinutesFor(content: string): number {
  const words = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function createBlogPost(input: {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string;
  featuredImageMediaId?: string | null;
  author?: string | null;
  category?: string | null;
  tags?: string[];
  seo?: Partial<SeoMeta>;
  createdBy?: string | null;
}): Promise<PublicBlogPost> {
  const slug = input.slug.toLowerCase();
  assertSlug(slug);
  const content = sanitizeRichText(input.content ?? "");
  try {
    const doc = await BlogPostModel.create({
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      content,
      featuredImageMediaId: input.featuredImageMediaId ?? null,
      author: input.author ?? null,
      category: input.category ?? null,
      tags: input.tags ?? [],
      readingMinutes: readingMinutesFor(content),
      seo: cleanSeo(input.seo),
      createdBy: input.createdBy ?? null,
    });
    return toPublicBlogPost(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("This slug is already in use", 409, "SLUG_EXISTS");
    }
    throw error;
  }
}

export async function listBlogPosts(filter: CmsListFilter & { category?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.category) query.category = filter.category;
  if (filter.q) textSearch(query, filter.q, ["title", "slug"]);
  return paginateModel(BlogPostModel, query, filter, { createdAt: -1 }, (doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    featuredImageMediaId: doc.featuredImageMediaId ? doc.featuredImageMediaId.toString() : null,
    author: doc.author,
    category: doc.category,
    tags: doc.tags ?? [],
    readingMinutes: doc.readingMinutes,
    publishedAt: doc.publishedAt,
    status: doc.status,
    version: doc.version,
  }));
}

export async function updateBlogPost(
  id: string,
  version: number,
  patch: Partial<{
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    featuredImageMediaId: string | null;
    author: string | null;
    category: string | null;
    tags: string[];
    seo: Partial<SeoMeta>;
  }>,
): Promise<PublicBlogPost> {
  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.slug !== undefined) {
    const slug = patch.slug.toLowerCase();
    assertSlug(slug);
    set.slug = slug;
  }
  if (patch.excerpt !== undefined) set.excerpt = patch.excerpt;
  if (patch.content !== undefined) {
    set.content = sanitizeRichText(patch.content);
    set.readingMinutes = readingMinutesFor(patch.content);
  }
  if (patch.featuredImageMediaId !== undefined) set.featuredImageMediaId = patch.featuredImageMediaId;
  if (patch.author !== undefined) set.author = patch.author;
  if (patch.category !== undefined) set.category = patch.category;
  if (patch.tags !== undefined) set.tags = patch.tags;
  if (patch.seo !== undefined) set.seo = cleanSeo(patch.seo);
  try {
    const doc = await BlogPostModel.findOneAndUpdate(
      { _id: id, version },
      { $set: set, $inc: { version: 1 } },
      { returnDocument: "after" },
    ).exec();
    if (!doc) {
      const exists = await BlogPostModel.findById(id).exec();
      if (!exists) throw new AppError("Blog post not found", 404, "CONTENT_NOT_FOUND");
      throw new AppError("This post changed meanwhile — reload and retry", 409, "CONTENT_VERSION_CONFLICT");
    }
    return toPublicBlogPost(doc);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isDuplicateKeyError(error)) {
      throw new AppError("This slug is already in use", 409, "SLUG_EXISTS");
    }
    throw error;
  }
}

export async function setBlogPostStatus(id: string, version: number, to: ContentStatus): Promise<void> {
  await transitionStatus(BlogPostModel, id, version, to);
}

export async function getPublishedBlogPost(slug: string): Promise<PublicBlogPost> {
  const doc = await BlogPostModel.findOne({ slug: slug.toLowerCase(), status: "PUBLISHED" }).exec();
  if (!doc) throw new AppError("Blog post not found", 404, "CONTENT_NOT_PUBLISHED");
  return toPublicBlogPost(doc);
}

/** Admin detail (full content + status/version for the editor). */
export async function getBlogPostAdmin(id: string) {
  const doc = await BlogPostModel.findById(id).exec();
  if (!doc) throw new AppError("Blog post not found", 404, "CONTENT_NOT_FOUND");
  return { ...toPublicBlogPost(doc), status: doc.status, version: doc.version };
}

// --- FAQs ---

export async function createFaq(input: {
  question: string;
  answer?: string;
  category?: string | null;
  sortOrder?: number;
}): Promise<PublicFaq> {
  const doc = await FaqModel.create({
    question: input.question,
    answer: sanitizeRichText(input.answer ?? ""),
    category: input.category ?? null,
    sortOrder: input.sortOrder ?? 0,
  });
  return toPublicFaq(doc);
}

export function toPublicFaq(doc: FaqDocument): PublicFaq {
  return {
    id: doc._id.toString(),
    question: doc.question,
    answer: doc.answer,
    category: doc.category,
    sortOrder: doc.sortOrder,
  };
}

export async function listFaqs(filter: CmsListFilter & { category?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.category) query.category = filter.category;
  if (filter.q) textSearch(query, filter.q, ["question"]);
  return paginateModel(
    FaqModel,
    query,
    filter,
    { sortOrder: 1, createdAt: 1 },
    (doc) => ({ ...toPublicFaq(doc), status: doc.status, version: doc.version }),
  );
}

export async function listPublishedFaqs(): Promise<PublicFaq[]> {
  const docs = await FaqModel.find({ status: "PUBLISHED" })
    .sort({ category: 1, sortOrder: 1, createdAt: 1 })
    .exec();
  return docs.map(toPublicFaq);
}

export async function updateFaq(
  id: string,
  version: number,
  patch: Partial<{ question: string; answer: string; category: string | null; sortOrder: number }>,
): Promise<PublicFaq> {
  const set: Record<string, unknown> = {};
  if (patch.question !== undefined) set.question = patch.question;
  if (patch.answer !== undefined) set.answer = sanitizeRichText(patch.answer);
  if (patch.category !== undefined) set.category = patch.category;
  if (patch.sortOrder !== undefined) set.sortOrder = patch.sortOrder;
  const doc = await FaqModel.findOneAndUpdate(
    { _id: id, version },
    { $set: set, $inc: { version: 1 } },
    { returnDocument: "after" },
  ).exec();
  if (!doc) {
    const exists = await FaqModel.findById(id).exec();
    if (!exists) throw new AppError("FAQ not found", 404, "CONTENT_NOT_FOUND");
    throw new AppError("This FAQ changed meanwhile — reload and retry", 409, "CONTENT_VERSION_CONFLICT");
  }
  return toPublicFaq(doc);
}

export async function setFaqStatus(id: string, version: number, to: ContentStatus): Promise<void> {
  await transitionStatus(FaqModel, id, version, to);
}

export async function deleteFaq(id: string): Promise<void> {
  const doc = await FaqModel.findById(id).exec();
  if (!doc) throw new AppError("FAQ not found", 404, "CONTENT_NOT_FOUND");
  if (doc.status === "PUBLISHED") {
    throw new AppError("Archive before deleting published content", 400, "ARCHIVE_FIRST");
  }
  await FaqModel.deleteOne({ _id: id }).exec();
}

// --- Offers ---

async function assertCouponUsable(couponId: string | null | undefined): Promise<void> {
  if (!couponId) return;
  const coupon = await findCouponById(couponId);
  if (!coupon) throw new AppError("Linked coupon does not exist", 422, "INVALID_COUPON");
}

function toPublicOffer(doc: OfferDocument): PublicOffer {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    imageMediaId: doc.imageMediaId ? doc.imageMediaId.toString() : null,
    validFrom: doc.validFrom,
    validUntil: doc.validUntil,
    ctaLabel: doc.ctaLabel,
    ctaUrl: doc.ctaUrl,
    hasCoupon: doc.couponId !== null,
    seo: toSeoMeta(doc.seo),
    publishedAt: doc.publishedAt,
  };
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function createOffer(input: {
  title: string;
  slug: string;
  description?: string;
  imageMediaId?: string | null;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  couponId?: string | null;
  seo?: Partial<SeoMeta>;
  createdBy?: string | null;
}): Promise<PublicOffer> {
  const slug = input.slug.toLowerCase();
  assertSlug(slug);
  await assertCouponUsable(input.couponId);
  try {
    const doc = await OfferModel.create({
      title: input.title,
      slug,
      description: sanitizeRichText(input.description ?? ""),
      imageMediaId: input.imageMediaId ?? null,
      validFrom: toDateOrNull(input.validFrom),
      validUntil: toDateOrNull(input.validUntil),
      ctaLabel: input.ctaLabel ?? null,
      ctaUrl: input.ctaUrl ?? null,
      couponId: input.couponId ?? null,
      seo: cleanSeo(input.seo),
      createdBy: input.createdBy ?? null,
    });
    return toPublicOffer(doc);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isDuplicateKeyError(error)) {
      throw new AppError("This slug is already in use", 409, "SLUG_EXISTS");
    }
    throw error;
  }
}

export async function listOffers(filter: CmsListFilter) {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.q) textSearch(query, filter.q, ["title", "slug"]);
  return paginateModel(OfferModel, query, filter, { updatedAt: -1 }, (doc) => ({
    ...toPublicOffer(doc),
    status: doc.status,
    version: doc.version,
  }));
}

export async function updateOffer(
  id: string,
  version: number,
  patch: Partial<{
    title: string;
    slug: string;
    description: string;
    imageMediaId: string | null;
    validFrom: Date | string | null;
    validUntil: Date | string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    couponId: string | null;
    seo: Partial<SeoMeta>;
  }>,
): Promise<PublicOffer> {
  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.slug !== undefined) {
    const slug = patch.slug.toLowerCase();
    assertSlug(slug);
    set.slug = slug;
  }
  if (patch.description !== undefined) set.description = sanitizeRichText(patch.description);
  if (patch.imageMediaId !== undefined) set.imageMediaId = patch.imageMediaId;
  if (patch.validFrom !== undefined) set.validFrom = toDateOrNull(patch.validFrom);
  if (patch.validUntil !== undefined) set.validUntil = toDateOrNull(patch.validUntil);
  if (patch.ctaLabel !== undefined) set.ctaLabel = patch.ctaLabel;
  if (patch.ctaUrl !== undefined) set.ctaUrl = patch.ctaUrl;
  if (patch.couponId !== undefined) {
    await assertCouponUsable(patch.couponId);
    set.couponId = patch.couponId;
  }
  if (patch.seo !== undefined) set.seo = cleanSeo(patch.seo);
  try {
    const doc = await OfferModel.findOneAndUpdate(
      { _id: id, version },
      { $set: set, $inc: { version: 1 } },
      { returnDocument: "after" },
    ).exec();
    if (!doc) {
      const exists = await OfferModel.findById(id).exec();
      if (!exists) throw new AppError("Offer not found", 404, "CONTENT_NOT_FOUND");
      throw new AppError("This offer changed meanwhile — reload and retry", 409, "CONTENT_VERSION_CONFLICT");
    }
    return toPublicOffer(doc);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isDuplicateKeyError(error)) {
      throw new AppError("This slug is already in use", 409, "SLUG_EXISTS");
    }
    throw error;
  }
}

export async function setOfferStatus(id: string, version: number, to: ContentStatus): Promise<void> {
  await transitionStatus(OfferModel, id, version, to);
}

/** Admin detail (full fields + status/version for the editor). */
export async function getOfferAdmin(id: string) {
  const doc = await OfferModel.findById(id).exec();
  if (!doc) throw new AppError("Offer not found", 404, "CONTENT_NOT_FOUND");
  return { ...toPublicOffer(doc), couponId: doc.couponId ? doc.couponId.toString() : null, status: doc.status, version: doc.version };
}

export async function listPublishedOffers(now: Date = new Date()): Promise<PublicOffer[]> {  const docs = await OfferModel.find({
    status: "PUBLISHED",
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .exec();
  return docs.map(toPublicOffer);
}

// --- Policy documents ---

function toPublicPolicyDoc(doc: PolicyDocument): PublicPolicyDoc {
  return {
    key: doc.key,
    title: doc.title,
    body: doc.body,
    version: doc.version,
    updatedAt: doc.updatedAt,
  };
}

export async function upsertPolicyDoc(input: {
  key: PolicyKey;
  title: string;
  body?: string;
}): Promise<PublicPolicyDoc> {
  const doc = await PolicyDocModel.findOneAndUpdate(
    { key: input.key },
    {
      $set: {
        title: input.title,
        body: sanitizeRichText(input.body ?? ""),
      },
      $setOnInsert: { status: "DRAFT", version: 1 },
    },
    { returnDocument: "after", upsert: true },
  ).exec();
  if (!doc) throw new AppError("Policy document not found", 404, "CONTENT_NOT_FOUND");
  return toPublicPolicyDoc(doc);
}

export async function listPolicyDocs(): Promise<PublicPolicyDoc[]> {
  const docs = await PolicyDocModel.find({}).sort({ key: 1 }).exec();
  return docs.map((doc) => ({ ...toPublicPolicyDoc(doc), status: doc.status } as PublicPolicyDoc & { status: ContentStatus }));
}

export async function setPolicyDocStatus(key: PolicyKey, to: ContentStatus): Promise<void> {
  const doc = await PolicyDocModel.findOne({ key }).exec();
  if (!doc) throw new AppError("Policy document not found", 404, "CONTENT_NOT_FOUND");
  if (!canTransition(doc.status, to)) {
    throw new AppError(transitionError(doc.status, to), 400, "INVALID_TRANSITION");
  }
  doc.status = to;
  doc.version += 1;
  if (to === "PUBLISHED") doc.publishedAt = new Date();
  await doc.save();
}

export async function getPublishedPolicyDoc(key: PolicyKey): Promise<PublicPolicyDoc> {
  const doc = await PolicyDocModel.findOne({ key, status: "PUBLISHED" }).exec();
  if (!doc) throw new AppError("Policy document not found", 404, "CONTENT_NOT_PUBLISHED");
  return toPublicPolicyDoc(doc);
}

// --- Cross-type preview ---

export async function resolvePreviewToken(token: string): Promise<{ kind: string; data: PublicPage | PublicBlogPost }> {
  const now = new Date();
  const page = await PageModel.findOne({
    previewToken: token,
    previewExpiresAt: { $gt: now },
  }).exec();
  if (page) return { kind: "page", data: toPublicPage(page) };
  const post = await BlogPostModel.findOne({
    previewToken: token,
    previewExpiresAt: { $gt: now },
  }).exec();
  if (post) return { kind: "blog", data: toPublicBlogPost(post) };
  throw new AppError("Preview link is invalid or expired", 404, "PREVIEW_INVALID");
}

export async function issueBlogPreview(id: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const doc = await BlogPostModel.findByIdAndUpdate(
    id,
    { $set: { previewToken: token, previewExpiresAt: expiresAt } },
    { returnDocument: "after" },
  ).exec();
  if (!doc) throw new AppError("Blog post not found", 404, "CONTENT_NOT_FOUND");
  return { token, expiresAt };
}
