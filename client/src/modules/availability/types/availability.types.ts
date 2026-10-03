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
}

export interface SearchResultRoomType {
  id: string;
  name: string;
  slug: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  shortDescription: string | null;
  amenities: string[];
  images?: Array<{ mediaId: string; altText: string | null; sortOrder: number }>;
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
