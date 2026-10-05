import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaPicker } from "@/components/common/MediaPicker";
import { ImageField } from "@/components/common/ImageField";
import { CkEditorField } from "@/components/common/CkEditorField";
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
  const gallerySeed: RoomTypeImage[] =
    initial?.media && initial.media.length > 0
      ? initial.media.map((m) => ({ mediaId: m.mediaId, altText: m.altText, kind: m.kind }))
      : ((initial?.images ?? []) as RoomTypeImage[]);
  const [images, setImages] = useState<RoomTypeImage[]>(gallerySeed);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [layoutHtml, setLayoutHtml] = useState((initial as unknown as Record<string, string | null>)?.layoutHtml ?? "");
  const [locationText, setLocationText] = useState((initial as unknown as Record<string, string | null>)?.locationText ?? "");
  const [surroundingsHtml, setSurroundingsHtml] = useState((initial as unknown as Record<string, string | null>)?.surroundingsHtml ?? "");
  const [mapLat, setMapLat] = useState(
    (initial as unknown as Record<string, number | null>)?.mapLat != null
      ? String((initial as unknown as Record<string, number | null>)?.mapLat)
      : "",
  );
  const [mapLng, setMapLng] = useState(
    (initial as unknown as Record<string, number | null>)?.mapLng != null
      ? String((initial as unknown as Record<string, number | null>)?.mapLng)
      : "",
  );
  const [mapEmbedUrl, setMapEmbedUrl] = useState((initial as unknown as Record<string, string | null>)?.mapEmbedUrl ?? "");
  const [floorplanIds, setFloorplanIds] = useState(((initial as unknown as Record<string, string[]>)?.floorplanMediaIds ?? []).join(","));
  const [bedrooms, setBedrooms] = useState(
    (initial as unknown as Record<string, number | null>)?.bedrooms != null
      ? String((initial as unknown as Record<string, number | null>)?.bedrooms)
      : "",
  );
  const [maxDogs, setMaxDogs] = useState(
    (initial as unknown as Record<string, number | null>)?.maxDogs != null
      ? String((initial as unknown as Record<string, number | null>)?.maxDogs)
      : "",
  );
  const [bathrooms, setBathrooms] = useState(
    (initial as unknown as Record<string, number | null>)?.bathrooms != null
      ? String((initial as unknown as Record<string, number | null>)?.bathrooms)
      : "",
  );
  const [hamperOn, setHamperOn] = useState(Boolean((initial as unknown as Record<string, boolean>)?.welcomeHamperIncluded));
  const [hamperDesc, setHamperDesc] = useState((initial as unknown as Record<string, string | null>)?.welcomeHamperDescription ?? "");
  const [hamperImage, setHamperImage] = useState<string | null>(
    (initial as unknown as Record<string, string | null>)?.welcomeHamperImageMediaId ?? null,
  );
  const [amenityIds, setAmenityIds] = useState<string[]>((initial as unknown as Record<string, string[]>)?.amenityIds ?? []);
  const [amenityOpts, setAmenityOpts] = useState<Array<{ id: string; name: string; group: string }>>([]);

  useEffect(() => {
    void apiClient
      .get<ApiEnvelope<Array<{ id: string; name: string; group: string }>>>("/admin/amenities", {
        params: { page: 1, limit: 100 },
      })
      .then(({ data }) => {
        const raw = (data as unknown as { data?: unknown }).data ?? data;
        if (Array.isArray(raw)) setAmenityOpts(raw as Array<{ id: string; name: string; group: string }>);
        else if (raw && typeof raw === "object" && "items" in (raw as object)) {
          setAmenityOpts(((raw as { items: Array<{ id: string; name: string; group: string }> }).items) ?? []);
        }
      })
      .catch(() => undefined);
  }, []);

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

  function moveImage(index: number, dir: -1 | 1) {
    setImages((rows) => {
      const next = [...rows];
      const target = index + dir;
      if (target < 0 || target >= next.length) return rows;
      const [m] = next.splice(index, 1);
      if (!m) return rows;
      next.splice(target, 0, m);
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    const gallery = images.map((img, index) => ({
      mediaId: img.mediaId,
      kind: ((img as { kind?: string }).kind === "video" ? "video" : "image") as "image" | "video",
      altText: img.altText?.trim() || null,
      sortOrder: index,
    }));
    onSubmit({
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
      shortDescription: shortDescription.trim() || null,
      description: description.trim() || null,
      maxAdults: Math.max(1, Number(maxAdults) || 1),
      maxChildren: Math.max(0, Number(maxChildren) || 0),
      maxOccupancy: Math.max(1, Number(maxOccupancy) || 1),
      ...(bedrooms.trim() ? { bedrooms: Math.max(0, Number(bedrooms) || 0) } : { bedrooms: null }),
      ...(maxDogs.trim() ? { maxDogs: Math.max(0, Number(maxDogs) || 0) } : { maxDogs: null }),
      ...(bathrooms.trim() ? { bathrooms: Math.max(0, Number(bathrooms) || 0) } : { bathrooms: null }),
      beds: beds.filter((bed) => bed.type.trim().length > 0),
      amenities: amenities
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      images: gallery.filter((g) => g.kind === "image").map((g, i) => ({ mediaId: g.mediaId, altText: g.altText, sortOrder: i })),
      media: gallery,
      layoutHtml: layoutHtml.trim() || null,
      floorplanMediaIds: floorplanIds.split(",").map((s) => s.trim()).filter(Boolean),
      locationText: locationText.trim() || null,
      surroundingsHtml: surroundingsHtml.trim() || null,
      mapLat: mapLat.trim() ? Number(mapLat) : null,
      mapLng: mapLng.trim() ? Number(mapLng) : null,
      mapEmbedUrl: mapEmbedUrl.trim() || null,
      welcomeHamperIncluded: hamperOn,
      welcomeHamperDescription: hamperDesc.trim() || null,
      welcomeHamperImageMediaId: hamperImage,
      amenityIds,
      status,
    } as CreateRoomTypePayload);
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

      <div className="grid gap-4 sm:grid-cols-5">
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
        <div className="space-y-2">
          <Label htmlFor="rt-bedrooms">Bedrooms</Label>
          <Input id="rt-bedrooms" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-dogs">Max dogs</Label>
          <Input id="rt-dogs" type="number" min={0} value={maxDogs} onChange={(e) => setMaxDogs(e.target.value)} placeholder="1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-bathrooms">Bathrooms</Label>
          <Input id="rt-bathrooms" type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="1" />
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

      {amenityOpts.length > 0 && (
        <div className="space-y-2">
          <Label>Features & facilities (with images)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {amenityOpts.map((a) => (
              <label key={a.id} className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={amenityIds.includes(a.id)}
                  onChange={(e) =>
                    setAmenityIds((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id)))
                  }
                />
                <span>{a.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a.group}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label>Gallery — images & video (use ← → to adjust position)</Label>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((img, index) => (
              <div key={`${img.mediaId}-${index}`} className="space-y-1 rounded-lg border border-border p-2">
                {(img as { kind?: string }).kind === "video" ? (
                  <video src={img.url ?? undefined} className="h-24 w-full rounded-md bg-black object-cover" controls preload="metadata" />
                ) : img.url ? (
                  <img src={img.url} alt={img.altText ?? ""} className="h-24 w-full rounded-md object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                    {img.mediaId.slice(-6)}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {(img as { kind?: string }).kind === "video" ? "Video" : "Image"} · position {index + 1}
                </p>
                <Input
                  value={img.altText ?? ""}
                  onChange={(e) =>
                    setImages((rows) => rows.map((r, i) => (i === index ? { ...r, altText: e.target.value } : r)))
                  }
                  placeholder="Alt text"
                  aria-label={`Alt text for media ${index + 1}`}
                />
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="Move earlier">
                    ←
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label="Move later">
                    →
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
          Add photo / video
        </Button>
        <MediaPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(media) =>
            setImages((rows) => [...rows, { mediaId: media.id, url: media.url, altText: null } as RoomTypeImage])
          }
        />
      </div>

      <CkEditorField
        label="Layout"
        value={layoutHtml}
        onChange={setLayoutHtml}
        placeholder="Ground floor: kitchen, lounge…"
      />
      <div className="space-y-2">
        <Label htmlFor="rt-location">Location</Label>
        <textarea id="rt-location" value={locationText} onChange={(e) => setLocationText(e.target.value)} rows={3} placeholder="Village, near pub…" className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      </div>
      <CkEditorField
        label="Surrounding local area"
        value={surroundingsHtml}
        onChange={setSurroundingsHtml}
        placeholder="Walks, golf, Stonehenge… Use bold for place names."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rt-lat">Map latitude</Label>
          <Input id="rt-lat" value={mapLat} onChange={(e) => setMapLat(e.target.value)} placeholder="51.05" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-lng">Map longitude</Label>
          <Input id="rt-lng" value={mapLng} onChange={(e) => setMapLng(e.target.value)} placeholder="-1.45" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-embed">Map embed URL (OSM)</Label>
          <Input id="rt-embed" value={mapEmbedUrl} onChange={(e) => setMapEmbedUrl(e.target.value)} placeholder="https://www.openstreetmap.org/export/embed.html?…" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rt-floorplan">Floorplan media IDs (comma separated)</Label>
        <Input id="rt-floorplan" value={floorplanIds} onChange={(e) => setFloorplanIds(e.target.value)} placeholder="Paste media IDs" />
      </div>
      <div className="space-y-3 rounded-md border border-input p-4">
        <div className="flex items-center gap-2">
          <Switch id="rt-hamper" checked={hamperOn} onCheckedChange={setHamperOn} />
          <Label htmlFor="rt-hamper">Welcome hamper included</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-hamper-desc">Hamper description</Label>
          <textarea id="rt-hamper-desc" value={hamperDesc} onChange={(e) => setHamperDesc(e.target.value)} rows={2} placeholder="Local cheese, bread, wine…" className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <ImageField label="Hamper image" mediaId={hamperImage} onChange={setHamperImage} />
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
