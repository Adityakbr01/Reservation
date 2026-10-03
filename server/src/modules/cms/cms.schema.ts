import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { CONTENT_STATUSES, POLICY_KEYS, ROBOTS_ALLOWLIST, SECTION_TYPES } from "./cms.types";

const seoSchema = z
  .object({
    title: z.string().max(160).nullable().optional(),
    description: z.string().max(300).nullable().optional(),
    canonicalUrl: z.string().url().nullable().optional(),
    robots: z.enum(ROBOTS_ALLOWLIST).nullable().optional(),
    ogTitle: z.string().max(160).nullable().optional(),
    ogDescription: z.string().max(300).nullable().optional(),
    ogImageMediaId: objectIdSchema.nullable().optional(),
  })
  .optional();

const sectionSchema = z.object({
  kind: z.enum(SECTION_TYPES),
  heading: z.string().max(160).nullable().optional(),
  subheading: z.string().max(300).nullable().optional(),
  html: z.string().max(20000).nullable().optional(),
  imageMediaId: objectIdSchema.nullable().optional(),
  mediaIds: z.array(objectIdSchema).max(20).optional(),
  roomTypeIds: z.array(objectIdSchema).max(20).optional(),
  features: z
    .array(z.object({ title: z.string().max(120), text: z.string().max(500) }))
    .max(12)
    .optional(),
  entries: z
    .array(z.object({ quote: z.string().max(500), name: z.string().max(120) }))
    .max(12)
    .optional(),
  offerId: objectIdSchema.nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  ctaLabel: z.string().max(80).nullable().optional(),
  ctaUrl: z.string().max(500).nullable().optional(),
});

const dateOrNull = z.string().datetime().nullable().optional();

export const createPageSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(120),
  excerpt: z.string().max(300).nullable().optional(),
  sections: z.array(sectionSchema).max(30).optional(),
  featuredImageMediaId: objectIdSchema.nullable().optional(),
  seo: seoSchema,
});

export const updatePageSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().trim().min(2).max(160).optional(),
  slug: z.string().trim().min(2).max(120).optional(),
  excerpt: z.string().max(300).nullable().optional(),
  sections: z.array(sectionSchema).max(30).optional(),
  featuredImageMediaId: objectIdSchema.nullable().optional(),
  seo: seoSchema,
});

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(120),
  excerpt: z.string().max(300).nullable().optional(),
  content: z.string().max(50000).optional(),
  featuredImageMediaId: objectIdSchema.nullable().optional(),
  author: z.string().max(120).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  seo: seoSchema,
});

export const updateBlogPostSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().trim().min(2).max(160).optional(),
  slug: z.string().trim().min(2).max(120).optional(),
  excerpt: z.string().max(300).nullable().optional(),
  content: z.string().max(50000).optional(),
  featuredImageMediaId: objectIdSchema.nullable().optional(),
  author: z.string().max(120).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  seo: seoSchema,
});

export const createFaqSchema = z.object({
  question: z.string().trim().min(4).max(300),
  answer: z.string().max(10000).optional(),
  category: z.string().max(80).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateFaqSchema = z.object({
  version: z.number().int().min(1),
  question: z.string().trim().min(4).max(300).optional(),
  answer: z.string().max(10000).optional(),
  category: z.string().max(80).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const createOfferSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(120),
  description: z.string().max(10000).optional(),
  imageMediaId: objectIdSchema.nullable().optional(),
  validFrom: dateOrNull,
  validUntil: dateOrNull,
  ctaLabel: z.string().max(80).nullable().optional(),
  ctaUrl: z.string().max(500).nullable().optional(),
  couponId: objectIdSchema.nullable().optional(),
  seo: seoSchema,
});

export const updateOfferSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().trim().min(2).max(160).optional(),
  slug: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(10000).optional(),
  imageMediaId: objectIdSchema.nullable().optional(),
  validFrom: dateOrNull,
  validUntil: dateOrNull,
  ctaLabel: z.string().max(80).nullable().optional(),
  ctaUrl: z.string().max(500).nullable().optional(),
  couponId: objectIdSchema.nullable().optional(),
  seo: seoSchema,
});

export const upsertPolicyDocSchema = z.object({
  key: z.enum(POLICY_KEYS),
  title: z.string().trim().min(2).max(160),
  body: z.string().max(50000).optional(),
});

export const statusTransitionSchema = z.object({
  version: z.number().int().min(1),
  to: z.enum(CONTENT_STATUSES),
});

export const cmsListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  category: z.string().trim().max(80).optional(),
});

export const cmsIdParamsSchema = z.object({ id: objectIdSchema });
export const policyKeyParamsSchema = z.object({ key: z.enum(POLICY_KEYS) });
export const previewTokenParamsSchema = z.object({ token: z.string().min(10).max(100) });

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type UpsertPolicyDocInput = z.infer<typeof upsertPolicyDocSchema>;
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
export type CmsListQuery = z.infer<typeof cmsListQuerySchema>;
