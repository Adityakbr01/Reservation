import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  Coupon,
  CouponFilters,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "../types/coupon.types";

const BASE = "/admin/coupons";

export async function listCoupons(filters: CouponFilters): Promise<Paged<Coupon>> {
  const { data } = await apiClient.get<ApiEnvelope<Coupon[]>>(BASE, { params: filters });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getCoupon(id: string): Promise<Coupon> {
  const response = await apiClient.get<ApiEnvelope<Coupon>>(`${BASE}/${id}`);
  return unwrapResponse(response);
}

export async function createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
  const response = await apiClient.post<ApiEnvelope<Coupon>>(BASE, payload);
  return unwrapResponse(response);
}

export async function updateCoupon(id: string, payload: UpdateCouponPayload): Promise<Coupon> {
  const response = await apiClient.patch<ApiEnvelope<Coupon>>(`${BASE}/${id}`, payload);
  return unwrapResponse(response);
}
