import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { HomeSummary } from "../types/home.types";

// Provisional contract — no backend endpoint exists yet (server/ is empty).
// Align with GET /api/admin/* dashboard data (docs 07) when backend lands.
export async function fetchHomeSummary(): Promise<HomeSummary> {
  const response = await apiClient.get<ApiEnvelope<HomeSummary>>("/home/summary");
  return unwrapResponse(response);
}
