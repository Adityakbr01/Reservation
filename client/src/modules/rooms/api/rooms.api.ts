import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { RoomTypeDetail } from "../types/room.types";

export async function getRoomTypeBySlug(slug: string): Promise<RoomTypeDetail> {
  const response = await publicApiClient.get<ApiEnvelope<RoomTypeDetail>>(
    `/public/room-types/${encodeURIComponent(slug)}`,
  );
  return unwrapResponse(response);
}
