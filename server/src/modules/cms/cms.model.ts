import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { CONTENT_STATUSES, POLICY_KEYS } from "./cms.types";
import type { ContentStatus, PolicyKey, SeoMeta } from "./cms.types";
const seoSchema = new mongoose.Schema(
  {
    title: { type: String, default: null },
    description: { type: String, default: null },
    canonicalUrl: { type: String, default: null },
    robots: { type: String, default: null },
    ogTitle: { type: String, default: null },
    ogDescription: { type: String, default: null },
    ogImageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },
  },
  { _id: false },
);

export interface CmsDocumentBase extends mongoose.Document {
  status: ContentStatus;
  version: number;
  publishedAt: Date | null;
  createdBy: mongoose.Types.ObjectId | null;
  previewToken: string | null;
  previewExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Pages ---

export interface PageSection {
  kind: string;
  heading?: string | null;
  subheading?: string | null;
  html?: string | null;
  imageMediaId?: string | null;
  mediaIds?: string[];
  roomTypeIds?: string[];
  features?: Array<{ title: string; text: string }>;
  entries?: Array<{ quote: string; name: string }>;
  offerId?: string | null;
  category?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export interface PageDocument extends CmsDocumentBase {
  title: string;
  slug: string;
  excerpt: string | null;
  sections: PageSection[];
  featuredImageMediaId: mongoose.Types.ObjectId | null;
  seo: SeoMeta;
}

const pageSchema = new mongoose.Schema<PageDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, default: null, maxlength: 300 },
    sections: { type: [Object], default: [] },
    featuredImageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },
    seo: { type: seoSchema, default: () => ({}) },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: "DRAFT",
      required: true,
    },
    version: { type: Number, default: 1, min: 1, required: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    previewToken: { type: String, default: null, index: true, sparse: true },
    previewExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

pageSchema.index({ status: 1, slug: 1 });

// --- Blog posts ---

export interface BlogPostDocument extends CmsDocumentBase {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImageMediaId: mongoose.Types.ObjectId | null;
  author: string | null;
  category: string | null;
  tags: string[];
  readingMinutes: number;
  seo: SeoMeta;
}

const blogPostSchema = new mongoose.Schema<BlogPostDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, default: null, maxlength: 300 },
    content: { type: String, default: "" },
    featuredImageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },
    author: { type: String, default: null, maxlength: 120 },
    category: { type: String, default: null, maxlength: 80 },
    tags: { type: [String], default: [] },
    readingMinutes: { type: Number, default: 1, min: 1 },
    seo: { type: seoSchema, default: () => ({}) },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: "DRAFT",
      required: true,
    },
    version: { type: Number, default: 1, min: 1, required: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    previewToken: { type: String, default: null, index: true, sparse: true },
    previewExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

blogPostSchema.index({ status: 1, slug: 1 });
blogPostSchema.index({ status: 1, category: 1, createdAt: -1 });

// --- FAQs ---

export interface FaqDocument extends CmsDocumentBase {
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
}

const faqSchema = new mongoose.Schema<FaqDocument>(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, default: "" },
    category: { type: String, default: null, maxlength: 80 },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: "DRAFT",
      required: true,
    },
    version: { type: Number, default: 1, min: 1, required: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    previewToken: { type: String, default: null, index: true, sparse: true },
    previewExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

faqSchema.index({ status: 1, category: 1, sortOrder: 1 });

// --- Offers ---

export interface OfferDocument extends CmsDocumentBase {
  title: string;
  slug: string;
  description: string;
  imageMediaId: mongoose.Types.ObjectId | null;
  validFrom: Date | null;
  validUntil: Date | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  couponId: mongoose.Types.ObjectId | null;
  seo: SeoMeta;
}

const offerSchema = new mongoose.Schema<OfferDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    imageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    ctaLabel: { type: String, default: null, maxlength: 80 },
    ctaUrl: { type: String, default: null, maxlength: 500 },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    seo: { type: seoSchema, default: () => ({}) },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: "DRAFT",
      required: true,
    },
    version: { type: Number, default: 1, min: 1, required: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    previewToken: { type: String, default: null, index: true, sparse: true },
    previewExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

offerSchema.index({ status: 1, slug: 1 });

// --- Policy documents ---

export interface PolicyDocument extends CmsDocumentBase {
  key: PolicyKey;
  title: string;
  body: string;
}

const policyDocSchema = new mongoose.Schema<PolicyDocument>(
  {
    key: { type: String, enum: POLICY_KEYS, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, default: "" },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: "DRAFT",
      required: true,
    },
    version: { type: Number, default: 1, min: 1, required: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    previewToken: { type: String, default: null, index: true, sparse: true },
    previewExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Guarded for --hot reloads.
export const PageModel = mongoose.models.CmsPage ?? mongoose.model<PageDocument>("CmsPage", pageSchema);
export const BlogPostModel =
  mongoose.models.CmsBlogPost ?? mongoose.model<BlogPostDocument>("CmsBlogPost", blogPostSchema);
export const FaqModel = mongoose.models.CmsFaq ?? mongoose.model<FaqDocument>("CmsFaq", faqSchema);
export const OfferModel =
  mongoose.models.CmsOffer ?? mongoose.model<OfferDocument>("CmsOffer", offerSchema);
export const PolicyDocModel =
  mongoose.models.CmsPolicyDoc ?? mongoose.model<PolicyDocument>("CmsPolicyDoc", policyDocSchema);

export function toSeoMeta(seo: SeoMeta): SeoMeta {
  return {
    title: seo?.title ?? null,
    description: seo?.description ?? null,
    canonicalUrl: seo?.canonicalUrl ?? null,
    robots: seo?.robots ?? null,
    ogTitle: seo?.ogTitle ?? null,
    ogDescription: seo?.ogDescription ?? null,
    ogImageMediaId: seo?.ogImageMediaId ? seo.ogImageMediaId.toString() : null,
  };
}

export interface CmsListFilter {
  page: number;
  limit: number;
  status?: ContentStatus;
  q?: string;
}

export function textSearch(query: QueryFilter<mongoose.Document>, q: string, fields: string[]) {
  query.$or = fields.map((field) => ({ [field]: { $regex: q, $options: "i" } }));
}

export async function paginateModel<TDoc extends mongoose.Document, TOut>(
  model: mongoose.Model<TDoc>,
  query: QueryFilter<TDoc>,
  filter: CmsListFilter,
  sort: Record<string, 1 | -1>,
  map: (doc: TDoc) => TOut,
): Promise<Paginated<TOut>> {
  const [total, docs] = await Promise.all([
    model.countDocuments(query).exec(),
    model
      .find(query)
      .sort(sort)
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map(map),
    filter.page,
    filter.limit,
    total,
  );
}
