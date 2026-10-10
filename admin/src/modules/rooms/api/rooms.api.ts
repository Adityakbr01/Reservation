import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type { CreateRoomPayload, Room, RoomFilters, UpdateRoomPayload } from "../types/room.types";

const BASE = "/admin/rooms";

export async function listRooms(filters: RoomFilters): Promise<Paged<Room>> {
  const { data } = await apiClient.get<ApiEnvelope<Room[]>>(BASE, { params: filters });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getRoom(id: string): Promise<Room> {
  const response = await apiClient.get<ApiEnvelope<Room>>(`${BASE}/${id}`);
  return unwrapResponse(response);
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const response = await apiClient.post<ApiEnvelope<Room>>(BASE, payload);
  return unwrapResponse(response);
}

export async function updateRoom(id: string, payload: UpdateRoomPayload): Promise<Room> {
  const response = await apiClient.patch<ApiEnvelope<Room>>(`${BASE}/${id}`, payload);
  return unwrapResponse(response);
}

export interface RoomOccupancy {
  roomId: string;
  status: "FREE" | "OCCUPIED" | "BLOCKED" | "HELD";
  bookingNumber: string | null;
}

/** Live per-room status for a date range (blocks, stays, payment holds). */
export async function getRoomsOccupancy(checkIn: string, checkOut: string): Promise<RoomOccupancy[]> {
  const response = await apiClient.get<ApiEnvelope<RoomOccupancy[]>>(`${BASE}/occupancy`, {
    params: { checkIn, checkOut },
  });
  return unwrapResponse(response);
}
