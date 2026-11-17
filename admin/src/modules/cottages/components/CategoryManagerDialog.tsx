import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categories.api";
import type { CottageCategory } from "../types/category.types";

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagerDialog({ open, onOpenChange }: CategoryManagerDialogProps) {
  const queryClient = useQueryClient();
  const { data: categories = [], isPending } = useQuery({
    queryKey: ["cottage-categories"],
    queryFn: listCategories,
    enabled: open,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatAllowMultiple, setNewCatAllowMultiple] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAllowMultiple, setEditAllowMultiple] = useState(true);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cottage-categories"] });
      toast.success("Category created");
      setIsAdding(false);
      setNewCatName("");
      setNewCatDesc("");
      setNewCatAllowMultiple(true);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCategory>[1] }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cottage-categories"] });
      toast.success("Category updated");
      setEditingId(null);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cottage-categories"] });
      toast.success("Category deleted");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  function startEdit(cat: CottageCategory) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description ?? "");
    setEditAllowMultiple(cat.allow_multiple ?? cat.allowMultiple ?? true);
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      toast.error("Category name is required");
      return;
    }
    updateMut.mutate({
      id,
      payload: {
        name: editName.trim(),
        description: editDesc.trim() || null,
        allow_multiple: editAllowMultiple,
        allowMultiple: editAllowMultiple,
      },
    });
  }

  function handleSaveNew() {
    if (!newCatName.trim()) {
      toast.error("Category name is required");
      return;
    }
    createMut.mutate({
      name: newCatName.trim(),
      description: newCatDesc.trim() || null,
      allow_multiple: newCatAllowMultiple,
      allowMultiple: newCatAllowMultiple,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      {/* Backdrop click handler */}
      <div className="fixed inset-0" onClick={() => onOpenChange(false)} />

      <div
        className="relative z-10 w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
      >
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 id="category-manager-title" className="text-lg font-semibold text-foreground">
                Manage Cottage Categories
              </h2>
              <p className="text-xs text-muted-foreground">
                Group cottages by collection and configure whether multiple cottages can be booked together.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 pt-4">
          {/* Header Action */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Existing Collections ({categories.length})
            </span>
            {!isAdding && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="gap-1.5 h-8 text-xs rounded-full"
              >
                <Plus className="size-3.5" /> New Category
              </Button>
            )}
          </div>

          {/* Add Category Card */}
          {isAdding && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Add New Collection</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  <X className="size-3.5 mr-1" /> Cancel
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Category Name *</Label>
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Farm Cottages, The Estate Collection"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Description (Optional)</Label>
                <Input
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description displayed on booking modal"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium cursor-pointer">
                    Allow Multiple Cottage Selection
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    When enabled, guests can select and book multiple cottages in this category at once.
                  </p>
                </div>
                <Switch
                  checked={newCatAllowMultiple}
                  onCheckedChange={setNewCatAllowMultiple}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="h-8 text-xs rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNew}
                  disabled={createMut.isPending}
                  className="h-8 text-xs rounded-full"
                >
                  {createMut.isPending ? "Creating…" : "Save Category"}
                </Button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2.5">
            {isPending ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading categories…
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No categories configured yet.
              </div>
            ) : (
              categories.map((cat) => {
                const isEditing = editingId === cat.id;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-primary/30 bg-muted/20 p-3.5 space-y-3"
                    >
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Category Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Description</Label>
                        <Input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border bg-background p-2.5">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium">
                            Allow Multiple Cottage Selection
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            {editAllowMultiple
                              ? "Guests can select multiple cottages in this category"
                              : "Single cottage selection only (auto-deselects others)"}
                          </p>
                        </div>
                        <Switch
                          checked={editAllowMultiple}
                          onCheckedChange={setEditAllowMultiple}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="h-7 text-xs rounded-full"
                        >
                          <X className="size-3.5 mr-1" /> Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveEdit(cat.id)}
                          disabled={updateMut.isPending}
                          className="h-7 text-xs rounded-full"
                        >
                          <Check className="size-3.5 mr-1" />
                          {updateMut.isPending ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  );
                }

                const allowsMulti = cat.allow_multiple ?? cat.allowMultiple ?? true;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted/10"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          {cat.name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            allowsMulti
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {allowsMulti ? "Multi-select" : "Single cottage only"}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/85 font-mono">
                        Slug: {cat.slug} {cat.cottagesCount != null && `· ${cat.cottagesCount} cottages`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(cat)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                        aria-label={`Edit ${cat.name}`}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm(`Delete category "${cat.name}"?`)) {
                            deleteMut.mutate(cat.id);
                          }
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
