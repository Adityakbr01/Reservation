import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageField } from "@/components/common/ImageField";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { apiClient, getApiErrorMessage, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

interface Amenity {
  id: string;
  name: string;
  slug: string;
  group: "HIGHLIGHT" | "FACILITY";
  description: string | null;
  imageMediaId: string | null;
  sortOrder: number;
  status: string;
}

export function AmenitiesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [group, setGroup] = useState<"HIGHLIGHT" | "FACILITY">("HIGHLIGHT");
  const [imageMediaId, setImageMediaId] = useState<string | null>(null);

  const { data, isPending, refetch } = useQuery({
    queryKey: ["amenities-admin"],
    queryFn: async () => {
      const r = await apiClient.get<ApiEnvelope<Amenity[]>>("/admin/amenities", { params: { page: 1, limit: 200 } });
      const payload = unwrapResponse(r) as unknown as Amenity[] | { items: Amenity[] };
      return Array.isArray(payload) ? payload : (payload.items ?? []);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<ApiEnvelope<Amenity>>("/admin/amenities", {
        name: name.trim(),
        group,
        imageMediaId,
      });
      return unwrapResponse(r);
    },
    onSuccess: () => {
      setName("");
      setImageMediaId(null);
      void queryClient.invalidateQueries({ queryKey: ["amenities-admin"] });
      toast.success("Feature saved — add an image so it shows with an icon on detail pages");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete<ApiEnvelope<unknown>>(`/admin/amenities/${id}`);
      return unwrapResponse(r);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["amenities-admin"] }),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight">Features & facilities</h1>
        <p className="mt-1 text-sm text-muted-foreground">Separate model with images — e.g. One dog allowed, Parking, WiFi… plus Electric hob & oven, Dishwasher…</p>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="am-name">Name</Label>
            <Input id="am-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="One dog allowed" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="am-group">Group</Label>
            <select id="am-group" value={group} onChange={(e) => setGroup(e.target.value as "HIGHLIGHT" | "FACILITY")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="HIGHLIGHT">HIGHLIGHT</option>
              <option value="FACILITY">FACILITY</option>
            </select>
          </div>
          <div className="space-y-2">
            <ImageField label="Image" mediaId={imageMediaId} onChange={setImageMediaId} />
          </div>
          <div className="sm:col-span-4">
            <Button className="rounded-full" disabled={create.isPending || name.trim().length < 2} onClick={() => create.mutate()}>
              {create.isPending ? "Saving…" : "Add feature"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading amenities" />
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No features yet — seed runs automatically on server boot.<div className="mt-4"><Button variant="outline" className="rounded-full" onClick={() => void refetch()}>Retry</Button></div></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(data ?? []).map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.group} · {a.status}</p>
                </div>
                <ConfirmButton title="Delete feature?" description={`${a.name} will be removed.`} pending={remove.isPending} onConfirm={() => remove.mutate(a.id)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default AmenitiesPage;
