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

export interface CalendarDay {
  date: string;
  total: number;
  available: number;
  booked: number;
  blocked: number;
  price?: number | null;
  currency?: string;
  minNights?: number | null;
}

export interface AvailabilityCalendarResponse {
  from: string;
  to: string;
  types: Array<{ roomTypeId: string; name: string; days: CalendarDay[] }>;
}

export async function fetchAvailabilityCalendar(
  roomTypeId: string,
  from: string,
  to: string,
): Promise<AvailabilityCalendarResponse> {
  const response = await publicApiClient.get<ApiEnvelope<AvailabilityCalendarResponse>>(
    "/public/availability/calendar",
    { params: { roomTypeId, from, to } },
  );
  return unwrapResponse(response);
}
