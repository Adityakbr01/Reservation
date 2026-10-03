import { useQuery } from "@tanstack/react-query";
import { availabilityKeys } from "@/lib/query-keys";
import { fetchAvailabilityCalendar, searchAvailability } from "../api/availability.api";
import type { AvailabilitySearchParams } from "../types/availability.types";

export function useAvailabilitySearch(params: AvailabilitySearchParams | null) {
  return useQuery({
    queryKey: availabilityKeys.search(params),
    queryFn: () => {
      if (!params) throw new Error("Missing search params");
      return searchAvailability(params);
    },
    enabled: params !== null,
    staleTime: 30_000,
    retry: false,
  });
}

export function useAvailabilityCalendar(roomTypeId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: availabilityKeys.calendar(roomTypeId ?? "none", from, to),
    queryFn: () => {
      if (!roomTypeId) throw new Error("Missing room type");
      return fetchAvailabilityCalendar(roomTypeId, from, to);
    },
    enabled: roomTypeId !== null,
    staleTime: 60_000,
    retry: false,
  });
}
