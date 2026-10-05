import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { RoomTypeDetail } from "../types/room.types";

export async function getRoomTypeBySlug(slug: string): Promise<RoomTypeDetail> {
  const response = await publicApiClient.get<ApiEnvelope<RoomTypeDetail>>(
    `/public/room-types/${encodeURIComponent(slug)}`,
  );
  return unwrapResponse(response);
}

export interface RoomOffer {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageMediaId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  badgeLabel: string;
  couponCode: string;
}

/** Published offers applicable to a room type (offer badge + dialog). */
export async function fetchRoomOffers(roomTypeId: string): Promise<RoomOffer[]> {
  const response = await publicApiClient.get<ApiEnvelope<RoomOffer[]>>(
    `/public/room-types/${encodeURIComponent(roomTypeId)}/offers`,
  );
  return unwrapResponse(response);
}
