import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

export interface CmsSection {
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

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  sections: CmsSection[];
  featuredImageMediaId: string | null;
  publishedAt: string | null;
}

export interface CmsBlogPost extends CmsPage {
  content: string;
  author: string | null;
  category: string | null;
  tags: string[];
  readingMinutes: number;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
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
  publishedAt: string | null;
}

export interface CmsPolicy {
  key: string;
  title: string;
  body: string;
  version: number;
  updatedAt: string;
}

export interface SiteSettings {
  propertyName: string | null;
  currency: string | null;
  timezone: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  address: string | null;
  phone: string | null;
  supportEmail: string | null;
  whyBookWithUs?: Array<{ title: string; text?: string | null }>;
}

const BASE = "/public/cms";

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const response = await publicApiClient.get<ApiEnvelope<SiteSettings>>(`${BASE}/site-settings`);
  return unwrapResponse(response);
}

export async function fetchCmsPage(slug: string): Promise<CmsPage> {
  const response = await publicApiClient.get<ApiEnvelope<CmsPage>>(`${BASE}/pages/${slug}`);
  return unwrapResponse(response);
}

export async function fetchBlogPosts(): Promise<CmsBlogPost[]> {
  const response = await publicApiClient.get<ApiEnvelope<CmsBlogPost[]>>(`${BASE}/blogs`);
  return unwrapResponse(response);
}

export async function fetchBlogPost(slug: string): Promise<CmsBlogPost> {
  const response = await publicApiClient.get<ApiEnvelope<CmsBlogPost>>(`${BASE}/blogs/${slug}`);
  return unwrapResponse(response);
}

export async function fetchFaqs(): Promise<CmsFaq[]> {
  const response = await publicApiClient.get<ApiEnvelope<CmsFaq[]>>(`${BASE}/faqs`);
  return unwrapResponse(response);
}

export async function fetchOffers(): Promise<CmsOffer[]> {
  const response = await publicApiClient.get<ApiEnvelope<CmsOffer[]>>(`${BASE}/offers`);
  return unwrapResponse(response);
}

export async function fetchPolicyDoc(key: string): Promise<CmsPolicy> {
  const response = await publicApiClient.get<ApiEnvelope<CmsPolicy>>(`${BASE}/policies/${key}`);
  return unwrapResponse(response);
}
