import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { roomKeys } from "@/lib/query-keys";
import { createRoom, getRoom, listRooms, updateRoom } from "../api/rooms.api";
import type { RoomFilters } from "../types/room.types";

export function useRooms(filters: RoomFilters) {
  return useQuery({
    queryKey: roomKeys.list(filters),
    queryFn: () => listRooms(filters),
  });
}

export function useRoom(id: string, enabled = true) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => getRoom(id),
    enabled: enabled && id.length > 0,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoom,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.all });
      toast.success(`Room ${created.roomNumber} created`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useUpdateRoom(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateRoom>[1]) => updateRoom(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.all });
      toast.success("Room updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
