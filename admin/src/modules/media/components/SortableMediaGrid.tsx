import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import type { MediaItem } from "../hooks/use-media";
import {
  useDeleteMedia,
  useReorderMedia,
  useUpdateMedia,
} from "../hooks/use-media";

function SortableItem({
  item,
  alts,
  setAlts,
  moves,
  setMoves,
  folders,
  updateMutation,
  deleteMutation,
}: {
  item: MediaItem;
  alts: Record<string, string>;
  setAlts: (prev: (prev: Record<string, string>) => Record<string, string>) => void;
  moves: Record<string, string>;
  setMoves: (prev: (prev: Record<string, string>) => Record<string, string>) => void;
  folders: string[];
  updateMutation: ReturnType<typeof useUpdateMedia>;
  deleteMutation: ReturnType<typeof useDeleteMedia>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const isVideo = item.kind === "video" || item.mime.startsWith("video/");
  const currentFolder = item.folder ?? "";
  const newFolder = moves[item.id] ?? currentFolder;
  const isMoveDisabled =
    updateMutation.isPending || newFolder === currentFolder;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border-border group relative overflow-hidden"
    >
      <CardContent className="space-y-3 p-4">
        <div className="relative h-48 rounded-lg overflow-hidden bg-muted">
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
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="text-xs font-medium text-white bg-black/40 px-2 py-0.5 rounded">
              Pos {item.position + 1}
            </span>
          </div>
        </div>
        <p className="truncate text-sm font-medium">{item.fileName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.folder ?? "Root (unfiled)"}
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`alt-${item.id}`} className="text-xs font-medium">
              Alt text
            </Label>
            <Input
              id={`alt-${item.id}`}
              value={alts[item.id] ?? item.alt ?? ""}
              onChange={(e) =>
                setAlts((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
              placeholder="Alt text"
              aria-label={`Alt text for ${item.fileName}`}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full flex-1"
              disabled={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate({
                  id: item.id,
                  alt: alts[item.id] ?? null,
                })
              }
            >
              Save alt
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`move-${item.id}`} className="text-xs font-medium">
              Move to folder
            </Label>
            <select
              id={`move-${item.id}`}
              value={newFolder}
              onChange={(e) =>
                setMoves((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
              disabled={updateMutation.isPending}
              aria-label={`Move ${item.fileName} to folder`}
            >
              <option value="">Root (unfiled)</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-full"
            disabled={isMoveDisabled}
            onClick={() =>
              updateMutation.mutate({
                id: item.id,
                folder: newFolder ? newFolder : null,
              })
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
}

export function SortableMediaGrid({
  items,
  folders,
  onReorder,
  alts,
  setAlts,
  moves,
  setMoves,
}: {
  items: MediaItem[];
  folders: string[];
  onReorder: (items: MediaItem[]) => void;
  alts: Record<string, string>;
  setAlts: (prev: (prev: Record<string, string>) => Record<string, string>) => void;
  moves: Record<string, string>;
  setMoves: (prev: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor));
  const updateMutation = useUpdateMedia();
  const deleteMutation = useDeleteMedia();
  const reorderMutation = useReorderMedia();
  const isPending = updateMutation.isPending || reorderMutation.isPending;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position: index,
    }));
    onReorder(reordered);
    reorderMutation.mutate(reordered.map((i) => ({ id: i.id, position: i.position })));
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={undefined}
        disabled={isPending}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            return (
              <SortableItem
                key={item.id}
                item={item}
                alts={alts}
                setAlts={setAlts}
                moves={moves}
                setMoves={setMoves}
                folders={folders}
                updateMutation={updateMutation}
                deleteMutation={deleteMutation}
              />
            );
          })}
        </div>
      </SortableContext>
      {reorderMutation.isSuccess && (
        <p className="mt-2 text-xs text-success">Order saved</p>
      )}
    </DndContext>
  );
}
