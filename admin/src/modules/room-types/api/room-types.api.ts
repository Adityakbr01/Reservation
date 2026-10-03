import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  CreateRoomTypePayload,
  RoomType,
  RoomTypeFilters,
  UpdateRoomTypePayload,
} from "../types/room-type.types";

const BASE = "/admin/room-types";

export async function listRoomTypes(filters: RoomTypeFilters): Promise<Paged<RoomType>> {
  const { data } = await apiClient.get<ApiEnvelope<RoomType[]>>(BASE, { params: filters });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getRoomType(id: string): Promise<RoomType> {
  const response = await apiClient.get<ApiEnvelope<RoomType>>(`${BASE}/${id}`);
  return unwrapResponse(response);
}

export async function createRoomType(payload: CreateRoomTypePayload): Promise<RoomType> {
  const response = await apiClient.post<ApiEnvelope<RoomType>>(BASE, payload);
  return unwrapResponse(response);
}

export async function updateRoomType(id: string, payload: UpdateRoomTypePayload): Promise<RoomType> {
  const response = await apiClient.patch<ApiEnvelope<RoomType>>(`${BASE}/${id}`, payload);
  return unwrapResponse(response);
}
