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

export type RoomTypeMediaKind = "image" | "video";

export interface RoomTypeMedia {
  mediaId: string;
  kind: RoomTypeMediaKind;
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
  /** Ordered gallery incl. video. Preferred over legacy images when non-empty. */
  media: RoomTypeMedia[];
  // Detail-page content (all nullable for backward compat).
  propertyDetailsHtml: string | null;
  layoutHtml: string | null;
  floorplanMediaIds: string[];
  locationText: string | null;
  surroundingsHtml: string | null;
  mapLat: number | null;
  mapLng: number | null;
  mapEmbedUrl: string | null;
  welcomeHamperIncluded: boolean;
  welcomeHamperDescription: string | null;
  welcomeHamperImageMediaId: string | null;
  welcomeHamperHtml: string | null;
  amenityIds: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  maxDogs: number | null;
  status: RoomTypeStatus;
  seo: RoomTypeSeo | null;
  createdAt: Date;
  updatedAt: Date;
}
