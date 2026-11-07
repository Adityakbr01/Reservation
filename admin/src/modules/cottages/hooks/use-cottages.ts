import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { cottageKeys } from "@/lib/query-keys";
import { createCottage, getCottage, listCottages, updateCottage, deleteCottage } from "../api/cottages.api";
import type { CottageFilters } from "../types/cottage.types";

export function useCottages(filters: CottageFilters) {
  return useQuery({
    queryKey: cottageKeys.list(filters),
    queryFn: () => listCottages(filters),
  });
}

export function useCottage(id: string, enabled = true) {
  return useQuery({
    queryKey: cottageKeys.detail(id),
    queryFn: () => getCottage(id),
    enabled: enabled && id.length > 0,
  });
}

export function useCreateCottage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCottage,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: cottageKeys.all });
      toast.success(`“${created.name}” created successfully`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useUpdateCottage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateCottage>[1]) => updateCottage(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cottageKeys.all });
      toast.success("Cottage updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useDeleteCottage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCottage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cottageKeys.all });
      toast.success("Cottage deleted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

// Aliases
export const useRoomTypes = useCottages;
export const useRoomType = useCottage;
export const useCreateRoomType = useCreateCottage;
export const useUpdateRoomType = useUpdateCottage;

