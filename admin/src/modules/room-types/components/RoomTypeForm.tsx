import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaPicker } from "@/components/common/MediaPicker";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type {
  CreateRoomTypePayload,
  RoomType,
  RoomTypeBed,
  RoomTypeImage,
  RoomTypeStatus,
} from "../types/room-type.types";

interface RoomTypeFormProps {
  initial?: RoomType;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (payload: CreateRoomTypePayload) => void;
}

export function RoomTypeForm({ initial, submitLabel, isPending, onSubmit }: RoomTypeFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [maxAdults, setMaxAdults] = useState(String(initial?.maxAdults ?? 2));
  const [maxChildren, setMaxChildren] = useState(String(initial?.maxChildren ?? 0));
  const [maxOccupancy, setMaxOccupancy] = useState(String(initial?.maxOccupancy ?? 2));
  const [amenities, setAmenities] = useState((initial?.amenities ?? []).join(", "));
  const [status, setStatus] = useState<RoomTypeStatus>(initial?.status ?? "DRAFT");
  const [beds, setBeds] = useState<RoomTypeBed[]>(
    initial?.beds.length ? initial.beds : [{ type: "", quantity: 1 }],
  );
  const [images, setImages] = useState<RoomTypeImage[]>(initial?.images ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Initial images carry mediaId only — resolve thumbnails once.
  useEffect(() => {
    const missing = images.filter((img) => !img.url).map((img) => img.mediaId);
    if (missing.length === 0) return;
    let cancelled = false;
    void apiClient
      .get<ApiEnvelope<Array<{ id: string; url: string }>>>("/admin/media/resolve", {
        params: { ids: missing.join(",") },
      })
      .then(({ data }) => {
        if (cancelled) return;
        const urls = new Map(data.data.map((m) => [m.id, m.url]));
        setImages((rows) => rows.map((img) => ({ ...img, url: urls.get(img.mediaId) ?? null })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalid = name.trim().length < 2;

  function updateBed(index: number, patch: Partial<RoomTypeBed>) {
    setBeds((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    onSubmit({
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
      shortDescription: shortDescription.trim() || null,
      description: description.trim() || null,
      maxAdults: Math.max(1, Number(maxAdults) || 1),
      maxChildren: Math.max(0, Number(maxChildren) || 0),
      maxOccupancy: Math.max(1, Number(maxOccupancy) || 1),
      beds: beds.filter((bed) => bed.type.trim().length > 0),
      amenities: amenities
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      images: images.map((img, index) => ({
        mediaId: img.mediaId,
        altText: img.altText?.trim() || null,
        sortOrder: index,
      })),
      status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rt-name">Name</Label>
          <Input
            id="rt-name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deluxe Room"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-slug">Slug (optional)</Label>
          <Input
            id="rt-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Auto-generated from name"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rt-adults">Max adults</Label>
          <Input
            id="rt-adults"
            type="number"
            required
            min={1}
            value={maxAdults}
            onChange={(e) => setMaxAdults(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-children">Max children</Label>
          <Input
            id="rt-children"
            type="number"
            required
            min={0}
            value={maxChildren}
            onChange={(e) => setMaxChildren(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-occupancy">Max occupancy</Label>
          <Input
            id="rt-occupancy"
            type="number"
            required
            min={1}
            value={maxOccupancy}
            onChange={(e) => setMaxOccupancy(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rt-short">Short description</Label>
        <Input
          id="rt-short"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="One-line highlight"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rt-desc">Description</Label>
        <textarea
          id="rt-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Full room description"
          className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-3">
        <Label>Beds</Label>
        {beds.map((bed, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={bed.type}
              onChange={(e) => updateBed(index, { type: e.target.value })}
              placeholder="King bed"
              aria-label={`Bed ${index + 1} type`}
            />
            <Input
              type="number"
              min={1}
              value={bed.quantity}
              onChange={(e) => updateBed(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
              className="w-24"
              aria-label={`Bed ${index + 1} quantity`}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={beds.length <= 1}
              onClick={() => setBeds((rows) => rows.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setBeds((rows) => [...rows, { type: "", quantity: 1 }])}
        >
          Add bed
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rt-amenities">Amenities (comma separated)</Label>
        <Input
          id="rt-amenities"
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          placeholder="WiFi, AC, Sea view"
        />
      </div>

      <div className="space-y-3">
        <Label>Photos</Label>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((img, index) => (
              <div key={`${img.mediaId}-${index}`} className="space-y-1 rounded-lg border border-border p-2">
                {img.url ? (
                  <img src={img.url} alt={img.altText ?? ""} className="h-24 w-full rounded-md object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                    {img.mediaId.slice(-6)}
                  </div>
                )}
                <Input
                  value={img.altText ?? ""}
                  onChange={(e) =>
                    setImages((rows) => rows.map((r, i) => (i === index ? { ...r, altText: e.target.value } : r)))
                  }
                  placeholder="Alt text"
                  aria-label={`Alt text for photo ${index + 1}`}
                />
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => setImages((rows) => { const next = [...rows]; const [m] = next.splice(index, 1); next.splice(index - 1, 0, m); return next; })} aria-label="Move photo left">
                    ←
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setImages((rows) => rows.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setPickerOpen(true)}>
          Add photo
        </Button>
        <MediaPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(media) =>
            setImages((rows) => [...rows, { mediaId: media.id, url: media.url, altText: null }])
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border border-input px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="rt-active">Active</Label>
          <p className="text-xs text-muted-foreground">On: bookable · Off: hidden from customers</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <Switch
            id="rt-active"
            checked={status === "ACTIVE"}
            onCheckedChange={(on) => setStatus(on ? "ACTIVE" : "INACTIVE")}
            aria-label="Active"
          />
        </div>
      </div>

      <Button type="submit" className="h-11 rounded-full px-8" disabled={isPending || invalid}>
        {isPending ? (
          <>
            <Loader className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">Saving…</span>
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
