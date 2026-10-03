import { useQuery } from "@tanstack/react-query";
import { roomTypeKeys } from "@/lib/query-keys";
import { getRoomTypeBySlug } from "../api/rooms.api";

export function useRoomTypeBySlug(slug: string) {
  return useQuery({
    queryKey: roomTypeKeys.detail(slug),
    queryFn: () => getRoomTypeBySlug(slug),
    enabled: slug.length > 0,
    retry: false,
    staleTime: 60_000,
  });
}
