export type CottageStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface CottageBed {
  type: string;
  quantity: number;
}

export interface CottageImage {
  mediaId: string;
  url?: string | null;
  altText: string | null;
  kind?: "image" | "video";
}

export interface Cottage {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds: CottageBed[];
  amenities: string[];
  status: CottageStatus;
  images: CottageImage[];
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
  amenityIds?: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  maxDogs?: number | null;
  basePrice?: number | null;
  base_price?: number | null;
  roomId?: string | null;
  room_id?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CottageFilters {
  page: number;
  limit: number;
  q?: string;
  status?: CottageStatus;
}

export interface CreateCottagePayload {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds?: CottageBed[];
  amenities?: string[];
  images?: Array<{ mediaId: string; altText: string | null; sortOrder: number }>;
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
  amenityIds?: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  maxDogs?: number | null;
  basePrice?: number | null;
  base_price?: number | null;
  status?: CottageStatus;
}

export type UpdateCottagePayload = Partial<CreateCottagePayload>;

// Backward compatibility aliases
export type RoomType = Cottage;
export type RoomTypeStatus = CottageStatus;
export type RoomTypeBed = CottageBed;
export type RoomTypeImage = CottageImage;
export type RoomTypeFilters = CottageFilters;
export type CreateRoomTypePayload = CreateCottagePayload;
export type UpdateRoomTypePayload = UpdateCottagePayload;

