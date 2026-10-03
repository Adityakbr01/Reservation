import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { availabilityKeys } from "@/lib/query-keys";
import { createBlock, deleteBlock, listBlocks } from "../api/availability.api";
import type { BlockFilters } from "../types/availability.types";

export function useBlocks(filters: BlockFilters) {
  return useQuery({
    queryKey: availabilityKeys.blocks(filters),
    queryFn: () => listBlocks(filters),
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBlock,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success("Block added");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success("Block removed");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
