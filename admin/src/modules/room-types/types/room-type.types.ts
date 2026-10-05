export type RoomTypeStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface RoomTypeBed {
  type: string;
  quantity: number;
}

export interface RoomTypeImage {
  mediaId: string;
  url?: string | null;
  altText: string | null;
  kind?: "image" | "video";
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
  status: RoomTypeStatus;
  images: RoomTypeImage[];
  media?: Array<{ mediaId: string; kind: "image" | "video"; altText: string | null; sortOrder: number }>;
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
  amenityIds?: string[];
  bedrooms?: number | null;
  maxDogs?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomTypeFilters {
  page: number;
  limit: number;
  q?: string;
  status?: RoomTypeStatus;
}

export interface CreateRoomTypePayload {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds?: RoomTypeBed[];
  amenities?: string[];
  images?: Array<{ mediaId: string; altText: string | null; sortOrder: number }>;
  media?: Array<{ mediaId: string; kind: "image" | "video"; altText: string | null; sortOrder: number }>;
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
  amenityIds?: string[];
  bedrooms?: number | null;
  maxDogs?: number | null;
  status?: RoomTypeStatus;
}

export type UpdateRoomTypePayload = Partial<CreateRoomTypePayload>;
