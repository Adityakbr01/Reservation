import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { roomTypeKeys } from "@/lib/query-keys";
import { createRoomType, getRoomType, listRoomTypes, updateRoomType } from "../api/room-types.api";
import type { RoomTypeFilters } from "../types/room-type.types";

export function useRoomTypes(filters: RoomTypeFilters) {
  return useQuery({
    queryKey: roomTypeKeys.list(filters),
    queryFn: () => listRoomTypes(filters),
  });
}

export function useRoomType(id: string, enabled = true) {
  return useQuery({
    queryKey: roomTypeKeys.detail(id),
    queryFn: () => getRoomType(id),
    enabled: enabled && id.length > 0,
  });
}

export function useCreateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoomType,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: roomTypeKeys.all });
      toast.success(`“${created.name}” created`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useUpdateRoomType(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateRoomType>[1]) => updateRoomType(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomTypeKeys.all });
      toast.success("Room type updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
