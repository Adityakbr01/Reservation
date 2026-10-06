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
  kind?: "image" | "video";
  folder: string | null;
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
  folder?: string;
}

export interface UploadEntry {
  file: File;
  folder: string | null;
}

const BATCH_SIZE = 10;

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

export async function listFolders(): Promise<string[]> {
  const { data } = await apiClient.get<ApiEnvelope<string[]>>("/admin/media/folders");
  return data.data;
}

export interface UploadProgress {
  done: number;
  total: number;
}

/** Groups entries by folder and uploads in chunks of 10. Returns total uploaded. */
async function uploadMedia(
  entries: UploadEntry[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<number> {
  const byFolder = new Map<string | null, File[]>();
  for (const entry of entries) {
    const list = byFolder.get(entry.folder) ?? [];
    list.push(entry.file);
    byFolder.set(entry.folder, list);
  }
  const chunks: Array<{ folder: string | null; files: File[] }> = [];
  for (const [folder, files] of byFolder) {
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      chunks.push({ folder, files: files.slice(i, i + BATCH_SIZE) });
    }
  }
  onProgress?.({ done: 0, total: chunks.length });
  let total = 0;
  let done = 0;
  for (const { folder, files } of chunks) {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    if (folder) form.append("folder", folder);
    const response = await apiClient.post<ApiEnvelope<MediaItem[]>>("/admin/media", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    total += unwrapResponse(response).length;
    done += 1;
    onProgress?.({ done, total: chunks.length });
  }
  return total;
}

async function updateMedia(id: string, payload: { alt?: string | null; folder?: string | null }): Promise<MediaItem> {
  const response = await apiClient.patch<ApiEnvelope<MediaItem>>(`/admin/media/${id}`, payload);
  return unwrapResponse(response);
}

async function deleteMedia(id: string): Promise<void> {
  await apiClient.delete(`/admin/media/${id}`);
}

export function useMedia(filters: MediaFilters) {
  return useQuery({ queryKey: mediaKeys.list(filters), queryFn: () => listMedia(filters) });
}

export function useFolders() {
  return useQuery({ queryKey: [...mediaKeys.all, "folders"], queryFn: listFolders });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entries,
      onProgress,
    }: {
      entries: UploadEntry[];
      onProgress?: (progress: UploadProgress) => void;
    }) => uploadMedia(entries, onProgress),
    onSuccess: (total) => {
      void queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success(total === 1 ? "1 file uploaded" : `${total} files uploaded`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alt, folder }: { id: string; alt?: string | null; folder?: string | null }) =>
      updateMedia(id, { alt, folder }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("Media saved");
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
