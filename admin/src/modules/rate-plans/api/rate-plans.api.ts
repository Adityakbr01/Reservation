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

function normalizeRatePlan(raw: any): RatePlan {
  const pricing = raw?.pricing ?? { type: "PER_NIGHT", amount: 0, currency: "GBP" };
  const amount =
    typeof pricing.amount === "number"
      ? pricing.amount
      : typeof pricing.basePrice === "number"
        ? pricing.basePrice * 100
        : 0;

  return {
    id: String(raw?.id ?? ""),
    propertyId: String(raw?.propertyId ?? raw?.property_id ?? ""),
    roomTypeId: String(raw?.roomTypeId ?? raw?.room_type_id ?? ""),
    name: String(raw?.name ?? ""),
    slug: String(raw?.slug ?? ""),
    description: raw?.description ?? null,
    pricing: {
      type: pricing.type ?? "PER_NIGHT",
      amount,
      currency: pricing.currency ?? "GBP",
    },
    restrictions: raw?.restrictions ?? {},
    cancellationPolicyId: raw?.cancellationPolicyId ?? raw?.cancellation_policy_id ?? null,
    status: raw?.status ?? "ACTIVE",
    createdAt: raw?.createdAt ?? raw?.created_at ?? "",
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? "",
  };
}

export async function listRatePlans(filters: RatePlanFilters): Promise<Paged<RatePlan>> {
  const { data } = await apiClient.get<ApiEnvelope<RatePlan[]>>(BASE, { params: filters });
  const list = Array.isArray(data?.data) ? data.data.map(normalizeRatePlan) : [];
  return {
    items: list,
    total: data.meta?.total ?? list.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getRatePlan(id: string): Promise<RatePlan> {
  const response = await apiClient.get<ApiEnvelope<RatePlan>>(`${BASE}/${id}`);
  return normalizeRatePlan(unwrapResponse(response));
}

export async function createRatePlan(payload: CreateRatePlanPayload): Promise<RatePlan> {
  const response = await apiClient.post<ApiEnvelope<RatePlan>>(BASE, payload);
  return normalizeRatePlan(unwrapResponse(response));
}

export async function updateRatePlan(id: string, payload: UpdateRatePlanPayload): Promise<RatePlan> {
  const response = await apiClient.patch<ApiEnvelope<RatePlan>>(`${BASE}/${id}`, payload);
  return normalizeRatePlan(unwrapResponse(response));
}
