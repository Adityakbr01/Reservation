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

import type { WhyBookWithUsItem } from "@/modules/cms/api/cms.api";

export async function fetchSettings(): Promise<{ whyBookWithUs?: WhyBookWithUsItem[]; whyBookWithUsHeading?: string | null }> {
  const r = await publicApiClient.get<ApiEnvelope<{ whyBookWithUs?: WhyBookWithUsItem[]; whyBookWithUsHeading?: string | null }>>("/public/cms/site-settings");
  return unwrapResponse(r);
}
