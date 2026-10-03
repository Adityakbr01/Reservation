import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type {
  AvailabilitySearchParams,
  AvailabilitySearchResponse,
} from "../types/availability.types";

/**
 * Informational availability lookup. The backend rechecks everything at
 * booking/hold time — these results never reserve inventory.
 */
export async function searchAvailability(
  params: AvailabilitySearchParams,
): Promise<AvailabilitySearchResponse> {
  const response = await publicApiClient.post<ApiEnvelope<AvailabilitySearchResponse>>(
    "/public/availability/search",
    params,
  );
  return unwrapResponse(response);
}
