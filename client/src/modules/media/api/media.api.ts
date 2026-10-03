import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

export interface ResolvedMedia {
  id: string;
  url: string;
  alt: string | null;
}

/** Batch-resolves media ids to URLs. Unknown ids are skipped server-side. */
export async function resolveMediaUrls(ids: string[]): Promise<ResolvedMedia[]> {
  if (ids.length === 0) return [];
  const response = await publicApiClient.post<ApiEnvelope<ResolvedMedia[]>>(
    "/public/media/resolve",
    { ids: ids.slice(0, 50) },
  );
  return unwrapResponse(response);
}
