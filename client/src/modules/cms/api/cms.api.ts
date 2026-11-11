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

export interface NavLinkItem {
  id?: string;
  label: string;
  url: string;
  openInNewTab?: boolean;
  isEnabled?: boolean;
}

export interface HeaderNavigation {
  links: NavLinkItem[];
  enquireButton: {
    label: string;
    url: string;
    openInNewTab?: boolean;
    isEnabled?: boolean;
  };
}

export interface FooterColumnLinks {
  heading: string;
  links: NavLinkItem[];
  isEnabled?: boolean;
}

export interface FooterNavigation {
  col1?: {
    showLogo?: boolean;
    tagline?: string;
    isEnabled?: boolean;
  };
  col2?: FooterColumnLinks;
  col3?: FooterColumnLinks;
  col4?: {
    heading?: string;
    isEnabled?: boolean;
    showPhone?: boolean;
    showEmail?: boolean;
    showAddress?: boolean;
  };
  bottomBar?: {
    copyrightText?: string;
    locationText?: string;
    showBackToTop?: boolean;
  };
}

export interface AcknowledgementItem {
  id: string;
  text: string;
  linkLabel?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  isRequired?: boolean;
  isEnabled?: boolean;
}

export interface CheckoutSection {
  id: string;
  title: string;
  introText?: string;
  isEnabled?: boolean;
  items: AcknowledgementItem[];
}

export interface AcknowledgementItem {
  id: string;
  text: string;
  linkLabel?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  isRequired?: boolean;
  isEnabled?: boolean;
}

export interface CheckoutSection {
  id: string;
  title: string;
  introText?: string;
  isEnabled?: boolean;
  items: AcknowledgementItem[];
}

export interface BookingAcknowledgement {
  sections?: CheckoutSection[];
  showPoliciesSection?: boolean;
  showAcknowledgementSection?: boolean;
  isEnabled?: boolean;
  title?: string;
  introText?: string;
  items?: AcknowledgementItem[];
  privacyCheckboxText?: string;
  privacyLinkLabel?: string;
  privacyLinkUrl?: string;
  termsCheckboxText?: string;
  termsLinkLabel?: string;
  termsLinkUrl?: string;
  buttonText?: string;
  busyButtonText?: string;
  incompleteContactHint?: string;
  incompleteTermsHint?: string;
}

export interface WhyBookWithUsItem {
  title: string;
  text?: string | null;
  icon?: string | null;
  imageMediaId?: string | null;
  imageUrl?: string | null;
  badgeColor?: string | null;
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
  whyBookWithUsHeading?: string | null;
  whyBookWithUs?: WhyBookWithUsItem[];
  headerNavigation?: HeaderNavigation;
  footerNavigation?: FooterNavigation;
  bookingAcknowledgement?: BookingAcknowledgement;
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

export async function fetchPolicies(): Promise<CmsPolicy[]> {
  const response = await publicApiClient.get<ApiEnvelope<CmsPolicy[]>>(`${BASE}/policies`);
  return unwrapResponse(response);
}
