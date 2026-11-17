import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type {
  CottageCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "../types/category.types";

const BASE = "/admin/cottage-categories";

export async function listCategories(): Promise<CottageCategory[]> {
  const response = await apiClient.get<ApiEnvelope<CottageCategory[]>>(BASE);
  const data = unwrapResponse(response);
  return Array.isArray(data) ? data : [];
}

export async function createCategory(payload: CreateCategoryPayload): Promise<CottageCategory> {
  const response = await apiClient.post<ApiEnvelope<CottageCategory>>(BASE, payload);
  return unwrapResponse(response);
}

export async function updateCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<CottageCategory> {
  const response = await apiClient.patch<ApiEnvelope<CottageCategory>>(`${BASE}/${id}`, payload);
  return unwrapResponse(response);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
