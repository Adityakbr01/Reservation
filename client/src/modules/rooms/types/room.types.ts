export interface RoomTypeBed {
  type: string;
  quantity: number;
}

export interface RoomTypeImageRef {
  mediaId: string;
  altText: string | null;
  sortOrder: number;
}

/** Full room-type detail as returned by GET /api/public/room-types/:slug. */
export interface RoomTypeDetail {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds: RoomTypeBed[];
  amenities: string[];
  images: RoomTypeImageRef[];
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
}
