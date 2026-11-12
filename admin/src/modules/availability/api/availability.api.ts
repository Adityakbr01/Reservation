import { apiClient, unwrapResponse } from "@/lib/api-client";
import { toMysqlDatetime } from "@/lib/date";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  AvailabilityBlock,
  BlockFilters,
  CreateBlockPayload,
} from "../types/availability.types";

const BASE = "/admin/availability";

function normalizeBlock(raw: Record<string, unknown>): AvailabilityBlock {
  return {
    id: String(raw.id ?? ""),
    propertyId: String(raw.propertyId ?? raw.property_id ?? ""),
    roomId: (raw.roomId ?? raw.room_id) as string | undefined,
    roomTypeId: (raw.roomTypeId ?? raw.room_type_id) as string | undefined,
    cottageId: (raw.cottageId ?? raw.cottage_id) as string | undefined,
    startDate: String(raw.startDate ?? raw.start_date ?? ""),
    endDate: String(raw.endDate ?? raw.end_date ?? ""),
    reason: (raw.reason ?? null) as string | null,
    createdBy: String(raw.createdBy ?? raw.created_by ?? ""),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

export async function listBlocks(filters: BlockFilters): Promise<Paged<AvailabilityBlock>> {
  const { data } = await apiClient.get<ApiEnvelope<Record<string, unknown>[]>>(BASE, {
    params: filters,
  });
  return {
    items: data.data.map(normalizeBlock),
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function createBlock(
  payload: CreateBlockPayload,
): Promise<AvailabilityBlock | AvailabilityBlock[]> {
  const response = await apiClient.post<ApiEnvelope<Record<string, unknown> | Record<string, unknown>[]>>(
    `${BASE}/blocks`,
    {
      roomId: payload.roomId,
      roomTypeId: payload.roomTypeId,
      cottageId: payload.cottageId,
      start_date: toMysqlDatetime(payload.startDate),
      end_date: toMysqlDatetime(payload.endDate),
      reason: payload.reason ?? null,
    },
  );
  const raw = unwrapResponse(response);
  if (Array.isArray(raw)) return raw.map(normalizeBlock);
  return normalizeBlock(raw);
}

export async function deleteBlock(id: string): Promise<{ deleted: boolean }> {
  const response = await apiClient.delete<ApiEnvelope<{ deleted: boolean }>>(`${BASE}/blocks/${id}`);
  return unwrapResponse(response);
}
