import type { RoomType } from "../../roomTypes/room-type.types";

export interface SearchRequest {
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  rooms: number;
}

export interface NightlyPrice {
  date: string;
  price: number;
}

export interface SearchRate {
  ratePlanId: string;
  name: string;
  pricingType: "PER_NIGHT" | "PER_STAY";
  /** Minor currency unit, backend-computed. Informational until booking recheck. */
  perNight: number;
  total: number;
  currency: string;
  /** Per-night breakdown for date-wise pricing display + total verification. */
  nightly?: NightlyPrice[];
}

export interface SearchResultItem {
  roomType: RoomType;
  availableCount: number;
  rates: SearchRate[];
}

export interface SearchResponse {
  results: SearchResultItem[];
  search: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    rooms: number;
    nights: number;
  };
}
