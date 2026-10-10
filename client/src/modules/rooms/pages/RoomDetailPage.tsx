import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Baby,
  BadgePercent,
  Bath,
  BedDouble,
  Bike,
  Bird,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Church,
  CircleParking,
  Dog,
  Flag,
  Flame,
  Footprints,
  Gift,
  Headphones,
  Heart,
  Landmark,
  Leaf,
  Map as MapIcon,
  MapPin,
  Minus,
  PawPrint,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trees,
  Users,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode, Keyboard, Thumbs } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/thumbs";
import "swiper/css/free-mode";
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
import { Skeleton } from "@/components/ui/skeleton";
import { RoomTypeImage } from "@/components/common/RoomTypeImage";
import { LocationMap } from "@/components/common/LocationMap";
import { useMediaUrls } from "@/modules/media";
import {
  AvailabilityCalendar,
  parseAvailabilitySearchParams,
  useAvailabilitySearch,
} from "@/modules/availability";
import {
  fetchAmenities,
  fetchSettings,
} from "@/modules/amenities/api/amenities.api";
import {
  fetchReviews,
  fetchReviewEligibility,
  submitReview,
} from "@/modules/reviews/api/reviews.api";
import { EnquiryForm } from "@/modules/enquiry/components/EnquiryForm";
import { Dialog } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import { fetchRoomOffers } from "../api/rooms.api";
import type { RoomOffer } from "../api/rooms.api";
import { useRoomTypeBySlug } from "../hooks/use-room-type";

function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function osmEmbed(lat: number, lng: number): string {
  const d = 0.02;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function fmtShort(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Server HTML is sanitized; this only makes target=_blank links safe. */
function enhanceRichLinks(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const hasTargetBlank = /target\s*=\s*("|')?_blank\1?/i.test(attrs);
    const hasRel = /rel\s*=/i.test(attrs);
    if (hasTargetBlank && !hasRel)
      return `<a${attrs} rel="noopener noreferrer">`;
    return tag;
  });
}

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "property-details", label: "Property Details" },
  { id: "layout", label: "Layout" },
  { id: "location", label: "Location" },
  { id: "nearby", label: "Nearby" },
  { id: "reviews", label: "Reviews" },
] as const;

function amenityIconFor(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("dog")) return PawPrint;
  if (n.includes("wifi")) return Wifi;
  if (n.includes("park")) return CircleParking;
  if (n.includes("baby")) return Baby;
  if (n.includes("family") || n.includes("child")) return Users;
  if (n.includes("bird")) return Bird;
  if (n.includes("ground") || n.includes("bedroom") || n.includes("bed"))
    return BedDouble;
  if (n.includes("cycl") || n.includes("bik")) return Bike;
  if (n.includes("romant") || n.includes("honey")) return Heart;
  if (n.includes("golf")) return Flag;
  if (n.includes("walk")) return Footprints;
  if (n.includes("garden") || n.includes("plant")) return Leaf;
  if (n.includes("bbq") || n.includes("barbecue") || n.includes("grill"))
    return Flame;
  return Check;
}

function whyIconFor(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (t.includes("local") || t.includes("knowledge")) return MapIcon;
  if (t.includes("propert")) return Building2;
  if (t.includes("quality") || t.includes("check")) return ShieldCheck;
  if (t.includes("satisf") || t.includes("guest")) return Heart;
  if (t.includes("24/7") || t.includes("support")) return Headphones;
  return Sparkles;
}

const ATTRACTION_TILES = [
  "from-emerald-900 via-emerald-700 to-lime-600",
  "from-lime-800 via-green-700 to-emerald-600",
  "from-stone-800 via-stone-600 to-amber-500",
  "from-sky-900 via-slate-700 to-stone-500",
];

function attractionIconFor(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("forest") || n.includes("park") || n.includes("garden"))
    return Trees;
  if (n.includes("golf") || n.includes("club")) return Flag;
  if (n.includes("cathedral") || n.includes("church") || n.includes("abbey"))
    return Church;
  if (
    n.includes("stonehenge") ||
    n.includes("heritage") ||
    n.includes("historic") ||
    n.includes("museum")
  )
    return Landmark;
  return MapPin;
}

export function RoomDetailPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const search = useMemo(() => parseAvailabilitySearchParams(params), [params]);
  const {
    data: roomType,
    isPending: isTypePending,
    isError: isTypeError,
    refetch: refetchType,
  } = useRoomTypeBySlug(slug);
  const { data: availability } = useAvailabilitySearch(search);
  const match = availability?.results.find(
    (item) => item.roomType.slug === slug,
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const mainSwiperRef = useRef<SwiperType | null>(null);
  const thumbsSwiperRef = useRef<SwiperType | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const gallery = useMemo(() => {
    const media = (
      roomType as unknown as {
        media?: Array<{
          mediaId: string;
          kind: string;
          altText: string | null;
          sortOrder: number;
        }>;
      }
    )?.media;
    if (media && media.length > 0)
      return [...media].sort((a, b) => a.sortOrder - b.sortOrder);
    return [...(roomType?.images ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ ...i, kind: "image" }));
  }, [roomType]);
  const mediaIds = useMemo(() => gallery.map((g) => g.mediaId), [gallery]);
  const { data: photos } = useMediaUrls(mediaIds);
  const photoById = useMemo(
    () => new Map((photos ?? []).map((p) => [p.id, p])),
    [photos],
  );

  // Reset to first slide when switching rooms.
  useEffect(() => {
    setGalleryIndex(0);
  }, [slug]);

  // Update swipers once photos finish loading.
  useEffect(() => {
    if (photos && photos.length > 0) {
      mainSwiperRef.current?.update();
      thumbsSwiperRef.current?.update();
    }
  }, [photos]);

  // Keep Swiper Thumbs module connected in case thumbsSwiper mounted after main Swiper.
  useEffect(() => {
    const main = mainSwiperRef.current;
    if (main && thumbsSwiper && !thumbsSwiper.destroyed && main.thumbs) {
      main.thumbs.swiper = thumbsSwiper;
      try {
        main.thumbs.init();
        main.thumbs.update(true);
      } catch {
        // Swiper thumbs internal fallback
      }
    }
  }, [thumbsSwiper]);

  // Wishlist (local, per browser).
  useEffect(() => {
    try {
      setSaved(
        (
          JSON.parse(localStorage.getItem("hs-wishlist") ?? "[]") as string[]
        ).includes(slug),
      );
    } catch {
      setSaved(false);
    }
  }, [slug]);

  // Close the guests popover on Escape.
  useEffect(() => {
    if (!guestsOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setGuestsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [guestsOpen]);

  // Swiper autoplay pauses itself on video slides (see handleGalleryChange).
  function handleGalleryChange(swiper: SwiperType) {
    const idx = swiper.realIndex ?? 0;
    setGalleryIndex(idx);
    try {
      if (gallery[idx]?.kind === "video") swiper.autoplay?.stop();
      else swiper.autoplay?.start();
    } catch {
      // Autoplay module no-op when disabled.
    }
    const thumbs = thumbsSwiperRef.current;
    if (thumbs && !thumbs.destroyed) {
      thumbs.slideTo(idx);
    }
  }

  function handleSelectMedia(index: number) {
    setGalleryIndex(index);
    const main = mainSwiperRef.current;
    if (main && !main.destroyed) {
      if (gallery.length > 1) {
        main.slideToLoop(index);
      } else {
        main.slideTo(index);
      }
    }
    const thumbs = thumbsSwiperRef.current;
    if (thumbs && !thumbs.destroyed) {
      thumbs.slideTo(index);
    }
  }
  const { data: amenities } = useQuery({
    queryKey: ["amenities-public"],
    queryFn: fetchAmenities,
    staleTime: 300_000,
  });
  const { data: settings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: fetchSettings,
    staleTime: 300_000,
  });
  const { data: floorplanPhotos } = useMediaUrls(
    roomType?.floorplanMediaIds ?? [],
  );
  const nearbyList = roomType?.nearbyAttractions ?? [];
  const nearbyIds = useMemo(
    () =>
      nearbyList
        .map((a) => a.imageMediaId)
        .filter((id): id is string => Boolean(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomType?.id],
  );
  const { data: nearbyPhotos } = useMediaUrls(nearbyIds);
  const nearbyPhotoById = useMemo(
    () => new Map((nearbyPhotos ?? []).map((p) => [p.id, p])),
    [nearbyPhotos],
  );
  const sessionUser = useAuthStore((s) => s.user);
  const reviewsQuery = useQuery({
    queryKey: ["reviews", roomType?.id],
    queryFn: () => fetchReviews(roomType?.id as string),
    enabled: !!roomType?.id,
  });
  // Reviews are visible only to signed-in guests with a completed stay here.
  const eligibilityQuery = useQuery({
    queryKey: ["review-eligibility", roomType?.id],
    queryFn: () => fetchReviewEligibility(roomType?.id as string),
    enabled: !!roomType?.id && !!sessionUser,
    staleTime: 300_000,
    retry: false,
  });
  const canReview = !!sessionUser && (eligibilityQuery.data?.eligible ?? false);
  const hasNearby = nearbyList.length > 0 || !!roomType?.surroundingsHtml;
  const hasLayout = !!(
    roomType?.layoutHtml || (floorplanPhotos ?? []).length > 0
  );
  const hasLocation = !!(
    roomType?.locationText ||
    roomType?.mapEmbedUrl ||
    (roomType?.mapLat != null && roomType?.mapLng != null)
  );
  // Proper tabs: only tabs with content are shown; clicking switches the panel.
  const tabs = TABS.filter(
    (t) =>
      (t.id !== "reviews" || canReview) &&
      (t.id !== "nearby" || hasNearby) &&
      (t.id !== "layout" || hasLayout) &&
      (t.id !== "location" || hasLocation) &&
      (t.id !== "property-details" ||
        !!(roomType as { propertyDetailsHtml?: string | null })
          ?.propertyDetailsHtml),
  );
  // If the active tab has no content, fall back to the first available tab.
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? "overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReview, hasNearby, hasLayout, hasLocation, roomType]);
  const [offerOpen, setOfferOpen] = useState(false);
  const { data: offers } = useQuery({
    queryKey: ["room-offers", roomType?.id],
    queryFn: () => fetchRoomOffers(roomType?.id as string),
    enabled: !!roomType?.id,
    staleTime: 300_000,
  });

  function pickDate(date: string) {
    if (picked.length === 0 || (picked.length === 1 && date <= picked[0])) {
      setPicked([date]);
      return;
    }
    if (picked.length === 1) {
      const [checkIn, checkOut] = [picked[0], date];
      setPicked([]);
      const next = new URLSearchParams(params);
      next.set("checkIn", checkIn as string);
      next.set("checkOut", checkOut);
      if (!next.get("adults")) next.set("adults", "2");
      if (!next.get("children")) next.set("children", "0");
      if (!next.get("rooms")) next.set("rooms", "1");
      setParams(next);
    } else {
      setPicked([date]);
    }
  }

  if (isTypePending) {
    return (
      <div
        className="space-y-6 pb-8"
        aria-busy="true"
        aria-label="Loading room details"
      >
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isTypeError || !roomType) {
    return (
      <div className="mx-auto w-full max-w-sm pb-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Room not found</CardTitle>
            <CardDescription>
              This room type does not exist or is unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              className="flex-1 rounded-full"
              onClick={() => void refetchType()}
            >
              Retry
            </Button>
            <Button asChild variant="outline" className="flex-1 rounded-full">
              <Link to="/">Back to search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const linkedAmenities = (roomType.amenityIds ?? [])
    .map((id) => (amenities ?? []).find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const highlights = linkedAmenities.filter(
    (a) => (a.group ?? "HIGHLIGHT") === "HIGHLIGHT",
  );
  const facilities = linkedAmenities.filter(
    (a) => (a.group ?? "HIGHLIGHT") !== "HIGHLIGHT",
  );
  const mapUrl =
    roomType.mapEmbedUrl ||
    (roomType.mapLat != null && roomType.mapLng != null
      ? osmEmbed(roomType.mapLat, roomType.mapLng)
      : null);
  const reviewStats = (reviewsQuery.data ?? { average: 0, count: 0 }) as {
    average: number;
    count: number;
  };
  const propertyDetailsHtml =
    (roomType as { propertyDetailsHtml?: string | null }).propertyDetailsHtml ??
    null;
  const leadRate = match && match.rates.length > 0 ? match.rates[0] : null;
  const stayNights = leadRate?.nightly?.length ?? 0;
  const guestCount = search ? search.adults + search.children : 2;
  const aboutPhoto =
    photoById.get(gallery[1]?.mediaId ?? "") ??
    photoById.get(gallery[0]?.mediaId ?? null);
  const aboutBullets: string[] = [];
  if (roomType.bedrooms != null && roomType.bathrooms != null) {
    aboutBullets.push(
      `${roomType.bedrooms} bedroom${roomType.bedrooms === 1 ? "" : "s"}, ${roomType.bathrooms} bathroom${roomType.bathrooms === 1 ? "" : "s"}`,
    );
  } else {
    aboutBullets.push(`Sleeps up to ${roomType.maxOccupancy} guests`);
  }
  if ((roomType.maxDogs ?? 0) > 0) {
    aboutBullets.push(
      `${roomType.maxDogs === 1 ? "One dog allowed" : `${roomType.maxDogs} dogs allowed`} — ask us about local walks`,
    );
  }
  if (roomType.welcomeHamperIncluded) {
    aboutBullets.push("Welcome hamper included");
  }
  facilities.slice(0, 2).forEach((f) => aboutBullets.push(f.name));

  function toggleSaved() {
    try {
      const raw = JSON.parse(
        localStorage.getItem("hs-wishlist") ?? "[]",
      ) as string[];
      const next = raw.includes(slug)
        ? raw.filter((s) => s !== slug)
        : [...raw, slug];
      localStorage.setItem("hs-wishlist", JSON.stringify(next));
      setSaved(next.includes(slug));
      toast.success(
        next.includes(slug)
          ? "Saved to your wishlist"
          : "Removed from wishlist",
      );
    } catch {
      toast.error("Could not save");
    }
  }

  async function sharePage() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: roomType?.name ?? "Hamptworth Stays",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // Share dismissed — no action needed.
    }
  }

  function setGuestCount(adults: number, children: number) {
    const next = new URLSearchParams(params);
    next.set("adults", String(Math.max(1, Math.min(20, adults))));
    next.set("children", String(Math.max(0, Math.min(20, children))));
    setParams(next);
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Top row: back + offer ··· wishlist + share */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            to="/"
            state={search ? { search } : undefined}
            className="shrink-0 text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            ← Back to search
          </Link>
          {(offers ?? []).length > 0 && (
            <button
              type="button"
              onClick={() => setOfferOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {(offers as RoomOffer[])[0]?.badgeLabel}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleSaved}
            aria-pressed={saved}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            className="rounded-full p-2 text-foreground transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart
              className={`size-5 ${saved ? "fill-rose-600 text-rose-600" : ""}`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => void sharePage()}
            aria-label="Share this stay"
            className="rounded-full p-2 text-foreground transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      <OfferDialog
        offers={(offers as RoomOffer[]) ?? []}
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {/* Gallery */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            {gallery.length === 0 ? (
              <div className="aspect-[16/10] w-full bg-muted sm:aspect-[21/9]">
                <RoomTypeImage name={roomType.name} imageUrl={null} />
              </div>
            ) : (
              <div className="group relative aspect-[16/10] w-full bg-night sm:aspect-[21/9]">
                <Swiper
                  key={`main-${slug}`}
                  modules={[Keyboard, Autoplay, Thumbs]}
                  thumbs={{
                    swiper:
                      thumbsSwiper && !thumbsSwiper.destroyed
                        ? thumbsSwiper
                        : null,
                  }}
                  keyboard={{ enabled: true }}
                  autoplay={
                    gallery.length > 1
                      ? {
                          delay: 3500,
                          disableOnInteraction: false,
                          pauseOnMouseEnter: true,
                        }
                      : false
                  }
                  loop={gallery.length > 1}
                  observer={true}
                  observeParents={true}
                  onSwiper={(s) => {
                    mainSwiperRef.current = s;
                  }}
                  onSlideChange={handleGalleryChange}
                  className="detail-gallery-main h-full w-full"
                >
                  {gallery.map((g, i) => {
                    const p = photoById.get(g.mediaId);
                    return (
                      <SwiperSlide key={`${g.mediaId}-${i}`}>
                        {g.kind === "video" && p?.url ? (
                          <video
                            src={p.url}
                            className="h-full w-full bg-black object-contain"
                            controls
                            preload="metadata"
                            aria-label={`${roomType.name} video ${i + 1} of ${gallery.length}`}
                          />
                        ) : (
                          <RoomTypeImage
                            name={roomType.name}
                            imageUrl={p?.url ?? null}
                            alt={
                              g.altText ??
                              p?.alt ??
                              `${roomType.name} photo ${i + 1} of ${gallery.length}`
                            }
                          />
                        )}
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() => mainSwiperRef.current?.slidePrev()}
                      className="gallery-nav absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-foreground opacity-0 shadow-lg transition-opacity duration-200 hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      <ChevronLeft className="size-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => mainSwiperRef.current?.slideNext()}
                      className="gallery-nav absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-foreground opacity-0 shadow-lg transition-opacity duration-200 hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      <ChevronRight className="size-5" aria-hidden />
                    </button>
                    <p
                      aria-hidden
                      className="absolute bottom-3 right-3 z-10 rounded-md bg-black/55 px-2 py-1 text-xs font-medium tabular-nums text-white"
                    >
                      {galleryIndex + 1}/{gallery.length}
                    </p>
                    <span className="sr-only" role="status">
                      Photo {galleryIndex + 1} of {gallery.length}
                    </span>
                  </>
                )}
              </div>
            )}
            {gallery.length > 1 && (
              <div className="border-t border-border bg-card px-3 py-3">
                <Swiper
                  key={`thumbs-${slug}`}
                  modules={[FreeMode, Thumbs]}
                  onSwiper={(s) => {
                    thumbsSwiperRef.current = s;
                    setThumbsSwiper(s);
                  }}
                  freeMode
                  watchSlidesProgress
                  slideToClickedSlide
                  slidesPerView="auto"
                  spaceBetween={10}
                  observer={true}
                  observeParents={true}
                  className="detail-gallery-thumbs"
                >
                  {gallery.map((g, i) => {
                    const p = photoById.get(g.mediaId);
                    const isActive = i === galleryIndex;
                    return (
                      <SwiperSlide
                        key={`${g.mediaId}-${i}`}
                        style={{ width: 104 }}
                        className={`thumb-slide cursor-pointer ${
                          isActive ? "swiper-slide-thumb-active" : ""
                        }`}
                        onClick={() => handleSelectMedia(i)}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectMedia(i);
                          }}
                          aria-label={`Show media ${i + 1} of ${gallery.length}`}
                          aria-current={isActive}
                          className={`relative block h-[72px] w-[104px] overflow-hidden rounded-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                            isActive
                              ? "border-brand ring-2 ring-brand ring-offset-2 ring-offset-background shadow-md opacity-100 scale-[1.02]"
                              : "border-border opacity-70 hover:opacity-100 hover:border-brand/70"
                          }`}
                        >
                          {g.kind === "video" ? (
                            <span className="flex h-full w-full items-center justify-center bg-black text-xs text-white">
                              ▶ Video
                            </span>
                          ) : p?.url ? (
                            <img
                              src={p.url}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-muted text-xs">
                              {g.mediaId.slice(-6)}
                            </span>
                          )}
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            )}
          </div>

          {/* Title + rating + save */}
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                {roomType.name}
              </h1>
              <p className="mt-1 font-display text-base italic text-muted-foreground">
                {roomType.shortDescription ??
                  `Cottage in Hamptworth, Hampshire — sleeps ${roomType.maxOccupancy}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              {reviewStats.count > 0 && (
                <p className="inline-flex items-center gap-1 text-sm">
                  <Star
                    className="size-4 fill-amber-500 text-amber-500"
                    aria-hidden
                  />
                  <span className="font-bold">{reviewStats.average}</span>
                  <span className="text-muted-foreground">
                    ({reviewStats.count} review
                    {reviewStats.count === 1 ? "" : "s"})
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={toggleSaved}
                aria-pressed={saved}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Heart
                  className={`size-4 ${saved ? "fill-rose-600 text-rose-600" : ""}`}
                  aria-hidden
                />
                Save
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <CottageStats
              sleeps={roomType.maxOccupancy}
              adults={roomType.maxAdults}
              children={roomType.maxChildren}
              bedrooms={roomType.bedrooms ?? null}
              bathrooms={roomType.bathrooms ?? null}
              dogs={roomType.maxDogs ?? null}
            />
            {roomType.locationText && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{roomType.locationText}</span>
              </span>
            )}
          </div>

          {roomType.description && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground">
              {roomType.description}
            </p>
          )}

          {/* Amenity strip */}
          {highlights.length > 0 && (
            <section
              aria-label="Highlights"
              className="mt-5 rounded-xl  bg-background-light px-4 py-4"
            >
              <AmenityStrip amenities={highlights} />
            </section>
          )}

          {roomType.welcomeHamperIncluded &&
            roomType.welcomeHamperHtml?.trim() && (
              <div className="mt-4">
                <HamperBanner html={roomType.welcomeHamperHtml} />
              </div>
            )}

          {/* Facilities — before the hamper banner */}
          {(facilities.length > 0 || roomType.amenities.length > 0) && (
            <section aria-label="Facilities" className="mt-5">
              <h2 className="font-display text-2xl font-medium tracking-tight">
                Facilities
              </h2>
              <div className="mt-3">
                <FacilityGrid
                  amenities={facilities}
                  extra={roomType.amenities}
                />
              </div>
            </section>
          )}

          {/* Section tabs — proper tabs: clicking switches the panel below */}
          <div className="sticky top-16 z-30 -mx-1 mt-6 overflow-x-auto overflow-y-hidden border-b border-border bg-background/95 px-1 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className="flex gap-5"
              role="tablist"
              aria-label="On this page"
            >
              {tabs.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(t.id)}
                    className={`whitespace-nowrap border-b-2 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "border-brand font-semibold text-brand-dark"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            key={activeTab}
            role="tabpanel"
            className="animate-in fade-in pt-2 duration-200"
          >
            {/* Overview / about */}
            {activeTab === "overview" && (
              <section aria-label="Overview">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-medium tracking-tight">
                      About {roomType.name}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      {roomType.description ??
                        roomType.shortDescription ??
                        `${roomType.name} sleeps up to ${roomType.maxOccupancy} guests in comfort.`}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {aboutBullets.slice(0, 3).map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-brand"
                            strokeWidth={3}
                            aria-hidden
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                    {propertyDetailsHtml && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("property-details")}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Read more about this property
                        <span aria-hidden>→</span>
                      </button>
                    )}
                  </div>
                  <div className="min-h-56 overflow-hidden rounded-xl">
                    <RoomTypeImage
                      name={roomType.name}
                      imageUrl={aboutPhoto?.url ?? null}
                      alt={aboutPhoto?.alt ?? `${roomType.name} interior`}
                      className="h-full min-h-56"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Property details */}
            {activeTab === "property-details" && propertyDetailsHtml && (
              <section aria-label="Property Details">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  Property Details
                </h2>
                <div
                  className="rich-text mt-3 text-sm leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: enhanceRichLinks(propertyDetailsHtml),
                  }}
                />
              </section>
            )}

            {/* Layout + floorplan */}
            {activeTab === "layout" && (
              <section aria-label="Layout" className="space-y-8">
                {roomType.layoutHtml && (
                  <div>
                    <h2 className="font-display text-2xl font-medium tracking-tight">
                      Layout
                    </h2>
                    <div
                      className="rich-text mt-3 text-sm leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: enhanceRichLinks(roomType.layoutHtml),
                      }}
                    />
                  </div>
                )}
                {(floorplanPhotos ?? []).length > 0 && (
                  <div>
                    <h2 className="font-display text-2xl font-medium tracking-tight">
                      Floorplan
                    </h2>
                    <div className="mt-3 grid gap-3">
                      {(floorplanPhotos ?? []).map((f) => (
                        <a
                          key={f.id}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open floorplan for ${roomType.name} in full size`}
                          className="block overflow-hidden rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <img
                            src={f.url}
                            alt={f.alt || `Floorplan of ${roomType.name}`}
                            className="h-auto w-full object-contain"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Location */}
            {activeTab === "location" && (
              <section aria-label="Location">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  Location
                </h2>
                <Card className="mt-3">
                  <CardContent className="space-y-3 p-3">
                    {roomType.mapLat != null && roomType.mapLng != null ? (
                      <LocationMap
                        lat={roomType.mapLat}
                        lng={roomType.mapLng}
                        label={roomType.name}
                        className="h-60 w-full overflow-hidden rounded-lg border border-border"
                      />
                    ) : mapUrl ? (
                      <iframe
                        title={`Map of ${roomType.name}`}
                        src={mapUrl}
                        className="h-60 w-full rounded-lg border border-border"
                        loading="lazy"
                      />
                    ) : null}
                    {roomType.locationText && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <MapPin
                          className="mr-1 inline size-3.5 text-foreground"
                          aria-hidden
                        />
                        {roomType.locationText}
                      </p>
                    )}
                    {roomType.mapLat != null && roomType.mapLng != null && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${roomType.mapLat},${roomType.mapLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:border-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        View on map
                        <span aria-hidden>→</span>
                      </a>
                    )}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Nearby — admin-managed attractions with photos/links */}
            {activeTab === "nearby" && (
              <section aria-label="Nearby attractions">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  Nearby attractions
                </h2>
                {nearbyList.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {nearbyList.map((a, i) => {
                      const photo = a.imageMediaId
                        ? nearbyPhotoById.get(a.imageMediaId)
                        : undefined;
                      const Icon = attractionIconFor(a.name);
                      const tile =
                        ATTRACTION_TILES[i % ATTRACTION_TILES.length];
                      const inner = (
                        <>
                          {photo?.url ? (
                            <img
                              src={photo.url}
                              alt={photo.alt || a.name}
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className={`absolute inset-0 bg-gradient-to-br ${tile}`}
                            >
                              <Icon className="absolute -right-3 -top-3 size-24 text-white/25" />
                            </span>
                          )}
                          <span className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/95 px-2.5 py-1.5 shadow">
                            <span className="block truncate text-xs font-semibold">
                              {a.name}
                            </span>
                            {a.description && (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {a.description}
                              </span>
                            )}
                          </span>
                        </>
                      );
                      return a.url ? (
                        <a
                          key={`${a.name}-${i}`}
                          href={a.url}
                          target={a.url.startsWith("/") ? undefined : "_blank"}
                          rel={
                            a.url.startsWith("/")
                              ? undefined
                              : "noopener noreferrer"
                          }
                          aria-label={`${a.name} — open link`}
                          className="relative block h-36 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div
                          key={`${a.name}-${i}`}
                          className="relative h-36 overflow-hidden rounded-xl"
                        >
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                )}
                {roomType.surroundingsHtml && (
                  <div
                    className="rich-text mt-4 text-sm leading-relaxed text-foreground"
                    dangerouslySetInnerHTML={{
                      __html: enhanceRichLinks(roomType.surroundingsHtml),
                    }}
                  />
                )}
              </section>
            )}

            {/* Reviews — signed-in guests with a completed stay only */}
            {activeTab === "reviews" && canReview && (
              <section aria-label="Reviews">
                <ReviewsBlock
                  roomTypeId={roomType.id}
                  reviewsQuery={reviewsQuery}
                />
              </section>
            )}
          </div>

          {/* Availability — always visible, drives the booking sidebar */}
          <section
            id="availability"
            aria-label="Availability"
            className="scroll-mt-36"
          >
            <h2 className="font-display text-2xl font-medium tracking-tight">
              Availability
            </h2>
            <div className="mt-3 [&_.mx-auto]:mx-0 [&_.max-w-4xl]:max-w-none">
              <AvailabilityCalendar
                roomTypeId={roomType.id}
                selectedCheckIn={picked[0] ?? search?.checkIn ?? null}
                selectedCheckOut={
                  picked[1] ??
                  (picked.length === 1 ? null : (search?.checkOut ?? null))
                }
                onPickDate={pickDate}
              />
            </div>
          </section>

          <EnquireAboutRoom roomTypeId={roomType.id} roomName={roomType.name} />
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <Card className="shadow-card">
            <CardContent className="space-y-4 p-5">
              {leadRate ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    From
                  </p>
                  <p className="mt-1 font-display text-3xl font-medium tracking-tight">
                    {formatMoney(leadRate.perNight, leadRate.currency)}{" "}
                    <span className="font-display text-base font-normal italic text-muted-foreground">
                      / night
                    </span>
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    From
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select dates to see live rates
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Your stay</p>
                <button
                  type="button"
                  onClick={() => scrollToId("availability")}
                  aria-label="Choose dates from the availability calendar"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    {search
                      ? `${fmtShort(search.checkIn)} → ${fmtShort(search.checkOut)}`
                      : "Select dates"}
                  </span>
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setGuestsOpen((o) => !o)}
                    aria-expanded={guestsOpen}
                    aria-label="Choose guests"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Users
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                      {guestCount} guest{guestCount === 1 ? "" : "s"}
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${guestsOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {guestsOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close guest picker"
                        onClick={() => setGuestsOpen(false)}
                        className="fixed inset-0 z-10 cursor-default bg-transparent"
                      />
                      <div
                        role="dialog"
                        aria-label="Choose guests"
                        className="absolute inset-x-0 top-full z-20 mt-2 space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
                      >
                        <GuestStepper
                          label="Adults"
                          value={search?.adults ?? 2}
                          min={1}
                          max={20}
                          onChange={(v) =>
                            setGuestCount(v, search?.children ?? 0)
                          }
                        />
                        <GuestStepper
                          label="Children"
                          value={search?.children ?? 0}
                          min={0}
                          max={20}
                          onChange={(v) =>
                            setGuestCount(search?.adults ?? 2, v)
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="w-full rounded-full"
                          onClick={() => setGuestsOpen(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  type="button"
                  className="h-12 w-full rounded-lg text-base"
                  onClick={() => scrollToId("availability")}
                >
                  Check availability
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-brand" aria-hidden />
                  No booking fees
                  <span aria-hidden>•</span>
                  Secure payment
                </p>
              </div>

              {leadRate && match && search && match.availableCount > 0 ? (
                <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Standard Rate</span>
                    <span className="font-medium">
                      {formatMoney(leadRate.perNight, leadRate.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {stayNights} night{stayNights === 1 ? "" : "s"}
                    </span>
                    <span className="font-medium">
                      {formatMoney(leadRate.total, leadRate.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Taxes &amp; fees
                    </span>
                    <span className="font-medium">
                      {formatMoney(0, leadRate.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                    <span>Total</span>
                    <span>
                      {formatMoney(leadRate.total, leadRate.currency)}
                    </span>
                  </div>
                  <div className="space-y-2 pt-1">
                    {match.rates.map((rate) => (
                      <div
                        key={rate.ratePlanId}
                        className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {rate.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatMoney(rate.total, rate.currency)} total
                          </p>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="shrink-0 rounded-full"
                        >
                          <Link
                            to={`/booking/new?roomTypeId=${match.roomType.id}&ratePlanId=${rate.ratePlanId}&checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&roomName=${encodeURIComponent(match.roomType.name)}&rateName=${encodeURIComponent(rate.name)}`}
                          >
                            Book now
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {search
                    ? match && match.availableCount <= 0
                      ? `Fully booked for ${search.checkIn} → ${search.checkOut}. Try different dates from the calendar.`
                      : "Not available for these dates. Try different dates from the calendar."
                    : "Pick dates from the availability calendar to see live rates."}
                </p>
              )}
            </CardContent>
          </Card>

          {(settings?.whyBookWithUs ?? []).length > 0 && (
            <Card className="shadow-card">
              <CardContent className="space-y-4 p-5">
                <h2 className="font-display text-xl font-medium tracking-tight">
                  Why book with us?
                </h2>
                <ul className="space-y-4">
                  {(settings?.whyBookWithUs ?? []).map((w, i) => {
                    const Icon = whyIconFor(w.title);
                    return (
                      <li key={i} className="flex gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-dark">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">
                            {w.title}
                          </span>
                          {w.text ? (
                            <span
                              className="rich-body mt-0.5 block text-xs leading-relaxed text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: w.text }}
                            />
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function GuestStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-8 items-center justify-center rounded-full border border-input transition hover:border-brand disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <span
          className="w-6 text-center text-sm font-semibold tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-8 items-center justify-center rounded-full border border-input transition hover:border-brand disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </span>
    </div>
  );
}

function TickIcon({ className }: { className?: string }) {
  return (
    <Check
      className={className ?? "size-5 shrink-0 text-brand"}
      strokeWidth={3}
      aria-hidden
    />
  );
}

function StatTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center gap-1.5 text-sm text-foreground">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-44 -translate-x-1/2 rounded-md bg-night px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/** Cottage stats icon row (sleeps · bedrooms · bathrooms · dogs) with tooltips. */
function CottageStats({
  sleeps,
  adults,
  children,
  bedrooms,
  bathrooms,
  dogs,
}: {
  sleeps: number;
  adults: number;
  children: number;
  bedrooms: number | null;
  bathrooms: number | null;
  dogs: number | null;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <StatTip
        label={`Guests — sleeps up to ${sleeps} (${adults} adults, ${children} children)`}
      >
        <BedDouble className="size-4 text-muted-foreground" aria-hidden />
        <span aria-hidden>{sleeps} guests</span>
        <span className="sr-only">Guests: sleeps up to {sleeps}</span>
      </StatTip>
      {bedrooms != null && (
        <StatTip label={bedrooms === 1 ? "1 bedroom" : `${bedrooms} bedrooms`}>
          <BedDouble className="size-4 text-muted-foreground" aria-hidden />
          <span aria-hidden>
            {bedrooms} bedroom{bedrooms === 1 ? "" : "s"}
          </span>
          <span className="sr-only">{bedrooms} bedrooms</span>
        </StatTip>
      )}
      {bathrooms != null && (
        <StatTip
          label={bathrooms === 1 ? "1 bathroom" : `${bathrooms} bathrooms`}
        >
          <Bath className="size-4 text-muted-foreground" aria-hidden />
          <span aria-hidden>
            {bathrooms} bathroom{bathrooms === 1 ? "" : "s"}
          </span>
          <span className="sr-only">{bathrooms} bathrooms</span>
        </StatTip>
      )}
      {dogs != null && dogs > 0 && (
        <StatTip
          label={
            dogs === 1
              ? "Dog friendly — 1 dog allowed"
              : `Dog friendly — ${dogs} dogs allowed`
          }
        >
          <Dog className="size-4 text-muted-foreground" aria-hidden />
          <span aria-hidden>{dogs}</span>
          <span className="sr-only">Dog friendly</span>
        </StatTip>
      )}
    </p>
  );
}

interface LinkedAmenity {
  id: string;
  name: string;
  group?: string;
  imageMediaId: string | null;
  iconUrl?: string | null;
}

/** Amenity strip: gold icon + label chips in a bordered box. */
function AmenityStrip({ amenities }: { amenities: LinkedAmenity[] }) {
  const { data: photos } = useMediaUrls(
    amenities
      .map((a) => a.imageMediaId)
      .filter((id): id is string => Boolean(id)),
  );
  const byId = new Map((photos ?? []).map((p) => [p.id, p]));
  return (
    <ul className="flex flex-wrap gap-x-8 gap-y-4">
      {amenities.map((a) => {
        const uploaded = a.imageMediaId
          ? byId.get(a.imageMediaId)?.url
          : undefined;
        const icon =
          a.iconUrl && !a.iconUrl.startsWith("https://picsum.photos")
            ? a.iconUrl
            : null;
        const src = uploaded ?? icon ?? null;
        const Icon = amenityIconFor(a.name);
        return (
          <li
            key={a.id}
            className="inline-flex min-w-20 flex-col items-center gap-1.5 text-center"
          >
            {src ? (
              <img
                src={src}
                alt=""
                className="size-6 object-contain"
                loading="lazy"
              />
            ) : (
              <Icon className="size-6 text-brand-dark" aria-hidden />
            )}
            <span className="max-w-24 text-xs text-foreground">{a.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Facilities grid: tick + label in columns (legacy text amenities merge in). */
function FacilityGrid({
  amenities,
  extra,
}: {
  amenities: LinkedAmenity[];
  extra: string[];
}) {
  if (amenities.length === 0 && extra.length === 0) return null;
  return (
    <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {amenities.map((a) => (
        <li
          key={a.id}
          className="flex items-center gap-2.5 text-sm text-foreground"
        >
          <TickIcon />
          {a.name}
        </li>
      ))}
      {extra.map((name) => (
        <li
          key={name}
          className="flex items-center gap-2.5 text-sm text-foreground"
        >
          <TickIcon />
          {name}
        </li>
      ))}
    </ul>
  );
}

/** Welcome-hamper banner — View details opens a dialog (like offers). */
function HamperBanner({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <section
        aria-label="Welcome hamper"
        className="overflow-hidden rounded-xl border border-brand/40"
      >
        <div className="flex items-center justify-between gap-3 bg-brand px-4 py-3 text-white">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <Gift className="size-5" aria-hidden />
            Welcome hamper included
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="shrink-0 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            View details
          </button>
        </div>
      </section>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="hamper-dialog-title"
      >
        <h2
          id="hamper-dialog-title"
          className="pr-10 font-display text-2xl font-light tracking-tight"
        >
          Welcome hamper included
        </h2>
        <div
          className="rich-text mt-3 text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: enhanceRichLinks(html) }}
        />
      </Dialog>
    </>
  );
}

function formatOfferDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = date.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  return `${day}${suffix} ${month} ${date.getUTCFullYear()}`;
}

/** Clickable-offer dialog ("1 OFFER" with terms). */
function OfferDialog({
  offers,
  open,
  onClose,
}: {
  offers: RoomOffer[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="offers-dialog-title"
      closeClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white"
    >
      <div className="-m-5 mb-4 flex items-center justify-between bg-destructive px-5 py-3 text-white sm:-m-6 sm:mb-4 sm:px-6">
        <h2
          id="offers-dialog-title"
          className="py-0.5 pr-8 text-sm font-bold tracking-wide"
        >
          {offers.length} OFFER{offers.length === 1 ? "" : "S"}
        </h2>
      </div>
      <div className="space-y-6">
        {offers.map((offer) => {
          const from = formatOfferDate(offer.validFrom);
          const until = formatOfferDate(offer.validUntil);
          return (
            <div key={offer.id} className="space-y-2">
              <p className="flex items-center gap-2 text-lg font-bold">
                <BadgePercent
                  className="size-6 text-muted-foreground"
                  aria-hidden
                />
                {offer.badgeLabel}
                <span className="text-base font-medium text-muted-foreground">
                  {from && until ? `${from} to ${until}` : offer.title}
                </span>
              </p>
              {offer.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {offer.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Use code {offer.couponCode} at checkout.
              </p>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

function ReviewsBlock({
  roomTypeId,
  reviewsQuery,
}: {
  roomTypeId: string;
  reviewsQuery: ReturnType<typeof useQuery>;
}) {
  const queryClient = useQueryClient();
  const data = (reviewsQuery.data ?? { items: [], average: 0, count: 0 }) as {
    items: Array<{
      id: string;
      authorName: string;
      rating: number;
      title: string | null;
      body: string;
    }>;
    average: number;
    count: number;
  };
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      submitReview({ roomTypeId, rating: Number(rating), body: body.trim() }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["reviews", roomTypeId] });
      toast.success(
        "Review submitted for moderation — only completed stays are eligible",
      );
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "Only guests with a completed stay can review",
      ),
  });
  return (
    <div className="space-y-3">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Reviews{" "}
        {data.count > 0 ? (
          <span className="font-display text-base italic text-muted-foreground">
            · {data.average} ★ ({data.count})
          </span>
        ) : (
          <span className="font-display text-base italic text-muted-foreground">
            · Be the first to review
          </span>
        )}
      </h2>
      {reviewsQuery.isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet — only guests with a completed stay can leave one.
        </p>
      ) : (
        <div className="grid gap-3">
          {data.items.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  {r.authorName} · {"★".repeat(r.rating)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.title ? `${r.title} — ` : ""}
                  {r.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="grid gap-2 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">
          Write a review (completed stays only)
        </p>
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label htmlFor="rev-rating">Rating</Label>
            <Input
              id="rev-rating"
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rev-body">Review</Label>
          <textarea
            id="rev-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="How was your stay?"
          />
        </div>
        <Button
          className="w-fit rounded-full"
          disabled={mutation.isPending || body.trim().length < 4}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Submitting…" : "Submit review"}
        </Button>
      </div>
    </div>
  );
}

function EnquireAboutRoom({
  roomTypeId,
  roomName,
}: {
  roomTypeId: string;
  roomName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="my-6 rounded-2xl border border-border bg-surface-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">
            Enquire about {roomName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us your dates, party and budget — we reply shortly.
          </p>
        </div>
        <Button className="rounded-lg" onClick={() => setOpen(true)}>
          Enquire now
          <span aria-hidden>→</span>
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="enquiry-dialog-title"
      >
        <h2
          id="enquiry-dialog-title"
          className="pr-10 font-display text-2xl font-light tracking-tight"
        >
          Enquire about {roomName}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Holiday budget, party size, dates, location, dog friendly — anything
          helps.
        </p>
        <EnquiryForm
          roomTypeId={roomTypeId}
          roomName={roomName}
          onSuccess={() => setOpen(false)}
        />
      </Dialog>
    </section>
  );
}

export default RoomDetailPage;
