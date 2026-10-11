import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
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
} from "@/modules/reviews/api/reviews.api";
import { useAuthStore } from "@/stores/auth-store";
import { fetchRoomOffers } from "../api/rooms.api";
import type { RoomOffer } from "../api/rooms.api";
import { useRoomTypeBySlug } from "../hooks/use-room-type";
import {
  AmenityStrip,
  CottageStats,
  EnquireAboutRoom,
  FacilityGrid,
  GuestStepper,
  HamperBanner,
  OfferDialog,
  ReviewsBlock,
  WhyBookWithUsCard,
} from "../components";

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
  { id: "reviews", label: "Reviews" },
] as const;

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
  const hasLayout = !!(
    roomType?.layoutHtml || (floorplanPhotos ?? []).length > 0
  );
  const hasLocation = !!(
    roomType?.locationText ||
    roomType?.mapEmbedUrl ||
    roomType?.surroundingsHtml ||
    (roomType?.mapLat != null && roomType?.mapLng != null)
  );
  // Proper tabs: only tabs with content are shown; clicking switches the panel.
  const tabs = TABS.filter(
    (t) =>
      (t.id !== "reviews" || canReview) &&
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
  }, [canReview, hasLayout, hasLocation, roomType]);
  const [offerOpen, setOfferOpen] = useState(false);
  const { data: offers } = useQuery({
    queryKey: ["room-offers", roomType?.id],
    queryFn: () => fetchRoomOffers(roomType?.id as string),
    enabled: !!roomType?.id,
    staleTime: 300_000,
  });

  // Hooks must stay above early returns — otherwise hook order changes
  // between loading and loaded renders and React crashes.
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (isTypePending || !roomType || !rootRef.current) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) return;

      gsap.to(".detail-butterfly", {
        y: -4,
        rotation: 3,
        duration: 3.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".detail-flying-butterfly-1", {
        x: 16,
        y: -14,
        rotation: 8,
        duration: 3.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".detail-flying-butterfly-2", {
        x: -18,
        y: -12,
        rotation: -10,
        duration: 4.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".detail-bird", {
        y: -6,
        rotation: -2,
        duration: 4.8,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".detail-wildflower", {
        rotation: -6,
        y: -3,
        duration: 5.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".detail-leaf-top", {
        x: 6,
        y: -14,
        rotation: -4,
        transformOrigin: "top right",
        duration: 5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".detail-leaf-left", {
        x: -6,
        y: 14,
        rotation: 4,
        transformOrigin: "bottom left",
        duration: 6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    },
    { scope: rootRef, dependencies: [isTypePending, roomType?.id] },
  );

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
    <div ref={rootRef} className="relative space-y-5 pb-8">
      {/* Ambient countryside framing foliage — crisp & clear of interactive controls */}
      <div
        className="pointer-events-none absolute -top-16 right-0 z-0 hidden w-48 translate-x-full select-none opacity-90 lg:block xl:w-56"
        aria-hidden
      >
        <div className="relative">
          <div className="rotate-[159deg]">
            <img
              src="/oak_branch1.webp"
              alt=""
              className="detail-leaf-top w-full origin-top-right"
              loading="eager"
            />
          </div>
          {/* Subtle fluttering butterfly near the oak foliage */}
          <div className="absolute -left-3 top-10 w-7 select-none opacity-90">
            <img
              src="/butterfly_flying.gif"
              alt=""
              className="detail-flying-butterfly-2 w-full drop-shadow-xs rotate-[15deg]"
              loading="eager"
            />
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-0 top-24 z-0 hidden w-44 -translate-x-full rotate-[-15deg] select-none opacity-85 lg:block lg:w-52"
        aria-hidden
      >
        <img
          src="/leaf4.webp"
          alt=""
          className="detail-leaf-left w-full origin-bottom-left"
          loading="eager"
        />
      </div>
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
              <div className="inline-flex items-baseline gap-2.5">
                <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                  {roomType.name}
                </h1>
                <span
                  className="pointer-events-none relative inline-block select-none"
                  aria-hidden
                >
                  <img
                    src="/butterfly_perched.gif"
                    alt=""
                    className="detail-butterfly inline-block h-[2em] w-auto align-baseline drop-shadow-xs"
                    loading="eager"
                  />
                </span>
              </div>
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
              className="relative mt-5 rounded-xl bg-background-light px-5 py-4 sm:pr-28"
            >
              {/* Blue Tit songbird perched on top-right edge in clear dedicated space */}
              <div
                className="pointer-events-none absolute -top-6 right-2 hidden w-20 select-none sm:block sm:w-24 opacity-95"
                aria-hidden
              >
                <img
                  src="/bird2.webp"
                  alt=""
                  className="detail-bird w-full drop-shadow-sm"
                  loading="lazy"
                />
              </div>
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

          <WhyBookWithUsCard items={settings?.whyBookWithUs ?? []} />
        </aside>
      </div>
    </div>
  );
}

export default RoomDetailPage;
