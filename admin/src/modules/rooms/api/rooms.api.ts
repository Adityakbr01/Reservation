import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type { CreateRoomPayload, Room, RoomFilters, UpdateRoomPayload } from "../types/room.types";

const BASE = "/admin/rooms";

function normalizeRoom(raw: any): Room {
  return {
    id: String(raw?.id ?? ""),
    propertyId: String(raw?.propertyId ?? raw?.property_id ?? ""),
    roomTypeId: String(raw?.roomTypeId ?? raw?.room_type_id ?? ""),
    name: String(raw?.name ?? ""),
    roomNumber: String(raw?.roomNumber ?? raw?.room_number ?? ""),
    floor: raw?.floor ?? null,
    status: raw?.status ?? "ACTIVE",
    condition: raw?.condition ?? null,
    notes: raw?.notes ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at ?? "",
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? "",
  };
}

export async function listRooms(filters: RoomFilters): Promise<Paged<Room>> {
  const { data } = await apiClient.get<ApiEnvelope<Room[]>>(BASE, { params: filters });
  const list = Array.isArray(data?.data) ? data.data.map(normalizeRoom) : [];
  return {
    items: list,
    total: data.meta?.total ?? list.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getRoom(id: string): Promise<Room> {
  const response = await apiClient.get<ApiEnvelope<Room>>(`${BASE}/${id}`);
  return normalizeRoom(unwrapResponse(response));
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const response = await apiClient.post<ApiEnvelope<Room>>(BASE, payload);
  return normalizeRoom(unwrapResponse(response));
}

export async function updateRoom(id: string, payload: UpdateRoomPayload): Promise<Room> {
  const response = await apiClient.patch<ApiEnvelope<Room>>(`${BASE}/${id}`, payload);
  return normalizeRoom(unwrapResponse(response));
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
