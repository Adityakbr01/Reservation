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
  const [floorplanDropOpen, setFloorplanDropOpen] = useState(false);
  const [floorplanSearch, setFloorplanSearch] = useState("");
  const [floorplanMedia, setFloorplanMedia] = useState<Array<{ id: string; url: string; fileName: string }>>([]);
  const [propertyDetailsHtml, setPropertyDetailsHtml] = useState((initial as unknown as Record<string, string | null>)?.propertyDetailsHtml ?? "");
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
  const [hamperHtml, setHamperHtml] = useState(
    (initial as unknown as Record<string, string | null>)?.welcomeHamperHtml ?? "",
  );
  interface NearbyFormRow {
    name: string;
    description: string;
    imageMediaId: string | null;
    url: string;
  }
  const [nearby, setNearby] = useState<NearbyFormRow[]>(
    ((initial as unknown as Record<string, Array<Record<string, string | null>>>)?.nearbyAttractions ?? []).map(
      (a) => ({
        name: (a.name as string) ?? "",
        description: (a.description as string | null) ?? "",
        imageMediaId: (a.imageMediaId as string | null) ?? null,
        url: (a.url as string | null) ?? "",
      }),
    ),
  );
  const [amenityIds, setAmenityIds] = useState<string[]>((initial as unknown as Record<string, string[]>)?.amenityIds ?? []);
  const [amenityOpts, setAmenityOpts] = useState<Array<{ id: string; name: string; group: string }>>([]);
  const [featureTab, setFeatureTab] = useState<"HIGHLIGHT" | "FACILITY">("HIGHLIGHT");

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

  useEffect(() => {
    void apiClient
      .get<ApiEnvelope<Array<{ id: string; url: string; fileName: string }>>>("/admin/media", {
        params: { page: 1, limit: 100 },
      })
      .then(({ data }) => {
        const raw = (data as unknown as { data?: unknown }).data ?? data;
        const items = Array.isArray(raw)
          ? (raw as Array<{ id: string; url: string; fileName: string }>)
          : (((raw as { items?: Array<{ id: string; url: string; fileName: string }> }).items) ?? []);
        setFloorplanMedia(items);
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
      propertyDetailsHtml: propertyDetailsHtml.trim() || null,
      layoutHtml: layoutHtml.trim() || null,
      floorplanMediaIds: floorplanIds.split(",").map((s) => s.trim()).filter(Boolean),
      locationText: locationText.trim() || null,
      surroundingsHtml: surroundingsHtml.trim() || null,
      mapLat: mapLat.trim() ? Number(mapLat) : null,
      mapLng: mapLng.trim() ? Number(mapLng) : null,
      mapEmbedUrl: mapEmbedUrl.trim() || null,
      welcomeHamperIncluded: hamperOn,
      welcomeHamperHtml: hamperHtml.trim() || null,
      nearbyAttractions: nearby
        .filter((row) => row.name.trim().length > 0)
        .slice(0, 8)
        .map((row) => ({
          name: row.name.trim(),
          description: row.description.trim() || null,
          imageMediaId: row.imageMediaId,
          url: row.url.trim() || null,
        })),
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
          <Label>Features &amp; facilities (with images)</Label>
          <div className="flex gap-2" role="tablist" aria-label="Feature categories">
            {(
              [
                { key: "HIGHLIGHT", label: "Highlights" },
                { key: "FACILITY", label: "Facilities" },
              ] as const
            ).map((tab) => {
              const count = amenityOpts.filter((a) => a.group === tab.key).length;
              const selected = amenityIds.filter((id) =>
                amenityOpts.some((a) => a.id === id && a.group === tab.key),
              ).length;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={featureTab === tab.key}
                  variant={featureTab === tab.key ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setFeatureTab(tab.key)}
                >
                  {tab.label} ({selected}/{count})
                </Button>
              );
            })}
          </div>
          <div role="tabpanel" aria-label={featureTab === "HIGHLIGHT" ? "Highlights" : "Facilities"}>
            <div className="grid gap-2 sm:grid-cols-2">
              {amenityOpts
                .filter((a) => a.group === featureTab)
                .map((a) => (
                  <label key={a.id} className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={amenityIds.includes(a.id)}
                      onChange={(e) =>
                        setAmenityIds((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id)))
                      }
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
            </div>
            {amenityOpts.filter((a) => a.group === featureTab).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing here yet — add {featureTab === "HIGHLIGHT" ? "highlights" : "facilities"} on the Features page.
              </p>
            )}
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
        label="Property Details"
        value={propertyDetailsHtml}
        onChange={setPropertyDetailsHtml}
        placeholder="Full property description — paragraphs, headings, lists and links…"
      />
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
        <Label id="rt-floorplan-label">Floorplan images</Label>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            aria-labelledby="rt-floorplan-label"
            aria-expanded={floorplanDropOpen}
            aria-haspopup="listbox"
            onClick={() => {
              setFloorplanSearch("");
              setFloorplanDropOpen((o) => !o);
            }}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm font-normal"
          >
            <span className="truncate text-muted-foreground">Select a floorplan image…</span>
            <span aria-hidden className="ml-2 shrink-0 text-muted-foreground">▾</span>
          </Button>
          {floorplanDropOpen && (
            <>
              <button
                type="button"
                aria-label="Close floorplan picker"
                onClick={() => setFloorplanDropOpen(false)}
                className="fixed inset-0 z-10 cursor-default bg-transparent"
              />
              <div
                role="listbox"
                aria-label="Floorplan images"
                className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-input bg-background shadow-lg"
              >
                <div className="border-b border-border p-2">
                  <Input
                    autoFocus
                    value={floorplanSearch}
                    onChange={(e) => setFloorplanSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setFloorplanDropOpen(false);
                    }}
                    placeholder="Search images…"
                    aria-label="Search floorplan images"
                  />
                </div>
                <ul className="max-h-72 overflow-y-auto p-1">
                  {floorplanMedia
                    .filter((m) =>
                      m.fileName.toLowerCase().includes(floorplanSearch.trim().toLowerCase()),
                    )
                    .map((m) => {
                      const added = floorplanIds
                        .split(",")
                        .map((s) => s.trim())
                        .includes(m.id);
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={added}
                            disabled={added}
                            onClick={() => {
                              setFloorplanIds((prev) => {
                                const list = prev.split(",").map((s) => s.trim()).filter(Boolean);
                                return list.includes(m.id) ? prev : [...list, m.id].join(", ");
                              });
                              setFloorplanDropOpen(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-md p-2 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60"
                          >
                            <img
                              src={m.url}
                              alt=""
                              className="h-11 w-16 shrink-0 rounded border border-border object-cover"
                              loading="lazy"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{m.fileName}</span>
                            {added && (
                              <span className="shrink-0 text-xs font-medium text-success">Added ✓</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  {floorplanMedia.filter((m) =>
                    m.fileName.toLowerCase().includes(floorplanSearch.trim().toLowerCase()),
                  ).length === 0 && (
                    <li className="p-4 text-center text-xs text-muted-foreground">
                      No images match — upload one on the Media page first.
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
        {floorplanIds.split(",").map((s) => s.trim()).filter(Boolean).length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {floorplanIds.split(",").map((s) => s.trim()).filter(Boolean).map((id) => {
              const meta = floorplanMedia.find((m) => m.id === id);
              return (
                <div key={id} className="space-y-1 rounded-lg border border-border p-2">
                  {meta?.url ? (
                    <img
                      src={meta.url}
                      alt={meta.fileName}
                      className="h-24 w-full rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-md bg-muted px-2 text-center font-mono text-[11px] text-muted-foreground">
                      {id}
                    </div>
                  )}
                  <p className="truncate text-[11px] text-muted-foreground">
                    {meta?.fileName ?? id}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setFloorplanIds((prev) =>
                        prev.split(",").map((s) => s.trim()).filter(Boolean).filter((x) => x !== id).join(", "),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Pick from the Media library. Alt text/caption is managed on the media item. Empty = section hidden on the public page.</p>
      </div>
      <div className="space-y-3 rounded-md border border-input p-4">
        <div className="flex items-center gap-2">
          <Switch id="rt-hamper" checked={hamperOn} onCheckedChange={setHamperOn} />
          <Label htmlFor="rt-hamper">Welcome hamper included</Label>
        </div>
        <CkEditorField
          label="Hamper content (rich)"
          value={hamperHtml}
          onChange={setHamperHtml}
          placeholder="Heading, what's inside, links, photos…"
          enableImages
          uploadFolder="hamper"
        />
      </div>

      <div className="space-y-3 rounded-md border border-input p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label>Nearby attractions</Label>
            <p className="text-xs text-muted-foreground">Shown as cards on the public detail page. Empty = section hidden.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={nearby.length >= 8}
            onClick={() => setNearby((rows) => [...rows, { name: "", description: "", imageMediaId: null, url: "" }])}
          >
            Add attraction
          </Button>
        </div>
        {nearby.map((row, index) => (
          <div key={index} className="space-y-2 rounded-md border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`rt-nearby-name-${index}`}>Name</Label>
                <Input
                  id={`rt-nearby-name-${index}`}
                  value={row.name}
                  onChange={(e) =>
                    setNearby((rows) => rows.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))
                  }
                  placeholder="Stonehenge"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`rt-nearby-url-${index}`}>Link URL (optional)</Label>
                <Input
                  id={`rt-nearby-url-${index}`}
                  value={row.url}
                  onChange={(e) =>
                    setNearby((rows) => rows.map((r, i) => (i === index ? { ...r, url: e.target.value } : r)))
                  }
                  placeholder="https://…"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`rt-nearby-desc-${index}`}>Short line (optional)</Label>
              <Input
                id={`rt-nearby-desc-${index}`}
                value={row.description}
                onChange={(e) =>
                  setNearby((rows) => rows.map((r, i) => (i === index ? { ...r, description: e.target.value } : r)))
                }
                placeholder="World heritage site"
                maxLength={300}
              />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <ImageField
                  label="Photo (optional)"
                  mediaId={row.imageMediaId}
                  onChange={(id) =>
                    setNearby((rows) => rows.map((r, i) => (i === index ? { ...r, imageMediaId: id } : r)))
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive"
                onClick={() => setNearby((rows) => rows.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {nearby.length === 0 && (
          <p className="text-xs text-muted-foreground">No attractions yet — add up to 8.</p>
        )}
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
