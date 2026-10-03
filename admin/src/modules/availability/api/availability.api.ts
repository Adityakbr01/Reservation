import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  AvailabilityBlock,
  BlockFilters,
  CreateBlockPayload,
} from "../types/availability.types";

const BASE = "/admin/availability";

export async function listBlocks(filters: BlockFilters): Promise<Paged<AvailabilityBlock>> {
  const { data } = await apiClient.get<ApiEnvelope<AvailabilityBlock[]>>(BASE, { params: filters });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function createBlock(payload: CreateBlockPayload): Promise<AvailabilityBlock> {
  const response = await apiClient.post<ApiEnvelope<AvailabilityBlock>>(`${BASE}/blocks`, payload);
  return unwrapResponse(response);
}

export async function deleteBlock(id: string): Promise<{ deleted: boolean }> {
  const response = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(`${BASE}/blocks/${id}`);
  return unwrapResponse(response);
}
