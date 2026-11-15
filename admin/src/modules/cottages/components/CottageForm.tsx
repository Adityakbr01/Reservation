import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, Loader, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageField } from "@/components/common/ImageField";
import { MediaPicker } from "@/components/common/MediaPicker";
import { CkEditorField } from "@/components/common/CkEditorField";
import { RichTextEditor } from "@/modules/cms/components/RichTextEditor";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getCurrencySymbol } from "@/lib/money";
import { apiClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type {
  CreateCottagePayload,
  Cottage,
  CottageExtra,
  // CottageBed,
  CottageImage,
  CottageSectionSettings,
  CottageStatus,
} from "../types/cottage.types";

function toBool(val: unknown, fallback = true): boolean {
  if (val === undefined || val === null) return fallback;
  if (val === false || val === 0 || val === "false" || val === "0") return false;
  if (val === true || val === 1 || val === "true" || val === "1") return true;
  return fallback;
}

function parseSettings(val: unknown): CottageSectionSettings | null {
  if (!val) return null;
  if (typeof val === "object") return val as CottageSectionSettings;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as CottageSectionSettings;
    } catch {
      return null;
    }
  }
  return null;
}

interface CottageFormProps {
  initial?: Cottage;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (payload: CreateCottagePayload) => void;
}

export function CottageForm({
  initial,
  submitLabel,
  isPending,
  onSubmit,
}: CottageFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(initial?.slug),
  );

  function handleNameChange(newName: string) {
    setName(newName);
    if (!slugManuallyEdited) {
      const auto = newName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(auto);
    }
  }

  function handleSlugChange(newSlug: string) {
    setSlug(newSlug);
    setSlugManuallyEdited(newSlug.trim().length > 0);
  }
  const initAny = initial as unknown as Record<string, unknown> | undefined;
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? (initAny?.short_description as string | undefined) ?? "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [middleDescription, setMiddleDescription] = useState(
    initial?.middleDescription ?? (initAny?.middle_description as string | undefined) ?? "",
  );
  const [aboutHeading, setAboutHeading] = useState(
    initial?.aboutHeading ?? (initAny?.about_heading as string | undefined) ?? "",
  );
  const [aboutText, setAboutText] = useState(
    initial?.aboutText ?? (initAny?.about_text as string | undefined) ?? "",
  );
  const [aboutImageMediaId, setAboutImageMediaId] = useState<string | null>(
    initial?.aboutImageMediaId ?? (initAny?.about_image_media_id as string | undefined) ?? null,
  );
  const [overviewBullets, setOverviewBullets] = useState<string[]>(
    initial?.overviewBullets ?? (initAny?.overview_bullets as string[] | undefined) ?? [],
  );
  const [newBulletText, setNewBulletText] = useState("");

  const rawSettings =
    parseSettings(initial?.sectionSettings) ??
    parseSettings(
      (initial as unknown as { section_settings?: unknown })?.section_settings,
    );

  const [sectionSettings, setSectionSettings] =
    useState<CottageSectionSettings>(() => ({
      showSubtitle: toBool(rawSettings?.showSubtitle, true),
      showMiddleDescription: toBool(rawSettings?.showMiddleDescription, true),
      showOverviewBullets: toBool(rawSettings?.showOverviewBullets, true),
      showAboutImage: toBool(rawSettings?.showAboutImage, true),
      tabs: {
        overview: toBool(rawSettings?.tabs?.overview, true),
        availability: toBool(rawSettings?.tabs?.availability, true),
        propertyDetails: toBool(
          rawSettings?.tabs?.propertyDetails ??
            (rawSettings?.tabs as Record<string, unknown> | undefined)?.property_details,
          true,
        ),
        layout: toBool(rawSettings?.tabs?.layout, true),
        location: toBool(rawSettings?.tabs?.location, true),
        reviews: toBool(rawSettings?.tabs?.reviews, true),
      },
    }));

  function addBullet() {
    if (!newBulletText.trim()) return;
    setOverviewBullets((prev) => [...prev, newBulletText.trim()]);
    setNewBulletText("");
  }

  function removeBullet(index: number) {
    setOverviewBullets((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBullet(index: number, direction: "up" | "down") {
    setOverviewBullets((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  function updateBullet(index: number, val: string) {
    setOverviewBullets((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  }
  const [maxAdults, setMaxAdults] = useState(String(initial?.maxAdults ?? 2));
  const [maxChildren, setMaxChildren] = useState(
    String(initial?.maxChildren ?? 0),
  );
  const [maxOccupancy, setMaxOccupancy] = useState(
    String(
      initial?.maxOccupancy ??
        (initial ? initial.maxAdults + initial.maxChildren : 2),
    ),
  );
  const [isOccupancyCustom, setIsOccupancyCustom] = useState(
    Boolean(
      initial &&
      initial.maxOccupancy !== initial.maxAdults + initial.maxChildren,
    ),
  );

  function handleAdultsChange(val: string) {
    setMaxAdults(val);
    if (!isOccupancyCustom) {
      const a = parseInt(val, 10) || 0;
      const c = parseInt(maxChildren, 10) || 0;
      setMaxOccupancy(String(Math.max(1, a + c)));
    }
  }

  function handleChildrenChange(val: string) {
    setMaxChildren(val);
    if (!isOccupancyCustom) {
      const a = parseInt(maxAdults, 10) || 0;
      const c = parseInt(val, 10) || 0;
      setMaxOccupancy(String(Math.max(1, a + c)));
    }
  }

  function handleOccupancyChange(val: string) {
    setMaxOccupancy(val);
    setIsOccupancyCustom(true);
  }
  // const [amenities, setAmenities] = useState(
  //   (initial?.amenities ?? []).join(", "),
  // );
  const [status, setStatus] = useState<CottageStatus>(
    initial?.status ?? "DRAFT",
  );
  const [basePrice, setBasePrice] = useState(
    initial?.basePrice != null
      ? String(initial.basePrice)
      : initial?.base_price != null
        ? String(initial.base_price)
        : "150",
  );
  // const [beds, setBeds] = useState<CottageBed[]>(
  //   initial?.beds.length ? initial.beds : [{ type: "", quantity: 1 }],
  // );
  const gallerySeed: CottageImage[] =
    initial?.media && initial.media.length > 0
      ? initial.media.map((m) => ({
          mediaId: m.mediaId,
          altText: m.altText,
          kind: m.kind,
        }))
      : ((initial?.images ?? []) as CottageImage[]);
  const [images, setImages] = useState<CottageImage[]>(gallerySeed);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [floorplanDropOpen, setFloorplanDropOpen] = useState(false);
  const [floorplanSearch, setFloorplanSearch] = useState("");
  const [floorplanMedia, setFloorplanMedia] = useState<
    Array<{ id: string; url: string; fileName: string }>
  >([]);
  const [propertyDetailsHtml, setPropertyDetailsHtml] = useState(
    (initial as unknown as Record<string, string | null>)
      ?.propertyDetailsHtml ?? "",
  );
  const [layoutHtml, setLayoutHtml] = useState(
    (initial as unknown as Record<string, string | null>)?.layoutHtml ?? "",
  );
  const [locationText, setLocationText] = useState(
    (initial as unknown as Record<string, string | null>)?.locationText ?? "",
  );
  const [surroundingsHtml, setSurroundingsHtml] = useState(
    (initial as unknown as Record<string, string | null>)?.surroundingsHtml ??
      "",
  );
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
  const [mapEmbedUrl, setMapEmbedUrl] = useState(
    (initial as unknown as Record<string, string | null>)?.mapEmbedUrl ?? "",
  );
  const [floorplanIds, setFloorplanIds] = useState(
    (
      (initial as unknown as Record<string, string[]>)?.floorplanMediaIds ?? []
    ).join(","),
  );
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
  const [dogPolicyEnabled, setDogPolicyEnabled] = useState<boolean>(() => {
    const rawAny = initial as unknown as Record<string, unknown> | undefined;
    if (rawAny?.dogPolicyEnabled !== undefined) return Boolean(rawAny.dogPolicyEnabled);
    if (rawAny?.dog_policy_enabled !== undefined) return Boolean(rawAny.dog_policy_enabled);
    const d = rawAny?.maxDogs ?? rawAny?.max_dogs;
    return d != null && Number(d) > 0;
  });
  const [dogPolicyTitle, setDogPolicyTitle] = useState(
    (initial as unknown as Record<string, string | null>)?.dogPolicyTitle ??
      (initial as unknown as Record<string, string | null>)?.dog_policy_title ??
      "",
  );
  const [dogPolicySubtitle, setDogPolicySubtitle] = useState(
    (initial as unknown as Record<string, string | null>)?.dogPolicySubtitle ??
      (initial as unknown as Record<string, string | null>)?.dog_policy_subtitle ??
      "",
  );
  const [dogFee, setDogFee] = useState(() => {
    const rawAny = initial as unknown as Record<string, number | null> | undefined;
    if (rawAny?.dogFee != null) return String(rawAny.dogFee);
    if (rawAny?.dog_fee != null) return String(rawAny.dog_fee);
    return "70";
  });
  const [dogPolicyImageMediaId, setDogPolicyImageMediaId] = useState<string | null>(
    (initial as unknown as Record<string, string | null>)?.dogPolicyImageMediaId ??
      (initial as unknown as Record<string, string | null>)?.dog_policy_image_media_id ??
      null,
  );
  const [bathrooms, setBathrooms] = useState(
    (initial as unknown as Record<string, number | null>)?.bathrooms != null
      ? String((initial as unknown as Record<string, number | null>)?.bathrooms)
      : "",
  );
  const [hamperOn, setHamperOn] = useState(
    Boolean(
      (initial as unknown as Record<string, boolean>)?.welcomeHamperIncluded,
    ),
  );
  const [hamperHtml, setHamperHtml] = useState(
    (initial as unknown as Record<string, string | null>)?.welcomeHamperHtml ??
      "",
  );
  const [amenityIds, setAmenityIds] = useState<string[]>(
    (initial as unknown as Record<string, string[]>)?.amenityIds ?? [],
  );
  const [amenityOpts, setAmenityOpts] = useState<
    Array<{ id: string; name: string; group: string }>
  >([]);
  const [featureTab, setFeatureTab] = useState<"HIGHLIGHT" | "FACILITY">(
    "HIGHLIGHT",
  );

  const [extras, setExtras] = useState<CottageExtra[]>(() => {
    const raw = (initial as unknown as { extras?: CottageExtra[] })?.extras;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((item, idx) => ({
        id: item.id || `extra_${Date.now()}_${idx}`,
        title: item.title || "",
        description: item.description || "",
        price: Number(item.price ?? 0),
        pricingType: item.pricingType === "PER_STAY" ? "PER_STAY" : "PER_PERSON",
        imageMediaId: item.imageMediaId || (item as any).image_media_id || null,
        imageUrl: item.imageUrl || (item as any).image_url || null,
      }));
    }
    return [];
  });

  function handleAddExtra() {
    const newId = `extra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setExtras((prev) => [
      ...prev,
      {
        id: newId,
        title: "",
        description: "",
        price: 0,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
      },
    ]);
  }

  function handleUpdateExtra(id: string, updates: Partial<CottageExtra>) {
    setExtras((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex)),
    );
  }

  function handleRemoveExtra(id: string) {
    setExtras((prev) => prev.filter((ex) => ex.id !== id));
  }

  function handleMoveExtra(index: number, direction: "up" | "down") {
    setExtras((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  function handleLoadDefaultExtras() {
    setExtras([
      {
        id: "extra_golf",
        title: "A round of golf",
        description: "£60 per adult · illustrative price",
        price: 60,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
      },
      {
        id: "extra_padel",
        title: "Time on the padel court",
        description: "£40 per court session · illustrative price",
        price: 40,
        pricingType: "PER_STAY",
        imageMediaId: null,
        imageUrl: null,
      },
      {
        id: "extra_lunch",
        title: "Lunch at the clubhouse",
        description: "£25 per adult · illustrative price",
        price: 25,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
      },
      {
        id: "extra_dinner",
        title: "An evening around the table",
        description: "£35 per adult · illustrative price",
        price: 35,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
      },
    ]);
  }

  useEffect(() => {
    void apiClient
      .get<ApiEnvelope<Array<{ id: string; name: string; group: string }>>>(
        "/admin/amenities",
        {
          params: { page: 1, limit: 100 },
        },
      )
      .then(({ data }) => {
        const raw = (data as unknown as { data?: unknown }).data ?? data;
        if (Array.isArray(raw))
          setAmenityOpts(
            raw as Array<{ id: string; name: string; group: string }>,
          );
        else if (raw && typeof raw === "object" && "items" in (raw as object)) {
          setAmenityOpts(
            (
              raw as {
                items: Array<{ id: string; name: string; group: string }>;
              }
            ).items ?? [],
          );
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void apiClient
      .get<ApiEnvelope<Array<{ id: string; url: string; fileName: string }>>>(
        "/admin/media",
        {
          params: { page: 1, limit: 100 },
        },
      )
      .then(({ data }) => {
        const raw = (data as unknown as { data?: unknown }).data ?? data;
        const items = Array.isArray(raw)
          ? (raw as Array<{ id: string; url: string; fileName: string }>)
          : ((
              raw as {
                items?: Array<{ id: string; url: string; fileName: string }>;
              }
            ).items ?? []);
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
      .get<ApiEnvelope<Array<{ id: string; url: string }>>>(
        "/admin/media/resolve",
        {
          params: { ids: missing.join(",") },
        },
      )
      .then(({ data }) => {
        if (cancelled) return;
        const urls = new Map(data.data.map((m) => [m.id, m.url]));
        setImages((rows) =>
          rows.map((img) => ({ ...img, url: urls.get(img.mediaId) ?? null })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalid = name.trim().length < 2;

  // function updateBed(index: number, patch: Partial<CottageBed>) {
  //   setBeds((rows) =>
  //     rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  //   );
  // }

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
      kind: ((img as { kind?: string }).kind === "video"
        ? "video"
        : "image") as "image" | "video",
      altText: img.altText?.trim() || null,
      sortOrder: index,
    }));
    const autoSlug =
      slug.trim().toLowerCase() ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    onSubmit({
      name: name.trim(),
      slug: autoSlug,
      shortDescription: shortDescription.trim() || null,
      short_description: shortDescription.trim() || null,
      description: description.trim() || null,
      middleDescription: middleDescription.trim() || null,
      middle_description: middleDescription.trim() || null,
      aboutHeading: aboutHeading.trim() || null,
      about_heading: aboutHeading.trim() || null,
      aboutText: aboutText.trim() || null,
      about_text: aboutText.trim() || null,
      aboutImageMediaId: aboutImageMediaId || null,
      about_image_media_id: aboutImageMediaId || null,
      overviewBullets: overviewBullets.map((b) => b.trim()).filter(Boolean),
      overview_bullets: overviewBullets.map((b) => b.trim()).filter(Boolean),
      sectionSettings,
      section_settings: sectionSettings,
      maxAdults: Math.max(1, Number(maxAdults) || 2),
      max_adults: Math.max(1, Number(maxAdults) || 2),
      maxChildren: Math.max(0, Number(maxChildren) || 0),
      max_children: Math.max(0, Number(maxChildren) || 0),
      maxOccupancy: Math.max(1, Number(maxOccupancy) || 2),
      max_occupancy: Math.max(1, Number(maxOccupancy) || 2),
      ...(bedrooms.trim()
        ? { bedrooms: Math.max(0, Number(bedrooms) || 0) }
        : { bedrooms: null }),
      ...(maxDogs.trim()
        ? {
            maxDogs: Math.max(0, Number(maxDogs) || 0),
            max_dogs: Math.max(0, Number(maxDogs) || 0),
          }
        : { maxDogs: null, max_dogs: null }),
      dogPolicyEnabled,
      dog_policy_enabled: dogPolicyEnabled,
      dogPolicyTitle: dogPolicyTitle.trim() || null,
      dog_policy_title: dogPolicyTitle.trim() || null,
      dogPolicySubtitle: dogPolicySubtitle.trim() || null,
      dog_policy_subtitle: dogPolicySubtitle.trim() || null,
      dogFee: dogFee.trim() ? Math.max(0, Number(dogFee) || 0) : 70,
      dog_fee: dogFee.trim() ? Math.max(0, Number(dogFee) || 0) : 70,
      dogPolicyImageMediaId,
      dog_policy_image_media_id: dogPolicyImageMediaId,
      extras: extras.filter((ex) => ex.title.trim().length > 0),
      ...(bathrooms.trim()
        ? { bathrooms: Math.max(0, Number(bathrooms) || 0) }
        : { bathrooms: null }),
      // beds: beds.filter((bed) => bed.type.trim().length > 0),
      // amenities: amenities
      //   .split(",")
      //   .map((item) => item.trim())
      //   .filter((item) => item.length > 0),
      // images: gallery
      //   .filter((g) => g.kind === "image")
      //   .map((g, i) => ({
      //     mediaId: g.mediaId,
      //     altText: g.altText,
      //     sortOrder: i,
      //   })),
      media: gallery,
      propertyDetailsHtml: propertyDetailsHtml.trim() || null,
      property_details_html: propertyDetailsHtml.trim() || null,
      layoutHtml: layoutHtml.trim() || null,
      layout_html: layoutHtml.trim() || null,
      floorplanMediaIds: floorplanIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      floorplan_media_ids: floorplanIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      locationText: locationText.trim() || null,
      location_text: locationText.trim() || null,
      surroundingsHtml: surroundingsHtml.trim() || null,
      surroundings_html: surroundingsHtml.trim() || null,
      mapLat: mapLat.trim() ? Number(mapLat) : null,
      map_lat: mapLat.trim() ? Number(mapLat) : null,
      mapLng: mapLng.trim() ? Number(mapLng) : null,
      map_lng: mapLng.trim() ? Number(mapLng) : null,
      mapEmbedUrl: mapEmbedUrl.trim() || null,
      map_embed_url: mapEmbedUrl.trim() || null,
      welcomeHamperIncluded: hamperOn,
      welcome_hamper_included: hamperOn,
      welcomeHamperHtml: hamperHtml.trim() || null,
      welcome_hamper_html: hamperHtml.trim() || null,
      amenityIds,
      amenity_ids: amenityIds,
      basePrice:
        basePrice.trim() !== "" && !isNaN(Number(basePrice))
          ? Math.max(0, Number(basePrice))
          : 150,
      base_price:
        basePrice.trim() !== "" && !isNaN(Number(basePrice))
          ? Math.max(0, Number(basePrice))
          : 150,
      status,
    } as unknown as CreateCottagePayload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rt-name">Cottage Name</Label>
          <Input
            id="rt-name"
            required
            minLength={2}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Oakwood Cottage"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-slug">Slug (Auto-generated)</Label>
          <Input
            id="rt-slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
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
            onChange={(e) => handleAdultsChange(e.target.value)}
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
            onChange={(e) => handleChildrenChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="rt-occupancy">Max occupancy</Label>
            {isOccupancyCustom ? (
              <button
                type="button"
                onClick={() => {
                  setIsOccupancyCustom(false);
                  const a = parseInt(maxAdults, 10) || 0;
                  const c = parseInt(maxChildren, 10) || 0;
                  setMaxOccupancy(String(Math.max(1, a + c)));
                }}
                className="text-[11px] text-brand hover:underline font-medium"
                title="Reset to Auto (Adults + Children)"
              >
                Auto-calc
              </button>
            ) : (
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Auto
              </span>
            )}
          </div>
          <Input
            id="rt-occupancy"
            type="number"
            required
            min={1}
            value={maxOccupancy}
            onChange={(e) => handleOccupancyChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-bedrooms">Bedrooms</Label>
          <Input
            id="rt-bedrooms"
            type="number"
            min={0}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            placeholder="2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-dogs">Max dogs</Label>
          <Input
            id="rt-dogs"
            type="number"
            min={0}
            value={maxDogs}
            onChange={(e) => setMaxDogs(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-bathrooms">Bathrooms</Label>
          <Input
            id="rt-bathrooms"
            type="number"
            min={0}
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-price">
            Base nightly rate ({getCurrencySymbol()})
          </Label>
          <Input
            id="rt-price"
            type="number"
            min={0}
            step="any"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="150"
          />
        </div>
      </div>

      {/* Page Display & Content Control (Top, Middle, Overview Tab) */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Page Display & Narrative Control
          </CardTitle>
          <CardDescription>
            Control the top tagline, middle intro paragraph, and overview tab
            content displayed on the guest cottage page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Top Subtitle / Tagline */}
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="rt-short"
                className="font-semibold text-foreground"
              >
                Top Subtitle / Tagline (Under Title)
              </Label>
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 text-xs font-normal text-muted-foreground cursor-pointer select-none"
                onClick={() =>
                  setSectionSettings((prev) => ({
                    ...prev,
                    showSubtitle: !toBool(prev.showSubtitle, true),
                  }))
                }
              >
                <span>Show on page</span>
                <Switch
                  checked={toBool(sectionSettings.showSubtitle, true)}
                  onCheckedChange={(checked) =>
                    setSectionSettings((prev) => ({
                      ...prev,
                      showSubtitle: checked,
                    }))
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <Input
              id="rt-short"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="e.g. Gather around the dining table, unwind in the open-plan living space..."
            />
            <p className="text-xs text-muted-foreground">
              Displayed in italics directly below the cottage title.
            </p>
          </div>

          {/* Middle Intro Paragraph */}
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="rt-middle-desc"
                className="font-semibold text-foreground"
              >
                Middle Intro Paragraph (Below Stats)
              </Label>
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 text-xs font-normal text-muted-foreground cursor-pointer select-none"
                onClick={() =>
                  setSectionSettings((prev) => ({
                    ...prev,
                    showMiddleDescription: !toBool(prev.showMiddleDescription, true),
                  }))
                }
              >
                <span>Show on page</span>
                <Switch
                  checked={toBool(sectionSettings.showMiddleDescription, true)}
                  onCheckedChange={(checked) =>
                    setSectionSettings((prev) => ({
                      ...prev,
                      showMiddleDescription: checked,
                    }))
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <textarea
              id="rt-middle-desc"
              value={middleDescription}
              onChange={(e) => setMiddleDescription(e.target.value)}
              rows={3}
              placeholder="Distinct summary shown below the guests, bedrooms & bathrooms badges. (If empty, falls back to description)"
              className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Shown directly underneath the bedroom / bathroom icons. Set custom
              text here to avoid repeating the Overview tab text.
            </p>
          </div>

          {/* General Description / Fallback */}
          <div className="space-y-2">
            <Label htmlFor="rt-desc" className="font-semibold text-foreground">
              General Description
            </Label>
            <textarea
              id="rt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Standard cottage description used as fallback or metadata"
              className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Overview / About Tab Section */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
            <h3 className="font-semibold text-foreground">
              Overview Tab ("About Stay") Content
            </h3>

            <div className="space-y-2">
              <Label htmlFor="rt-about-heading">About Section Heading</Label>
              <Input
                id="rt-about-heading"
                value={aboutHeading}
                onChange={(e) => setAboutHeading(e.target.value)}
                placeholder={`About ${name || "this cottage"}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rt-about-text">
                About Section Narrative Text
              </Label>
              <textarea
                id="rt-about-text"
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={4}
                placeholder="Detailed narrative describing the cottage interior, charm, and living spaces..."
                className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Overview Bullets Manager */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium text-foreground">
                  Overview Bullet Points
                </Label>
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 text-xs font-normal text-muted-foreground cursor-pointer select-none"
                  onClick={() =>
                    setSectionSettings((prev) => ({
                      ...prev,
                      showOverviewBullets: !toBool(prev.showOverviewBullets, true),
                    }))
                  }
                >
                  <span>Show bullets</span>
                  <Switch
                    checked={toBool(sectionSettings.showOverviewBullets, true)}
                    onCheckedChange={(checked) =>
                      setSectionSettings((prev) => ({
                        ...prev,
                        showOverviewBullets: checked,
                      }))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Custom highlights displayed with checkmarks next to the About
                description. (If empty, smart defaults like bedrooms and pet
                policy are shown).
              </p>

              <div className="space-y-2 pt-1">
                {overviewBullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={bullet}
                      onChange={(e) => updateBullet(idx, e.target.value)}
                      placeholder="e.g. Spacious dining area seating 6 comfortably"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-full shrink-0"
                      disabled={idx === 0}
                      onClick={() => moveBullet(idx, "up")}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-full shrink-0"
                      disabled={idx === overviewBullets.length - 1}
                      onClick={() => moveBullet(idx, "down")}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeBullet(idx)}
                      aria-label="Remove bullet"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newBulletText}
                    onChange={(e) => setNewBulletText(e.target.value)}
                    placeholder="Type new bullet point..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBullet();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full gap-1.5 shrink-0"
                    onClick={addBullet}
                  >
                    <Plus className="size-4" />
                    Add bullet
                  </Button>
                </div>
              </div>
            </div>

            {/* Overview Image */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="font-medium text-foreground">
                  Overview Photo Card
                </Label>
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 text-xs font-normal text-muted-foreground cursor-pointer select-none"
                  onClick={() =>
                    setSectionSettings((prev) => ({
                      ...prev,
                      showAboutImage: !toBool(prev.showAboutImage, true),
                    }))
                  }
                >
                  <span>Show photo card</span>
                  <Switch
                    checked={toBool(sectionSettings.showAboutImage, true)}
                    onCheckedChange={(checked) =>
                      setSectionSettings((prev) => ({
                        ...prev,
                        showAboutImage: checked,
                      }))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <ImageField
                label="Custom About Photo (Optional — if unset, secondary gallery image is used)"
                mediaId={aboutImageMediaId}
                onChange={(id) => setAboutImageMediaId(id)}
              />
            </div>
          </div>

          {/* Individual Tab Controls ("What comes what not") */}
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
            <Label className="font-semibold text-foreground">
              Visible Page Tabs ("What comes what not")
            </Label>
            <p className="text-xs text-muted-foreground">
              Enable or disable specific tabs for this cottage.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-1">
              {[
                { key: "overview", label: "Overview Tab" },
                { key: "availability", label: "Availability Tab" },
                { key: "propertyDetails", label: "Property Details Tab" },
                { key: "layout", label: "Layout Tab" },
                { key: "location", label: "Location Tab" },
                { key: "reviews", label: "Reviews Tab" },
              ].map(({ key, label }) => {
                const isChecked = toBool(
                  sectionSettings.tabs?.[
                    key as keyof typeof sectionSettings.tabs
                  ],
                  true,
                );
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none"
                    onClick={() =>
                      setSectionSettings((prev) => ({
                        ...prev,
                        tabs: { ...prev.tabs, [key]: !isChecked },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSectionSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, [key]: !isChecked },
                        }));
                      }
                    }}
                  >
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        setSectionSettings((prev) => ({
                          ...prev,
                          tabs: { ...prev.tabs, [key]: checked },
                        }))
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* <div className="space-y-3">
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
              onChange={(e) =>
                updateBed(index, {
                  quantity: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-24"
              aria-label={`Bed ${index + 1} quantity`}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={beds.length <= 1}
              onClick={() =>
                setBeds((rows) => rows.filter((_, i) => i !== index))
              }
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
          onClick={() =>
            setBeds((rows) => [...rows, { type: "", quantity: 1 }])
          }
        >
          Add bed
        </Button>
      </div> */}

      {amenityOpts.length > 0 && (
        <div className="space-y-2">
          <Label>Features &amp; facilities (with images)</Label>
          <div
            className="flex gap-2"
            role="tablist"
            aria-label="Feature categories"
          >
            {(
              [
                { key: "HIGHLIGHT", label: "Highlights" },
                { key: "FACILITY", label: "Facilities" },
              ] as const
            ).map((tab) => {
              const count = amenityOpts.filter(
                (a) => a.group === tab.key,
              ).length;
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
          <div
            role="tabpanel"
            aria-label={
              featureTab === "HIGHLIGHT" ? "Highlights" : "Facilities"
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {amenityOpts
                .filter((a) => a.group === featureTab)
                .map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm"
                  >
                    <Switch
                      checked={amenityIds.includes(a.id)}
                      onCheckedChange={(on) =>
                        setAmenityIds((prev) =>
                          on
                            ? [...prev, a.id]
                            : prev.filter((id) => id !== a.id),
                        )
                      }
                      aria-label={a.name}
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
            </div>
            {amenityOpts.filter((a) => a.group === featureTab).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing here yet — add{" "}
                {featureTab === "HIGHLIGHT" ? "highlights" : "facilities"} on
                the Features page.
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
              <div
                key={`${img.mediaId}-${index}`}
                className="space-y-1 rounded-lg border border-border p-2"
              >
                {(img as { kind?: string }).kind === "video" ? (
                  <video
                    src={img.url ?? undefined}
                    className="h-24 w-full rounded-md bg-black object-cover"
                    controls
                    preload="metadata"
                  />
                ) : img.url ? (
                  <img
                    src={img.url}
                    alt={img.altText ?? ""}
                    className="h-24 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                    {img.mediaId.slice(-6)}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {(img as { kind?: string }).kind === "video"
                    ? "Video"
                    : "Image"}{" "}
                  · position {index + 1}
                </p>
                <Input
                  value={img.altText ?? ""}
                  onChange={(e) =>
                    setImages((rows) =>
                      rows.map((r, i) =>
                        i === index ? { ...r, altText: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="Alt text"
                  aria-label={`Alt text for media ${index + 1}`}
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                    aria-label="Move earlier"
                  >
                    ←
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                    aria-label="Move later"
                  >
                    →
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setImages((rows) => rows.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setPickerOpen(true)}
        >
          Add photo / video
        </Button>
        <MediaPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(media) =>
            setImages((rows) => [
              ...rows,
              {
                mediaId: media.id,
                url: media.url,
                altText: null,
              } as CottageImage,
            ])
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
        <textarea
          id="rt-location"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          rows={3}
          placeholder="Village, near pub…"
          className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
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
          <Input
            id="rt-lat"
            value={mapLat}
            onChange={(e) => setMapLat(e.target.value)}
            placeholder="51.05"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-lng">Map longitude</Label>
          <Input
            id="rt-lng"
            value={mapLng}
            onChange={(e) => setMapLng(e.target.value)}
            placeholder="-1.45"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-embed">Map embed URL (OSM)</Label>
          <Input
            id="rt-embed"
            value={mapEmbedUrl}
            onChange={(e) => setMapEmbedUrl(e.target.value)}
            placeholder="https://www.openstreetmap.org/export/embed.html?…"
          />
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
            <span className="truncate text-muted-foreground">
              Select a floorplan image…
            </span>
            <span aria-hidden className="ml-2 shrink-0 text-muted-foreground">
              ▾
            </span>
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
                      m.fileName
                        .toLowerCase()
                        .includes(floorplanSearch.trim().toLowerCase()),
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
                                const list = prev
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                return list.includes(m.id)
                                  ? prev
                                  : [...list, m.id].join(", ");
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
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {m.fileName}
                            </span>
                            {added && (
                              <span className="shrink-0 text-xs font-medium text-success">
                                Added ✓
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  {floorplanMedia.filter((m) =>
                    m.fileName
                      .toLowerCase()
                      .includes(floorplanSearch.trim().toLowerCase()),
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
        {floorplanIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean).length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {floorplanIds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((id) => {
                const meta = floorplanMedia.find((m) => m.id === id);
                return (
                  <div
                    key={id}
                    className="space-y-1 rounded-lg border border-border p-2"
                  >
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
                          prev
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .filter((x) => x !== id)
                            .join(", "),
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
        <p className="text-xs text-muted-foreground">
          Pick from the Media library. Alt text/caption is managed on the media
          item. Empty = section hidden on the public page.
        </p>
      </div>
      <Card className="border border-input">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Dogs &amp; Pets Policy</CardTitle>
              <CardDescription className="text-xs">
                Manage dog-friendly status, fee, customized card notice, and custom icon
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {dogPolicyEnabled ? "Dogs Welcome" : "No Dogs Allowed"}
              </span>
              <Switch
                id="rt-dog-policy-toggle"
                checked={dogPolicyEnabled}
                onCheckedChange={(val) => {
                  setDogPolicyEnabled(val);
                  if (val && (!maxDogs || Number(maxDogs) === 0)) {
                    setMaxDogs("1");
                  } else if (!val) {
                    setMaxDogs("0");
                  }
                }}
                aria-label="Toggle dogs policy"
              />
            </div>
          </div>
        </CardHeader>
        {dogPolicyEnabled && (
          <CardContent className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rt-max-dogs-policy">Max Dogs Allowed</Label>
                <Input
                  id="rt-max-dogs-policy"
                  type="number"
                  min={1}
                  value={maxDogs || "1"}
                  onChange={(e) => setMaxDogs(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rt-dog-fee">Dog Fee (£ per dog, per stay)</Label>
                <Input
                  id="rt-dog-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={dogFee}
                  onChange={(e) => setDogFee(e.target.value)}
                  placeholder="70"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rt-dog-title">Policy Title (Display on Card)</Label>
              <Input
                id="rt-dog-title"
                value={dogPolicyTitle}
                onChange={(e) => setDogPolicyTitle(e.target.value)}
                placeholder="Dogs welcome · £70 per dog, per stay"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave empty to auto-format: &ldquo;Dogs welcome · £{dogFee || 70} per dog, per stay&rdquo;
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rt-dog-subtitle">Policy Subtitle / Note (Display on Card)</Label>
              <Input
                id="rt-dog-subtitle"
                value={dogPolicySubtitle}
                onChange={(e) => setDogPolicySubtitle(e.target.value)}
                placeholder="Up to 1 dog · added only if you bring a dog"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave empty to auto-format: &ldquo;Up to {maxDogs || 1} dog · added only if you bring a dog&rdquo;
              </p>
            </div>

            <div className="space-y-2">
              <ImageField
                label="Custom Dog Icon / Image (Optional — if unset, default dog line icon is used)"
                mediaId={dogPolicyImageMediaId}
                onChange={(id) => setDogPolicyImageMediaId(id)}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Optional Extras & Activities per Cottage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Optional Extras &amp; Activities</CardTitle>
            <CardDescription className="text-xs">
              Configure optional add-ons available for this cottage (e.g. Golf, Padel, Dining). Admin can add, edit, reorder, or delete extras anytime.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {extras.length === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadDefaultExtras}
              >
                Load Starter Extras
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleAddExtra}
              className="gap-1"
            >
              <Plus className="size-4" /> Add Extra
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {extras.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No extras added yet for this cottage. Click <strong>Add Extra</strong> or <strong>Load Starter Extras</strong> to add options for guests during checkout.
            </div>
          ) : (
            <div className="space-y-4">
              {extras.map((extra, index) => (
                <div
                  key={extra.id}
                  className="rounded-lg border border-border bg-card p-4 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Extra #{index + 1}: {extra.title || "(Untitled)"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === 0}
                        onClick={() => handleMoveExtra(index, "up")}
                        title="Move Up"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === extras.length - 1}
                        onClick={() => handleMoveExtra(index, "down")}
                        title="Move Down"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveExtra(extra.id)}
                        title="Delete Extra"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Title *</Label>
                      <Input
                        value={extra.title}
                        onChange={(e) => handleUpdateExtra(extra.id, { title: e.target.value })}
                        placeholder="e.g. A round of golf"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price ({getCurrencySymbol()}) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={extra.price}
                        onChange={(e) => handleUpdateExtra(extra.id, { price: Math.max(0, parseFloat(e.target.value) || 0) })}
                        placeholder="e.g. 60"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pricing Type</Label>
                      <select
                        value={extra.pricingType}
                        onChange={(e) => handleUpdateExtra(extra.id, { pricingType: e.target.value as "PER_PERSON" | "PER_STAY" })}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="PER_PERSON">Per Person / Adult</option>
                        <option value="PER_STAY">Per Stay / Session</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <RichTextEditor
                      label="Description / Subtitle"
                      compact
                      minHeightClass="min-h-[55px]"
                      value={extra.description || ""}
                      onChange={(html) => handleUpdateExtra(extra.id, { description: html })}
                    />
                  </div>

                  <div className="mt-3">
                    <ImageField
                      label="Extra Photo / Image (Optional)"
                      mediaId={extra.imageMediaId || (extra as any).image_media_id || null}
                      onChange={(id, media) =>
                        handleUpdateExtra(extra.id, {
                          imageMediaId: id,
                          imageUrl: media?.url ?? (id ? extra.imageUrl : null),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3 rounded-md border border-input p-4">
        <div className="flex items-center gap-2">
          <Switch
            id="rt-hamper"
            checked={hamperOn}
            onCheckedChange={setHamperOn}
          />
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

      <div className="flex items-center justify-between gap-4 rounded-md border border-input px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="rt-active">Active</Label>
          <p className="text-xs text-muted-foreground">
            On: bookable · Off: hidden from customers
          </p>
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

      <Button
        type="submit"
        className="h-11 rounded-full px-8"
        disabled={isPending || invalid}
      >
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

export const RoomTypeForm = CottageForm;
