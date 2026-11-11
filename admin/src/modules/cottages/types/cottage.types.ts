export type CottageStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface CottageBed {
  type: string;
  quantity: number;
}

export interface CottageSectionSettings {
  showSubtitle?: boolean;
  showMiddleDescription?: boolean;
  showOverviewBullets?: boolean;
  showAboutImage?: boolean;
  tabs?: {
    overview?: boolean;
    availability?: boolean;
    propertyDetails?: boolean;
    layout?: boolean;
    location?: boolean;
    reviews?: boolean;
  };
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
  middleDescription?: string | null;
  middle_description?: string | null;
  aboutHeading?: string | null;
  about_heading?: string | null;
  aboutText?: string | null;
  about_text?: string | null;
  aboutImageMediaId?: string | null;
  about_image_media_id?: string | null;
  aboutImageUrl?: string | null;
  overviewBullets?: string[];
  overview_bullets?: string[];
  sectionSettings?: CottageSectionSettings;
  section_settings?: CottageSectionSettings;
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
  short_description?: string | null;
  description?: string | null;
  middleDescription?: string | null;
  middle_description?: string | null;
  aboutHeading?: string | null;
  about_heading?: string | null;
  aboutText?: string | null;
  about_text?: string | null;
  aboutImageMediaId?: string | null;
  about_image_media_id?: string | null;
  overviewBullets?: string[];
  overview_bullets?: string[];
  sectionSettings?: CottageSectionSettings;
  section_settings?: CottageSectionSettings;
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

