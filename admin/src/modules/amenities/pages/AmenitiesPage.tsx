import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageField } from "@/components/common/ImageField";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiClient, getApiErrorMessage, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

interface Amenity {
  id: string;
  name: string;
  slug: string;
  group: "HIGHLIGHT" | "FACILITY";
  description: string | null;
  imageMediaId: string | null;
  iconUrl: string | null;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
}

interface AmenityFormState {
  name: string;
  group: "HIGHLIGHT" | "FACILITY";
  description: string;
  imageMediaId: string | null;
  iconUrl: string;
  sortOrder: string;
  active: boolean;
}

const emptyForm: AmenityFormState = {
  name: "",
  group: "HIGHLIGHT",
  description: "",
  imageMediaId: null,
  iconUrl: "",
  sortOrder: "0",
  active: true,
};

function toForm(a: Amenity): AmenityFormState {
  return {
    name: a.name,
    group: a.group,
    description: a.description ?? "",
    imageMediaId: a.imageMediaId,
    iconUrl: a.iconUrl ?? "",
    sortOrder: String(a.sortOrder ?? 0),
    active: a.status === "ACTIVE",
  };
}

function toPayload(form: AmenityFormState) {
  return {
    name: form.name.trim(),
    group: form.group,
    description: form.description.trim() || null,
    imageMediaId: form.imageMediaId,
    iconUrl: form.iconUrl.trim() || null,
    sortOrder: Math.max(0, Number(form.sortOrder) || 0),
    status: form.active ? "ACTIVE" : "INACTIVE",
  };
}

export function AmenitiesPage() {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState<AmenityFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AmenityFormState>(emptyForm);

  const { data, isPending, refetch } = useQuery({
    queryKey: ["amenities-admin"],
    queryFn: async () => {
      const r = await apiClient.get<ApiEnvelope<Amenity[]>>("/admin/amenities", { params: { page: 1, limit: 100 } });
      const payload = unwrapResponse(r) as unknown as Amenity[] | { items: Amenity[] };
      return Array.isArray(payload) ? payload : (payload.items ?? []);
    },
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["amenities-admin"] });
  }

  const create = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<ApiEnvelope<Amenity>>("/admin/amenities", toPayload(createForm));
      return unwrapResponse(r);
    },
    onSuccess: () => {
      setCreateForm(emptyForm);
      void invalidate();
      toast.success("Feature added — link it to rooms from the room-type editor");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.patch<ApiEnvelope<Amenity>>(`/admin/amenities/${id}`, toPayload(editForm));
      return unwrapResponse(r);
    },
    onSuccess: () => {
      setEditingId(null);
      void invalidate();
      toast.success("Feature updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete<ApiEnvelope<unknown>>(`/admin/amenities/${id}`);
      return unwrapResponse(r);
    },
    onSuccess: () => {
      void invalidate();
      toast.success("Feature removed");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const highlights = (data ?? []).filter((a) => a.group === "HIGHLIGHT");
  const facilities = (data ?? []).filter((a) => a.group !== "HIGHLIGHT");

  function startEdit(a: Amenity) {
    setEditingId(a.id);
    setEditForm(toForm(a));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight">Features & facilities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Own model with images. HIGHLIGHT shows as icon + label, FACILITY as a tick list.
          Items without an image fall back to the default tick.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add feature</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="am-name">Name</Label>
            <Input
              id="am-name"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="One dog allowed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="am-group">Category</Label>
            <select
              id="am-group"
              value={createForm.group}
              onChange={(e) => setCreateForm((p) => ({ ...p, group: e.target.value as "HIGHLIGHT" | "FACILITY" }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="HIGHLIGHT">Highlight (icon + label)</option>
              <option value="FACILITY">Facility (tick list)</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="am-desc">Description (optional)</Label>
            <Input
              id="am-desc"
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short note shown with the feature"
            />
          </div>
          <div className="space-y-2">
            <ImageField label="Icon upload (wins over URL)" mediaId={createForm.imageMediaId} onChange={(id) => setCreateForm((p) => ({ ...p, imageMediaId: id }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="am-icon">Icon URL (mock now, replace later)</Label>
            <Input
              id="am-icon"
              value={createForm.iconUrl}
              onChange={(e) => setCreateForm((p) => ({ ...p, iconUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="am-order">Sort order</Label>
            <Input
              id="am-order"
              type="number"
              min={0}
              value={createForm.sortOrder}
              onChange={(e) => setCreateForm((p) => ({ ...p, sortOrder: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              className="rounded-full"
              disabled={create.isPending || createForm.name.trim().length < 2}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Saving…" : "Add feature"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading amenities" />
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No features yet — seed runs automatically on server boot.
            <div className="mt-4">
              <Button variant="outline" className="rounded-full" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        ([
          { title: "Highlights", items: highlights },
          { title: "Facilities", items: facilities },
        ] as const).map(
          (section) =>
            section.items.length > 0 && (
              <div key={section.title} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.title} ({section.items.length})
                </h2>
                <div className="grid gap-3">
                  {section.items.map((a) =>
                    editingId === a.id ? (
                      <Card key={a.id}>
                        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`edit-name-${a.id}`}>Name</Label>
                            <Input
                              id={`edit-name-${a.id}`}
                              value={editForm.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-group-${a.id}`}>Category</Label>
                            <select
                              id={`edit-group-${a.id}`}
                              value={editForm.group}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, group: e.target.value as "HIGHLIGHT" | "FACILITY" }))
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="HIGHLIGHT">Highlight (icon + label)</option>
                              <option value="FACILITY">Facility (tick list)</option>
                            </select>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor={`edit-desc-${a.id}`}>Description (optional)</Label>
                            <Input
                              id={`edit-desc-${a.id}`}
                              value={editForm.description}
                              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <ImageField
                              label="Icon upload (wins over URL)"
                              mediaId={editForm.imageMediaId}
                              onChange={(id) => setEditForm((p) => ({ ...p, imageMediaId: id }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-icon-${a.id}`}>Icon URL (mock now, replace later)</Label>
                            <Input
                              id={`edit-icon-${a.id}`}
                              value={editForm.iconUrl}
                              onChange={(e) => setEditForm((p) => ({ ...p, iconUrl: e.target.value }))}
                              placeholder="https://…"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-order-${a.id}`}>Sort order</Label>
                            <Input
                              id={`edit-order-${a.id}`}
                              type="number"
                              min={0}
                              value={editForm.sortOrder}
                              onChange={(e) => setEditForm((p) => ({ ...p, sortOrder: e.target.value }))}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-4 rounded-md border border-input px-4 py-3 sm:col-span-2">
                            <div className="space-y-0.5">
                              <Label htmlFor={`edit-active-${a.id}`}>Active</Label>
                              <p className="text-xs text-muted-foreground">Off hides it from room pages</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={editForm.active ? "ACTIVE" : "INACTIVE"} />
                              <Switch
                                id={`edit-active-${a.id}`}
                                checked={editForm.active}
                                onCheckedChange={(on) => setEditForm((p) => ({ ...p, active: on }))}
                                aria-label="Active"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 sm:col-span-2">
                            <Button
                              className="rounded-full"
                              disabled={update.isPending || editForm.name.trim().length < 2}
                              onClick={() => update.mutate(a.id)}
                            >
                              {update.isPending ? "Saving…" : "Save changes"}
                            </Button>
                            <Button variant="outline" className="rounded-full" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card key={a.id}>
                        <CardContent className="flex items-center gap-3 p-4">
                          {a.iconUrl ? (
                            <img src={a.iconUrl} alt="" className="size-8 shrink-0 rounded object-cover" loading="lazy" />
                          ) : (
                            <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                              ✓
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{a.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {a.group} · order {a.sortOrder}
                              {a.description ? ` · ${a.description}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={a.status} />
                          <Button variant="outline" size="sm" className="rounded-full" onClick={() => startEdit(a)}>
                            Edit
                          </Button>
                          <ConfirmButton
                            title="Delete feature?"
                            description={`${a.name} will be removed from every room using it.`}
                            pending={remove.isPending}
                            onConfirm={() => remove.mutate(a.id)}
                          />
                        </CardContent>
                      </Card>
                    ),
                  )}
                </div>
              </div>
            ),
        )
      )}
    </div>
  );
}

export default AmenitiesPage;
