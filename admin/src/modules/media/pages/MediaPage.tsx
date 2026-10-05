import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDeleteMedia, useMedia, useUpdateMedia, useUploadMedia } from "../hooks/use-media";

export function MediaPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [alts, setAlts] = useState<Record<string, string>>({});
  const debouncedSearch = useDebouncedValue(search);
  const filters = useMemo(
    () => ({ page, limit: 12, ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}) }),
    [page, debouncedSearch],
  );
  const { data, isPending, isError, refetch } = useMedia(filters);
  const uploadMutation = useUploadMedia();
  const updateMutation = useUpdateMedia();
  const deleteMutation = useDeleteMedia();
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Media</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} files` : "Images up to 8 MB · Video MP4/WebM up to 50 MB"}
          </p>
        </div>
        <div>
          <Label htmlFor="media-file" className="sr-only">
            Upload image or video
          </Label>
          <Input
            id="media-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
            disabled={uploadMutation.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search file name…"
        className="sm:max-w-xs"
        aria-label="Search media"
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-3" aria-busy="true" aria-label="Loading media">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-48 animate-pulse rounded-xl bg-muted" />
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
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No media yet — upload the first image above.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-3 p-4">
                  {(item as { kind?: string }).kind === "video" || item.url.match(/\.(mp4|webm)($|\?)/i) ? (
                    <video src={item.url} className="h-40 w-full rounded-lg bg-black object-cover" controls preload="metadata" />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt ?? item.fileName}
                      className="h-40 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  )}
                  <p className="truncate text-sm font-medium">{item.fileName}</p>
                  <div className="flex gap-2">
                    <Input
                      value={alts[item.id] ?? item.alt ?? ""}
                      onChange={(e) => setAlts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Alt text"
                      aria-label={`Alt text for ${item.fileName}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({ id: item.id, alt: alts[item.id] ?? null })
                      }
                    >
                      Save
                    </Button>
                  </div>
                  <ConfirmButton
                    title="Delete this image?"
                    description="The file is permanently removed. Pages using it will show a placeholder."
                    pending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(item.id)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          <PaginationControls page={page} totalPages={data?.totalPages ?? 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default MediaPage;
