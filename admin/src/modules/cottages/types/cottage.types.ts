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
  home_section?: string;
  homeSection?: string;
  tabs?: {
    overview?: boolean;
    availability?: boolean;
    propertyDetails?: boolean;
    layout?: boolean;
    location?: boolean;
    reviews?: boolean;
  };
  /** Per-cottage cottage-card element toggles (home page / search results cards). */
  cottageCard?: CottageCardSettings;
}

export interface CottageCardSettings {
  isEnabled?: boolean;
  showCoverImage?: boolean;
  showPhotoCount?: boolean;
  showTitle?: boolean;
  showCapacity?: boolean;
  showPetFriendly?: boolean;
  showDescription?: boolean;
  showPrice?: boolean;
  showExampleRate?: boolean;
  showDogPolicy?: boolean;
  showExploreLink?: boolean;
  showCheckAvailability?: boolean;
  /** Admin-customizable text values (no fallbacks — only show when admin provides them). */
  cardTitle?: string;
  cardDescription?: string;
  cardPriceLabel?: string;
  cardExampleRateLabel?: string;
  cardExploreText?: string;
  cardBookText?: string;
}

export interface CottageImage {
  mediaId: string;
  url?: string | null;
  altText: string | null;
  kind?: "image" | "video";
}

export interface CottageExtra {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  original_price?: number | null;
  pricingType: "PER_PERSON" | "PER_STAY";
  imageMediaId?: string | null;
  imageUrl?: string | null;
  /** When true, render a qty stepper with min/max instead of a plain checkbox. Default true. */
  showCounter?: boolean;
  /** Minimum quantity when counter is on. Default 1. */
  min?: number;
  /** Maximum quantity when counter is on. null = no explicit cap. Default null. */
  max?: number | null;
  /** When true, display an ⓘ info button on the booking page & dialog. */
  showInfo?: boolean;
  /** Custom title inside the info popover (defaults to extra title). */
  infoTitle?: string | null;
  /** Detailed content shown when guest hovers or clicks the ⓘ info button. */
  infoText?: string | null;
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
  homeSection?: string;
  home_section?: string;
  categoryId?: string | null;
  category_id?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    allowMultiple: boolean;
    description?: string | null;
  } | null;
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
  dogPolicyEnabled?: boolean;
  dog_policy_enabled?: boolean;
  dogPolicyTitle?: string | null;
  dog_policy_title?: string | null;
  dogPolicySubtitle?: string | null;
  dog_policy_subtitle?: string | null;
  dogFee?: number | null;
  dog_fee?: number | null;
  dogPolicyImageMediaId?: string | null;
  dog_policy_image_media_id?: string | null;
  dogPolicyImageUrl?: string | null;
  dog_policy_image_url?: string | null;
  /** Custom per-count dog fees: { "1": 90, "2": 120, "3": 170 } in currency units. Overrides flat dog_fee * count. */
  dogFees?: Record<number, number> | null;
  dog_fees?: Record<number, number> | null;
  extras?: CottageExtra[];
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
  category_id?: string;
  categoryId?: string;
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
  homeSection?: string;
  home_section?: string;
  categoryId?: string | null;
  category_id?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    allowMultiple: boolean;
    description?: string | null;
  } | null;
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
  dogPolicyEnabled?: boolean;
  dog_policy_enabled?: boolean;
  dogPolicyTitle?: string | null;
  dog_policy_title?: string | null;
  dogPolicySubtitle?: string | null;
  dog_policy_subtitle?: string | null;
  dogFee?: number | null;
  dog_fee?: number | null;
  dogPolicyImageMediaId?: string | null;
  dog_policy_image_media_id?: string | null;
  dogPolicyImageUrl?: string | null;
  dog_policy_image_url?: string | null;
  /** Custom per-count dog fees: { "1": 90, "2": 120, "3": 170 } in currency units. */
  dogFees?: Record<number, number> | null;
  dog_fees?: Record<number, number> | null;
  extras?: CottageExtra[];
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

