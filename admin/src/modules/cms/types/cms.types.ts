export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface SeoMeta {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageMediaId: string | null;
}

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
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  category?: string | null;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  sections: PageSection[];
  featuredImageMediaId: string | null;
  seo: SeoMeta;
  status: ContentStatus;
  version: number;
  publishedAt: string | null;
}

export interface CmsBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author: string | null;
  category: string | null;
  tags: string[];
  readingMinutes: number;
  featuredImageMediaId: string | null;
  status: ContentStatus;
  version: number;
  publishedAt: string | null;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  status: ContentStatus;
  version: number;
}

export interface CmsOffer {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageMediaId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  hasCoupon: boolean;
  status: ContentStatus;
  version: number;
}

export interface CmsPolicyDoc {
  key: string;
  title: string;
  body: string;
  version: number;
  status: ContentStatus;
  updatedAt: string;
}

export interface CmsFilters {
  page: number;
  limit: number;
  q?: string;
  status?: ContentStatus;
}
