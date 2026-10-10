export interface RoomTypeBed {
  type: string;
  quantity: number;
}

export interface RoomTypeImageRef {
  mediaId: string;
  altText: string | null;
  sortOrder: number;
}

export interface NearbyAttraction {
  name: string;
  description: string | null;
  imageMediaId: string | null;
  url: string | null;
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
  media?: Array<{ mediaId: string; kind: "image" | "video"; altText: string | null; sortOrder: number }>;
  propertyDetailsHtml?: string | null;
  layoutHtml?: string | null;
  floorplanMediaIds?: string[];
  locationText?: string | null;
  surroundingsHtml?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  mapEmbedUrl?: string | null;
  welcomeHamperIncluded?: boolean;
  welcomeHamperDescription?: string | null;
  welcomeHamperImageMediaId?: string | null;
  welcomeHamperHtml?: string | null;
  nearbyAttractions?: NearbyAttraction[] | null;
  amenityIds?: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  maxDogs?: number | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
}
