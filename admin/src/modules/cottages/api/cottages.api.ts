import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  Cottage,
  CottageFilters,
  CreateCottagePayload,
  UpdateCottagePayload,
} from "../types/cottage.types";

const BASE = "/admin/cottages";

function normalizeCottage(raw: any): Cottage {
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
    dogPolicyEnabled: Boolean(raw?.dogPolicyEnabled ?? raw?.dog_policy_enabled ?? (raw?.maxDogs > 0 || raw?.max_dogs > 0)),
    dog_policy_enabled: Boolean(raw?.dogPolicyEnabled ?? raw?.dog_policy_enabled ?? (raw?.maxDogs > 0 || raw?.max_dogs > 0)),
    dogPolicyTitle: raw?.dogPolicyTitle ?? raw?.dog_policy_title ?? null,
    dog_policy_title: raw?.dogPolicyTitle ?? raw?.dog_policy_title ?? null,
    dogPolicySubtitle: raw?.dogPolicySubtitle ?? raw?.dog_policy_subtitle ?? null,
    dog_policy_subtitle: raw?.dogPolicySubtitle ?? raw?.dog_policy_subtitle ?? null,
    dogFee: raw?.dogFee !== undefined ? raw?.dogFee : (raw?.dog_fee !== undefined ? raw?.dog_fee : 70),
    dog_fee: raw?.dogFee !== undefined ? raw?.dogFee : (raw?.dog_fee !== undefined ? raw?.dog_fee : 70),
    dogFees: raw?.dogFees ?? raw?.dog_fees ?? null,
    dog_fees: raw?.dogFees ?? raw?.dog_fees ?? null,
    dogPolicyImageMediaId: raw?.dogPolicyImageMediaId ?? raw?.dog_policy_image_media_id ?? null,
    dog_policy_image_media_id: raw?.dogPolicyImageMediaId ?? raw?.dog_policy_image_media_id ?? null,
    dogPolicyImageUrl: raw?.dogPolicyImageUrl ?? raw?.dog_policy_image_url ?? null,
    dog_policy_image_url: raw?.dogPolicyImageUrl ?? raw?.dog_policy_image_url ?? null,
    extras: Array.isArray(raw?.extras) ? raw.extras : [],
    basePrice: raw?.basePrice ?? raw?.base_price ?? null,
    base_price: raw?.basePrice ?? raw?.base_price ?? null,
    roomId: raw?.roomId ?? raw?.room_id ?? null,
    room_id: raw?.roomId ?? raw?.room_id ?? null,
    middleDescription: raw?.middleDescription ?? raw?.middle_description ?? null,
    middle_description: raw?.middleDescription ?? raw?.middle_description ?? null,
    aboutHeading: raw?.aboutHeading ?? raw?.about_heading ?? null,
    about_heading: raw?.aboutHeading ?? raw?.about_heading ?? null,
    aboutText: raw?.aboutText ?? raw?.about_text ?? null,
    about_text: raw?.aboutText ?? raw?.about_text ?? null,
    aboutImageMediaId: raw?.aboutImageMediaId ?? raw?.about_image_media_id ?? null,
    about_image_media_id: raw?.aboutImageMediaId ?? raw?.about_image_media_id ?? null,
    aboutImageUrl: raw?.aboutImageUrl ?? raw?.about_image_url ?? null,
    overviewBullets: Array.isArray(raw?.overviewBullets ?? raw?.overview_bullets)
      ? raw.overviewBullets ?? raw.overview_bullets
      : [],
    overview_bullets: Array.isArray(raw?.overviewBullets ?? raw?.overview_bullets)
      ? raw.overviewBullets ?? raw.overview_bullets
      : [],
    sectionSettings: raw?.sectionSettings ?? raw?.section_settings ?? null,
    section_settings: raw?.sectionSettings ?? raw?.section_settings ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at ?? "",
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? "",
  };
}

export async function listCottages(filters: CottageFilters): Promise<Paged<Cottage>> {
  const { data } = await apiClient.get<ApiEnvelope<Cottage[]>>(BASE, { params: filters });
  const list = Array.isArray(data?.data) ? data.data.map(normalizeCottage) : [];
  return {
    items: list,
    total: data?.meta?.total ?? list.length,
    page: data?.meta?.page ?? 1,
    totalPages: data?.meta?.totalPages ?? 1,
  };
}

export async function getCottage(id: string): Promise<Cottage> {
  const response = await apiClient.get<ApiEnvelope<Cottage>>(`${BASE}/${id}`);
  return normalizeCottage(unwrapResponse(response));
}

export async function createCottage(payload: CreateCottagePayload): Promise<Cottage> {
  const response = await apiClient.post<ApiEnvelope<Cottage>>(BASE, payload);
  return normalizeCottage(unwrapResponse(response));
}

export async function updateCottage(id: string, payload: UpdateCottagePayload): Promise<Cottage> {
  const response = await apiClient.patch<ApiEnvelope<Cottage>>(`${BASE}/${id}`, payload);
  return normalizeCottage(unwrapResponse(response));
}

export async function deleteCottage(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

// Aliases
export const listRoomTypes = listCottages;
export const getRoomType = getCottage;
export const createRoomType = createCottage;
export const updateRoomType = updateCottage;

