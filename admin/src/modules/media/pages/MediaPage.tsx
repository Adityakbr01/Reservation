import { useEffect, useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useDeleteMedia,
  useMedia,
  useUploadMedia,
} from "../hooks/use-media";
import type { MediaItem } from "../hooks/use-media";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function MediaPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [uploadStatus, setUploadStatus] = useState<{
    names: string[];
    done: number;
    total: number;
  } | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const filters = useMemo(
    () => ({
      page,
      limit: 12,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
    }),
    [page, debouncedSearch],
  );

  const { data, isPending, isError, refetch } = useMedia(filters);
  const uploadMutation = useUploadMedia();
  const deleteMutation = useDeleteMedia();
  const [items, setItems] = useState<MediaItem[]>(data?.items ?? []);

  useEffect(() => {
    if (data?.items) setItems(data.items);
  }, [data]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const entries = Array.from(fileList).map((file) => ({
      file,
      folder: null,
    }));
    const names = entries.map((e) => e.file.name);
    setUploadStatus({ names, done: 0, total: 1 });
    uploadMutation.mutate(
      {
        entries,
        onProgress: ({ done, total }) =>
          setUploadStatus((prev) => (prev ? { ...prev, done, total } : prev)),
      },
      {
        onSuccess: () => {
          setUploadStatus(null);
        },
        onError: () => setUploadStatus(null),
      },
    );
  }

  const isUploading = uploadMutation.isPending || uploadStatus !== null;
  const uploadDone = uploadStatus?.done ?? 0;
  const uploadTotal = Math.max(1, uploadStatus?.total ?? 1);
  const uploadPercent = Math.min(100, Math.round((uploadDone / uploadTotal) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Media</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} files` : "Images up to 8 MB · Video MP4/WebM up to 50 MB"}
          </p>
        </div>
      </div>

      {/* Upload and Search Bar */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_260px] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="media-files" className="flex items-center gap-2">
              <UploadCloud className="size-4 text-brand" />
              <span>Upload files</span>
            </Label>
            <Input
              id="media-files"
              type="file"
              multiple
              accept={ACCEPT}
              disabled={isUploading}
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
              className="h-10 cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Select multiple JPEG, PNG, WebP, AVIF images or MP4/WebM videos.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-media">Search</Label>
            <Input
              id="search-media"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search file name…"
              className="h-10"
              aria-label="Search media"
            />
          </div>
        </CardContent>
      </Card>

      {/* Uploading progress bar */}
      {isUploading && uploadStatus && (
        <Card role="status" aria-live="polite" aria-label="Uploading files">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 shrink-0 animate-spin text-brand" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Uploading {uploadStatus.names.length}{" "}
                  {uploadStatus.names.length === 1 ? "file" : "files"}…
                  {uploadTotal > 1 && (
                    <span className="text-muted-foreground">
                      {" "}
                      (batch {Math.min(uploadDone + 1, uploadTotal)} of {uploadTotal})
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {uploadStatus.names.slice(0, 3).join(", ")}
                  {uploadStatus.names.length > 3 &&
                    ` +${uploadStatus.names.length - 3} more`}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">{uploadPercent}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={uploadPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Items Grid */}
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading media">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load media.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <UploadCloud className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No media files yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose files above to upload images or videos into your media library.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const isVideo = item.kind === "video" || item.mime.startsWith("video/");
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="space-y-3 p-3">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                    {isVideo ? (
                      <video
                        src={item.url}
                        className="h-full w-full object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.alt ?? item.fileName}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div>
                    <p className="truncate text-sm font-medium" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default MediaPage;
