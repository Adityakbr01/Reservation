import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { availabilityKeys } from "@/lib/query-keys";
import { fetchAvailabilityCalendar, searchAvailability } from "../api/availability.api";
import type { AvailabilitySearchParams } from "../types/availability.types";

export function useAvailabilitySearch(
  params: AvailabilitySearchParams | null,
  options?: { staleTime?: number },
) {
  return useQuery({
    queryKey: availabilityKeys.search(params),
    queryFn: () => {
      if (!params) throw new Error("Missing search params");
      return searchAvailability(params);
    },
    enabled: params !== null,
    placeholderData: keepPreviousData,
    staleTime: options?.staleTime ?? 5 * 60_000,
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
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
