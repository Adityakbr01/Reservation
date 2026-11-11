import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  CmsBlogPost,
  CmsFaq,
  CmsFilters,
  CmsOffer,
  CmsPage,
  CmsPolicyDoc,
  ContentStatus,
} from "../types/cms.types";

const BASE = "/admin/cms";

async function paged<T>(path: string, params: CmsFilters): Promise<Paged<T>> {
  const { data } = await apiClient.get<ApiEnvelope<T[]>>(path, { params });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

// Pages
export const listPages = (f: CmsFilters) => paged<CmsPage>(`${BASE}/pages`, f);
export async function getPage(id: string): Promise<CmsPage> {
  const r = await apiClient.get<ApiEnvelope<CmsPage>>(`${BASE}/pages/${id}`);
  return unwrapResponse(r);
}
export async function createPage(payload: object): Promise<CmsPage> {
  const r = await apiClient.post<ApiEnvelope<CmsPage>>(`${BASE}/pages`, payload);
  return unwrapResponse(r);
}
export async function updatePage(id: string, payload: object): Promise<CmsPage> {
  const r = await apiClient.patch<ApiEnvelope<CmsPage>>(`${BASE}/pages/${id}`, payload);
  return unwrapResponse(r);
}
export async function setPageStatus(id: string, version: number, to: ContentStatus): Promise<void> {
  await apiClient.post(`${BASE}/pages/${id}/status`, { version, to });
}

// Blogs
export const listBlogs = (f: CmsFilters) => paged<CmsBlogPost>(`${BASE}/blogs`, f);
export async function getBlog(id: string): Promise<CmsBlogPost> {
  const r = await apiClient.get<ApiEnvelope<CmsBlogPost>>(`${BASE}/blogs/${id}`);
  return unwrapResponse(r);
}
export async function createBlog(payload: object): Promise<CmsBlogPost> {
  const r = await apiClient.post<ApiEnvelope<CmsBlogPost>>(`${BASE}/blogs`, payload);
  return unwrapResponse(r);
}
export async function updateBlog(id: string, payload: object): Promise<CmsBlogPost> {
  const r = await apiClient.patch<ApiEnvelope<CmsBlogPost>>(`${BASE}/blogs/${id}`, payload);
  return unwrapResponse(r);
}
export async function setBlogStatus(id: string, version: number, to: ContentStatus): Promise<void> {
  await apiClient.post(`${BASE}/blogs/${id}/status`, { version, to });
}

// FAQs
export const listFaqs = (f: CmsFilters) => paged<CmsFaq>(`${BASE}/faqs`, f);
export async function createFaq(payload: object): Promise<CmsFaq> {
  const r = await apiClient.post<ApiEnvelope<CmsFaq>>(`${BASE}/faqs`, payload);
  return unwrapResponse(r);
}
export async function updateFaq(id: string, payload: object): Promise<CmsFaq> {
  const r = await apiClient.patch<ApiEnvelope<CmsFaq>>(`${BASE}/faqs/${id}`, payload);
  return unwrapResponse(r);
}
export async function setFaqStatus(id: string, version: number, to: ContentStatus): Promise<void> {
  await apiClient.post(`${BASE}/faqs/${id}/status`, { version, to });
}
export async function deleteFaq(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/faqs/${id}`);
}

// Offers
export const listOffers = (f: CmsFilters) => paged<CmsOffer>(`${BASE}/offers`, f);
export async function getOffer(id: string): Promise<CmsOffer & { couponId: string | null }> {
  const r = await apiClient.get<ApiEnvelope<CmsOffer & { couponId: string | null }>>(
    `${BASE}/offers/${id}`,
  );
  return unwrapResponse(r);
}
export async function createOffer(payload: object): Promise<CmsOffer> {
  const r = await apiClient.post<ApiEnvelope<CmsOffer>>(`${BASE}/offers`, payload);
  return unwrapResponse(r);
}
export async function updateOffer(id: string, payload: object): Promise<CmsOffer> {
  const r = await apiClient.patch<ApiEnvelope<CmsOffer>>(`${BASE}/offers/${id}`, payload);
  return unwrapResponse(r);
}
export async function setOfferStatus(
  id: string,
  version: number,
  to: ContentStatus,
): Promise<void> {
  await apiClient.post(`${BASE}/offers/${id}/status`, { version, to });
}

// Policies
export async function listPolicies(): Promise<CmsPolicyDoc[]> {
  const r = await apiClient.get<ApiEnvelope<CmsPolicyDoc[]>>(`${BASE}/policies`);
  return unwrapResponse(r);
}
export async function upsertPolicy(payload: object): Promise<void> {
  await apiClient.put(`${BASE}/policies`, payload);
}
export async function setPolicyStatus(key: string, to: ContentStatus): Promise<void> {
  await apiClient.post(`${BASE}/policies/${key}/status`, { to });
}
export async function deletePolicy(key: string): Promise<void> {
  await apiClient.delete(`${BASE}/policies/${encodeURIComponent(key)}`);
}
