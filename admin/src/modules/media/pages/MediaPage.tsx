import { useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDeleteMedia, useFolders, useMedia, useUpdateMedia, useUploadMedia } from "../hooks/use-media";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm";

interface FolderGroup {
  /** Row label + filter value, e.g. "Cottage" → "Cottage/*". */
  label: string;
  value: string;
  children: Array<{ label: string; value: string }>;
}

/** Groups "Cottage/Oakwood Cottage" under parent "Cottage" for the tree. */
function groupFolders(folders: string[]): FolderGroup[] {
  const groups = new Map<string, FolderGroup>();
  const order: string[] = [];
  for (const path of folders) {
    const parts = path.split("/");
    if (parts.length === 1) {
      groups.set(path, { label: path, value: path, children: [] });
      order.push(path);
      continue;
    }
    const parent = parts.slice(0, -1).join("/");
    let group = groups.get(parent);
    if (!group) {
      group = { label: parent, value: `${parent}/*`, children: [] };
      groups.set(parent, group);
      order.push(parent);
    }
    const name = parts[parts.length - 1] as string;
    if (!group.children.some((c) => c.value === path)) {
      group.children.push({ label: name, value: path });
    }
  }
  return order.map((key) => groups.get(key) as FolderGroup);
}

export function MediaPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(true);
  const [alts, setAlts] = useState<Record<string, string>>({});
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [targetFolder, setTargetFolder] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [uploadStatus, setUploadStatus] = useState<{
    names: string[];
    done: number;
    total: number;
  } | null>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebouncedValue(search);
  const filters = useMemo(
    () => ({
      page,
      limit: 12,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      ...(!showAll ? { folder: folder ?? "__root__" } : {}),
    }),
    [page, debouncedSearch, showAll, folder],
  );
  const { data, isPending, isError, refetch } = useMedia(filters);
  const { data: folders } = useFolders();
  const uploadMutation = useUploadMedia();
  const updateMutation = useUpdateMedia();
  const deleteMutation = useDeleteMedia();
  const items = data?.items ?? [];

  function pickFolder(next: string | null, all: boolean) {
    setFolder(next);
    setShowAll(all);
    setPage(1);
  }

  function uploadTarget(): string | null {
    if (newFolder.trim()) return newFolder.trim();
    if (targetFolder) return targetFolder;
    if (!showAll && folder) return folder;
    return null;
  }

  function handleFiles(fileList: FileList | null, base: string | null, useRelative: boolean) {
    if (!fileList || fileList.length === 0) return;
    const entries = Array.from(fileList).map((file) => {
      if (!useRelative) return { file, folder: base };
      const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name;
      const dir = relative.split("/").slice(0, -1).join("/");
      return { file, folder: dir ? (base ? `${base}/${dir}` : dir) : base };
    });
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
          setNewFolder("");
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
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Media</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} files` : "Images up to 8 MB · Video MP4/WebM up to 50 MB"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-1 p-3">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Folders
            </p>
            <Button
              variant={showAll ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start rounded-full"
              onClick={() => pickFolder(null, true)}
            >
              All files
            </Button>
            <Button
              variant={!showAll && folder === null ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start rounded-full"
              onClick={() => pickFolder(null, false)}
            >
              Root (unfiled)
            </Button>
            {groupFolders(folders ?? []).map((group) => (
              <div key={group.value} className="space-y-1 pt-1">
                <Button
                  variant={!showAll && folder === group.value ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start rounded-full ${group.children.length > 0 ? "font-semibold" : ""}`}
                  onClick={() => pickFolder(group.value, false)}
                  title={group.children.length > 0 ? `All files under ${group.label}` : group.label}
                >
                  <span className="truncate">{group.label}</span>
                </Button>
                {group.children.map((child) => (
                  <Button
                    key={child.value}
                    variant={!showAll && folder === child.value ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start rounded-full pl-8"
                    onClick={() => pickFolder(child.value, false)}
                    title={child.value}
                  >
                    <span className="truncate">{child.label}</span>
                  </Button>
                ))}
              </div>
            ))}
            <div className="space-y-2 px-1 pt-3">
              <Label htmlFor="new-folder">New folder</Label>
              <Input
                id="new-folder"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="Cottage/Oakwood Cottage"
              />
              <p className="text-[11px] text-muted-foreground">Up to 3 levels, created on first upload.</p>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="target-folder">Upload into</Label>
                <select
                  id="target-folder"
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{newFolder.trim() ? `New: ${newFolder.trim()}` : "Root (no folder)"}</option>
                  {(folders ?? []).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Target for the file upload.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="media-files">Upload files</Label>
                <Input
                  id="media-files"
                  type="file"
                  multiple
                  accept={ACCEPT}
                  disabled={isUploading}
                  onChange={(e) => {
                    handleFiles(e.target.files, uploadTarget(), false);
                    e.target.value = "";
                  }}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">Pick many files at once.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="media-folder">Upload a folder</Label>
                <Input
                  id="media-folder"
                  ref={(el) => {
                    dirInputRef.current = el;
                    el?.setAttribute("webkitdirectory", "");
                  }}
                  type="file"
                  accept={ACCEPT}
                  disabled={isUploading}
                  onChange={(e) => {
                    handleFiles(e.target.files, uploadTarget() ?? "Cottage", true);
                    e.target.value = "";
                  }}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">Subfolder names are kept.</p>
              </div>
            </CardContent>
          </Card>

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
              <p className="font-medium">Nothing here — upload files or pick another folder.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const isVideo = item.kind === "video" || item.mime.startsWith("video/");
                  return (
                    <Card key={item.id}>
                      <CardContent className="space-y-3 p-4">
                        {isVideo ? (
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
                        <p className="truncate text-xs text-muted-foreground">{item.folder ?? "Root (unfiled)"}</p>
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
                        <div className="flex gap-2">
                          <select
                            value={moves[item.id] ?? item.folder ?? ""}
                            onChange={(e) => setMoves((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                            aria-label={`Move ${item.fileName} to folder`}
                          >
                            <option value="">Root (unfiled)</option>
                            {(folders ?? []).map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            disabled={updateMutation.isPending || (moves[item.id] ?? item.folder ?? "") === (item.folder ?? "")}
                            onClick={() =>
                              updateMutation.mutate({ id: item.id, folder: moves[item.id] ? moves[item.id] : null })
                            }
                          >
                            Move
                          </Button>
                        </div>
                        <ConfirmButton
                          title={isVideo ? "Delete this video?" : "Delete this image?"}
                          description="The file is permanently removed. Pages using it will show a placeholder."
                          pending={deleteMutation.isPending}
                          onConfirm={() => deleteMutation.mutate(item.id)}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <PaginationControls page={page} totalPages={data?.totalPages ?? 0} onPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MediaPage;
