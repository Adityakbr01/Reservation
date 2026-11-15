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
  pricingType: "PER_PERSON" | "PER_STAY";
  imageMediaId?: string | null;
  imageUrl?: string | null;
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
  dogPolicyImageMediaId?: string | null;
  dog_policy_image_media_id?: string | null;
  dogPolicyImageUrl?: string | null;
  dog_policy_image_url?: string | null;
  extras?: CottageExtra[];
  shortDescription: string | null;
  amenities: string[];
  images?: Array<{ mediaId: string; altText: string | null; sortOrder: number; url?: string }>;
  media?: Array<{ mediaId: string; kind: "image" | "video"; altText: string | null; sortOrder: number; url?: string }>;
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
