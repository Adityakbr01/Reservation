import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { CottageDetail } from "../types/cottage.types";

export async function getCottageBySlug(slug: string): Promise<CottageDetail> {
  const response = await publicApiClient.get<ApiEnvelope<CottageDetail>>(
    `/public/cottages/${encodeURIComponent(slug)}`,
  );
  return unwrapResponse(response);
}

export interface CottageOffer {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageMediaId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  badgeLabel: string;
  couponCode: string;
}

/** Published offers applicable to a cottage. */
export async function fetchCottageOffers(cottageId: string): Promise<CottageOffer[]> {
  const response = await publicApiClient.get<ApiEnvelope<CottageOffer[]>>(
    `/public/cottages/${encodeURIComponent(cottageId)}/offers`,
  );
  return unwrapResponse(response);
}

