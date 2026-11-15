import { create } from "zustand";
import type { SearchResultRoomType } from "@/modules/availability/types/availability.types";

interface BookingJourneyState {
  isOpen: boolean;
  cottage: SearchResultRoomType | null;
  openBookingJourney: (cottage?: SearchResultRoomType | null) => void;
  closeBookingJourney: () => void;
}

export const useBookingJourneyStore = create<BookingJourneyState>((set) => ({
  isOpen: false,
  cottage: null,
  openBookingJourney: (cottage = null) => set({ isOpen: true, cottage }),
  closeBookingJourney: () => set({ isOpen: false, cottage: null }),
}));

