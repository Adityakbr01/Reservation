export const ROOM_TYPE_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;

export type RoomTypeStatus = (typeof ROOM_TYPE_STATUSES)[number];

export interface RoomTypeBed {
  type: string;
  quantity: number;
}

export interface RoomTypeImage {
  mediaId: string;
  altText: string | null;
  sortOrder: number;
}

export interface RoomTypeSeo {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  noIndex: boolean;
}

export interface RoomType {
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
  images: RoomTypeImage[];
  status: RoomTypeStatus;
  seo: RoomTypeSeo | null;
  createdAt: Date;
  updatedAt: Date;
}
