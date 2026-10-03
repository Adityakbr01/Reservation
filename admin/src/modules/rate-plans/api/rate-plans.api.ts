import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  CreateRatePlanPayload,
  RatePlan,
  RatePlanFilters,
  UpdateRatePlanPayload,
} from "../types/rate-plan.types";

const BASE = "/admin/rate-plans";

export async function listRatePlans(filters: RatePlanFilters): Promise<Paged<RatePlan>> {
  const { data } = await apiClient.get<ApiEnvelope<RatePlan[]>>(BASE, { params: filters });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getRatePlan(id: string): Promise<RatePlan> {
  const response = await apiClient.get<ApiEnvelope<RatePlan>>(`${BASE}/${id}`);
  return unwrapResponse(response);
}

export async function createRatePlan(payload: CreateRatePlanPayload): Promise<RatePlan> {
  const response = await apiClient.post<ApiEnvelope<RatePlan>>(BASE, payload);
  return unwrapResponse(response);
}

export async function updateRatePlan(id: string, payload: UpdateRatePlanPayload): Promise<RatePlan> {
  const response = await apiClient.patch<ApiEnvelope<RatePlan>>(`${BASE}/${id}`, payload);
  return unwrapResponse(response);
}
