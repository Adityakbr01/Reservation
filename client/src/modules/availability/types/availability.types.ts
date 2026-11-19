export interface AvailabilitySearchParams {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
}

export interface SearchRate {
  ratePlanId: string;
  name: string;
  pricingType: "PER_NIGHT" | "PER_STAY";
  /** Minor currency unit, backend-computed. */
  perNight: number;
  total: number;
  currency: string;
  nightly?: Array<{ date: string; price: number }>;
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

export interface SearchResultRoomType {
  id: string;
  name: string;
  slug: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  maxDogs?: number | null;
  max_dogs?: number | null;
  dogPolicyEnabled?: boolean;
  dog_policy_enabled?: boolean;
  dogPolicyTitle?: string | null;
  dog_policy_title?: string | null;
  dogPolicySubtitle?: string | null;
  dog_policy_subtitle?: string | null;
  dogFee?: number | null;
  dog_fee?: number | null;
  dogFees?: Record<string | number, number> | null;
  dog_fees?: Record<string | number, number> | null;
  dogPolicyImageMediaId?: string | null;
  dog_policy_image_media_id?: string | null;
  dogPolicyImageUrl?: string | null;
  dog_policy_image_url?: string | null;
  extras?: CottageExtra[];
  shortDescription: string | null;
  homeSection?: string;
  home_section?: string;
  categoryId?: string | null;
  category_id?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    allowMultiple: boolean;
    allow_multiple?: boolean;
  } | null;
  amenities: string[];
  images?: Array<{ mediaId: string; altText: string | null; sortOrder: number; url?: string }>;
  media?: Array<{ mediaId: string; kind: "image" | "video"; altText: string | null; sortOrder: number; url?: string }>;
  /** Per-cottage cottage-card element toggles (from section_settings.cottageCard). */
  sectionSettings?: {
    cottageCard?: {
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
    };
  };
}

export interface SearchResultItem {
  roomType: SearchResultRoomType;
  availableCount: number;
  rates: SearchRate[];
}

export interface AvailabilitySearchResponse {
  results: SearchResultItem[];
  search: AvailabilitySearchParams & { nights: number };
}
