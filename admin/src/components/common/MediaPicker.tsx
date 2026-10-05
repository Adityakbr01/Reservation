import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFolders, useMedia } from "@/modules/media/hooks/use-media";

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: { id: string; url: string; fileName: string }) => void;
  title?: string;
}

/** Modal media library picker — returns the chosen file, uploads inline. */
export function MediaPicker({ open, onClose, onSelect, title = "Choose image" }: MediaPickerProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const filters = useMemo(
    () => ({
      page,
      limit: 12,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      ...(folder ? { folder: folder === "__root__" ? "__root__" : folder } : {}),
    }),
    [page, debouncedSearch, folder],
  );
  const { data, isPending } = useMedia(filters);
  const { data: folders } = useFolders();
  const items = data?.items ?? [];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <Card
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">{title}</CardTitle>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search file name…"
              aria-label="Search media"
              className="flex-1"
            />
            <select
              value={folder}
              onChange={(e) => {
                setFolder(e.target.value);
                setPage(1);
              }}
              className="h-9 max-w-40 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Filter by folder"
            >
              <option value="">All folders</option>
              <option value="__root__">Root</option>
              {(folders ?? []).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          {isPending ? (
            <div className="grid grid-cols-3 gap-2" aria-label="Loading media">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No images yet — upload one on the Media page first.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect({ id: item.id, url: item.url, fileName: item.fileName });
                    onClose();
                  }}
                  className="group overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Select ${item.fileName}`}
                >
                  <img
                    src={item.url}
                    alt={item.alt ?? item.fileName}
                    className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data?.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MediaPicker;
