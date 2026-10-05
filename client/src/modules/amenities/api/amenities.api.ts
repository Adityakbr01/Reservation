import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

export interface Amenity {
  id: string;
  name: string;
  slug: string;
  group: string;
  description: string | null;
  imageMediaId: string | null;
  iconUrl: string | null;
}

export async function fetchAmenities(): Promise<Amenity[]> {
  const r = await publicApiClient.get<ApiEnvelope<Amenity[]>>("/public/amenities");
  return unwrapResponse(r);
}

export async function fetchSettings(): Promise<{ whyBookWithUs?: Array<{ title: string; text?: string | null }> }> {
  const r = await publicApiClient.get<ApiEnvelope<{ whyBookWithUs?: Array<{ title: string; text?: string | null }> }>>("/public/cms/site-settings");
  return unwrapResponse(r);
}
