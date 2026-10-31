import type { AvailabilitySearchParams } from "@/modules/availability/types/availability.types";

declare global {
  interface Window {
    /** Serialized default search rendered into the pre-rendered home page. */
    __HS_SSG_SEARCH__?: AvailabilitySearchParams;
    /** True only while React is hydrating pre-rendered markup. */
    __HS_HYDRATING__?: boolean;
  }

  // eslint-disable-next-line no-var
  var __HS_SSG_SEARCH__: AvailabilitySearchParams | undefined;
}

export {};
