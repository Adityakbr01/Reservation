import { create } from "zustand";
import type {
  SearchResultRoomType,
  AvailabilitySearchParams,
} from "@/modules/availability/types/availability.types";

interface BookingJourneyState {
  isOpen: boolean;
  cottage: SearchResultRoomType | null;
  searchParams?: Partial<AvailabilitySearchParams> | null;
  openBookingJourney: (
    cottage?: SearchResultRoomType | null,
    searchParams?: Partial<AvailabilitySearchParams> | null,
  ) => void;
  closeBookingJourney: () => void;
}

export const useBookingJourneyStore = create<BookingJourneyState>((set) => ({
  isOpen: false,
  cottage: null,
  searchParams: null,
  openBookingJourney: (cottage = null, searchParams = null) =>
    set({ isOpen: true, cottage, searchParams }),
  closeBookingJourney: () => set({ isOpen: false, cottage: null, searchParams: null }),
}));

