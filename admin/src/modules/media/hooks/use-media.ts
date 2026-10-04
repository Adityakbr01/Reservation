import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiClient, getApiErrorMessage, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import { mediaKeys } from "@/lib/query-keys";

export interface MediaItem {
  id: string;
  fileName: string;
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
  size: number;
  createdAt: string;
}

export interface MediaFilters {
  page: number;
  limit: number;
  q?: string;
}

export async function listMedia(filters: MediaFilters): Promise<Paged<MediaItem>> {
  const { data } = await apiClient.get<ApiEnvelope<MediaItem[]>>("/admin/media", {
    params: filters,
  });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

async function uploadMedia(file: File): Promise<MediaItem> {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post<ApiEnvelope<MediaItem>>("/admin/media", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapResponse(response);
}

async function updateMedia(id: string, payload: { alt?: string | null }): Promise<MediaItem> {
  const response = await apiClient.patch<ApiEnvelope<MediaItem>>(`/admin/media/${id}`, payload);
  return unwrapResponse(response);
}

async function deleteMedia(id: string): Promise<void> {
  await apiClient.delete(`/admin/media/${id}`);
}

export function useMedia(filters: MediaFilters) {
  return useQuery({ queryKey: mediaKeys.list(filters), queryFn: () => listMedia(filters) });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadMedia(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("Image uploaded");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string | null }) => updateMedia(id, { alt }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("Alt text saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("Media deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
