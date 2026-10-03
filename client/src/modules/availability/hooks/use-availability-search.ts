import { useQuery } from "@tanstack/react-query";
import { availabilityKeys } from "@/lib/query-keys";
import { searchAvailability } from "../api/availability.api";
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
