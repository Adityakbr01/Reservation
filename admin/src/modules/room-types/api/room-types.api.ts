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

function normalizeRoomType(raw: any): RoomType {
  return {
    id: String(raw?.id ?? ""),
    propertyId: String(raw?.propertyId ?? raw?.property_id ?? ""),
    name: String(raw?.name ?? ""),
    slug: String(raw?.slug ?? ""),
    shortDescription: raw?.shortDescription ?? raw?.short_description ?? null,
    description: raw?.description ?? null,
    maxAdults: Number(raw?.maxAdults ?? raw?.max_adults ?? 2),
    maxChildren: Number(raw?.maxChildren ?? raw?.max_children ?? 0),
    maxOccupancy: Number(raw?.maxOccupancy ?? raw?.max_occupancy ?? 2),
    beds: Array.isArray(raw?.beds) ? raw.beds : [],
    amenities: Array.isArray(raw?.amenities) ? raw.amenities : [],
    status: raw?.status ?? "ACTIVE",
    images: Array.isArray(raw?.images) ? raw.images : [],
    media: Array.isArray(raw?.media) ? raw.media : [],
    propertyDetailsHtml: raw?.propertyDetailsHtml ?? raw?.property_details_html ?? null,
    layoutHtml: raw?.layoutHtml ?? raw?.layout_html ?? null,
    floorplanMediaIds: Array.isArray(raw?.floorplanMediaIds ?? raw?.floorplan_media_ids)
      ? raw.floorplanMediaIds ?? raw.floorplan_media_ids
      : [],
    locationText: raw?.locationText ?? raw?.location_text ?? null,
    surroundingsHtml: raw?.surroundingsHtml ?? raw?.surroundings_html ?? null,
    mapLat: raw?.mapLat ?? raw?.map_lat ?? null,
    mapLng: raw?.mapLng ?? raw?.map_lng ?? null,
    mapEmbedUrl: raw?.mapEmbedUrl ?? raw?.map_embed_url ?? null,
    welcomeHamperIncluded: Boolean(raw?.welcomeHamperIncluded ?? raw?.welcome_hamper_included),
    welcomeHamperDescription: raw?.welcomeHamperDescription ?? raw?.welcome_hamper_description ?? null,
    welcomeHamperImageMediaId: raw?.welcomeHamperImageMediaId ?? raw?.welcome_hamper_image_media_id ?? null,
    welcomeHamperHtml: raw?.welcomeHamperHtml ?? raw?.welcome_hamper_html ?? null,
    amenityIds: Array.isArray(raw?.amenityIds ?? raw?.amenity_ids)
      ? raw.amenityIds ?? raw.amenity_ids
      : [],
    bedrooms: raw?.bedrooms ?? null,
    bathrooms: raw?.bathrooms ?? null,
    maxDogs: raw?.maxDogs ?? raw?.max_dogs ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at ?? "",
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? "",
  };
}

export async function listRoomTypes(filters: RoomTypeFilters): Promise<Paged<RoomType>> {
  const { data } = await apiClient.get<ApiEnvelope<RoomType[]>>(BASE, { params: filters });
  const list = Array.isArray(data?.data) ? data.data.map(normalizeRoomType) : [];
  return {
    items: list,
    total: data.meta?.total ?? list.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getRoomType(id: string): Promise<RoomType> {
  const response = await apiClient.get<ApiEnvelope<RoomType>>(`${BASE}/${id}`);
  return normalizeRoomType(unwrapResponse(response));
}

export async function createRoomType(payload: CreateRoomTypePayload): Promise<RoomType> {
  const response = await apiClient.post<ApiEnvelope<RoomType>>(BASE, payload);
  return normalizeRoomType(unwrapResponse(response));
}

export async function updateRoomType(id: string, payload: UpdateRoomTypePayload): Promise<RoomType> {
  const response = await apiClient.patch<ApiEnvelope<RoomType>>(`${BASE}/${id}`, payload);
  return normalizeRoomType(unwrapResponse(response));
}
