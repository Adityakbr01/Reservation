import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  BadgePercent,
  Bath,
  BedDouble,
  Check,
  ChevronDown,
  Dog,
  Gift,
  Info,
  Users,
} from "lucide-react";
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
import { fetchReviews, submitReview } from "@/modules/reviews/api/reviews.api";
import { EnquiryForm } from "@/modules/enquiry/components/EnquiryForm";
import { Dialog } from "@/components/ui/dialog";
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
  const coverPhoto =
    gallery.length > 0
      ? photoById.get(
          gallery[Math.min(galleryIndex, gallery.length - 1)]?.mediaId ?? "",
        )
      : undefined;
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
  const { data: hamperPhoto } = useMediaUrls(
    roomType?.welcomeHamperImageMediaId
      ? [roomType.welcomeHamperImageMediaId]
      : [],
  );
  const reviewsQuery = useQuery({
    queryKey: ["reviews", roomType?.id],
    queryFn: () => fetchReviews(roomType?.id as string),
    enabled: !!roomType?.id,
  });
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

  return (
    <div className="space-y-6 pb-8">
      <Link
        to="/"
        state={search ? { search } : undefined}
        className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        ← Back to search
      </Link>

      {(offers ?? []).length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOfferOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-haspopup="dialog"
          >
            <BadgePercent className="size-5" aria-hidden />
            {(offers as RoomOffer[])[0]?.badgeLabel}
            <Info className="size-4 text-muted-foreground" aria-hidden />
          </button>
          <OfferDialog
            offers={(offers as RoomOffer[]) ?? []}
            open={offerOpen}
            onClose={() => setOfferOpen(false)}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="aspect-[21/9] w-full bg-muted">
          {gallery[galleryIndex]?.kind === "video" && coverPhoto?.url ? (
            <video
              src={coverPhoto.url}
              className="h-full w-full bg-black"
              controls
              preload="metadata"
            />
          ) : (
            <RoomTypeImage
              name={roomType.name}
              imageUrl={coverPhoto?.url ?? null}
              alt={coverPhoto?.alt}
            />
          )}
        </div>
        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-2">
            {gallery.map((g, i) => {
              const p = photoById.get(g.mediaId);
              return (
                <button
                  key={`${g.mediaId}-${i}`}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border ${i === galleryIndex ? "border-brand ring-1 ring-brand" : "border-border"}`}
                  aria-label={`Show media ${i + 1}`}
                >
                  {g.kind === "video" ? (
                    <span className="flex h-full w-full items-center justify-center bg-black text-xs text-white">
                      ▶ Video
                    </span>
                  ) : p?.url ? (
                    <img
                      src={p.url}
                      alt={g.altText ?? ""}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-muted text-xs">
                      {g.mediaId.slice(-6)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
              {roomType.name}
            </h1>
            <CottageStats
              sleeps={roomType.maxOccupancy}
              adults={roomType.maxAdults}
              children={roomType.maxChildren}
              bedrooms={roomType.bedrooms ?? null}
              bathrooms={roomType.bathrooms ?? null}
              dogs={roomType.maxDogs ?? null}
            />
          </div>

          {roomType.description && (
            <p className="leading-relaxed text-foreground">
              {roomType.description}
            </p>
          )}

          {highlights.length > 0 && (
            <section aria-label="Highlights">
              <HighlightRow amenities={highlights} />
            </section>
          )}

          {roomType.welcomeHamperIncluded && (
            <HamperBanner
              description={roomType.welcomeHamperDescription ?? null}
              imageUrl={hamperPhoto?.[0]?.url ?? null}
            />
          )}

          {(facilities.length > 0 || roomType.amenities.length > 0) && (
            <section aria-label="Facilities">
              <FacilityGrid amenities={facilities} extra={roomType.amenities} />
            </section>
          )}

          <AvailabilityCalendar
            roomTypeId={roomType.id}
            selectedCheckIn={picked[0] ?? search?.checkIn ?? null}
            selectedCheckOut={
              picked[1] ??
              (picked.length === 1 ? null : (search?.checkOut ?? null))
            }
            onPickDate={pickDate}
          />

          <section className="space-y-2">
            <h2 className="font-medium">Property details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {roomType.layoutHtml && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold">Layout</h3>
                    <div
                      className="rich-body mt-1 text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: roomType.layoutHtml }}
                    />
                  </CardContent>
                </Card>
              )}
              {(floorplanPhotos ?? []).length > 0 && (
                <Card>
                  <CardContent className="space-y-2 p-4">
                    <h3 className="text-sm font-semibold">Floorplan</h3>
                    {(floorplanPhotos ?? []).map((f) => (
                      <img
                        key={f.id}
                        src={f.url}
                        alt={f.alt ?? "Floorplan"}
                        className="w-full rounded-lg border border-border"
                        loading="lazy"
                      />
                    ))}
                  </CardContent>
                </Card>
              )}
              {(roomType.locationText ||
                roomType.mapLat != null ||
                mapUrl ||
                roomType.surroundingsHtml) && (
                <div
                  className="grid gap-8 sm:col-span-2 lg:grid-cols-2"
                  aria-label="Location and surroundings"
                >
                  <div>
                    <h3 className="font-display text-2xl font-light tracking-tight">
                      Location
                    </h3>
                    <div className="mt-2 border-t-2 border-brand pt-4">
                      {roomType.mapLat != null && roomType.mapLng != null ? (
                        <LocationMap
                          lat={roomType.mapLat}
                          lng={roomType.mapLng}
                          label={roomType.name}
                        />
                      ) : mapUrl ? (
                        <iframe
                          title="Map"
                          src={mapUrl}
                          className="h-80 w-full rounded-sm border border-border"
                          loading="lazy"
                        />
                      ) : null}
                      {roomType.locationText && (
                        <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                          {roomType.locationText}
                        </p>
                      )}
                    </div>
                  </div>
                  {roomType.surroundingsHtml && (
                    <div>
                      <h3 className="font-display text-2xl font-light tracking-tight">
                        Surrounding local area
                      </h3>
                      <div className="mt-2 border-t-2 border-brand pt-4">
                        <div
                          className="rich-body rich-body-gold text-center text-sm leading-relaxed text-foreground"
                          dangerouslySetInnerHTML={{
                            __html: roomType.surroundingsHtml,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {(settings?.whyBookWithUs ?? []).length > 0 && (
            <WhyBookDropdown items={settings?.whyBookWithUs ?? []} />
          )}

          <ReviewsBlock roomTypeId={roomType.id} reviewsQuery={reviewsQuery} />

          <EnquireAboutRoom roomTypeId={roomType.id} roomName={roomType.name} />
        </div>

        <Card className="h-fit shadow-card lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-xl">Your stay</CardTitle>
            <CardDescription>
              {search
                ? `${search.checkIn} → ${search.checkOut} · ${search.adults + search.children} guests`
                : "Pick dates to see live rates"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!search ? (
              <Button asChild className="h-11 w-full rounded-full">
                <Link to="/">Choose dates</Link>
              </Button>
            ) : !match ? (
              <p className="text-sm text-muted-foreground">
                Not available for these dates. Try different dates from home.
              </p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  {match.availableCount} room
                  {match.availableCount === 1 ? "" : "s"} available
                </p>
                <p className="text-xs text-muted-foreground">
                  From{" "}
                  {formatMoney(
                    Math.min(...match.rates.map((r) => r.total)),
                    match.rates[0]?.currency ?? "GBP",
                  )}{" "}
                  total for {match.rates[0]?.nightly?.length ?? ""} nights ·
                  including taxes and fees
                </p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {match.rates.map((rate) => (
                    <li key={rate.ratePlanId} className="gap-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{rate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(rate.perNight, rate.currency)}
                            {rate.pricingType === "PER_NIGHT"
                              ? " / night"
                              : " / stay"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-display text-xl font-light">
                            {formatMoney(rate.total, rate.currency)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Total
                          </p>
                          <Button
                            asChild
                            size="sm"
                            className="btn-shine rounded-full"
                          >
                            <Link
                              to={`/booking/new?roomTypeId=${match.roomType.id}&ratePlanId=${rate.ratePlanId}&checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&roomName=${encodeURIComponent(match.roomType.name)}&rateName=${encodeURIComponent(rate.name)}`}
                            >
                              Book now
                            </Link>
                          </Button>
                        </div>
                      </div>
                      {rate.nightly && rate.nightly.length > 0 && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-muted-foreground">
                            Price details
                          </summary>
                          <ul className="mt-1 divide-y divide-border">
                            {rate.nightly.map((n) => (
                              <li
                                key={n.date}
                                className="flex justify-between py-0.5"
                              >
                                <span className="text-muted-foreground">
                                  {n.date}
                                </span>
                                <span>
                                  {formatMoney(n.price, rate.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Total including taxes and fees — confirmed again at booking.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
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
    <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
      <StatTip
        label={`Guests — sleeps up to ${sleeps} (${adults} adults, ${children} children)`}
      >
        <Users className="size-5 text-muted-foreground" aria-hidden />
        <span aria-hidden>{sleeps}</span>
        <span className="sr-only">Guests: sleeps up to {sleeps}</span>
      </StatTip>
      {bedrooms != null && (
        <StatTip label={bedrooms === 1 ? "1 bedroom" : `${bedrooms} bedrooms`}>
          <BedDouble className="size-5 text-muted-foreground" aria-hidden />
          <span aria-hidden>{bedrooms}</span>
          <span className="sr-only">{bedrooms} bedrooms</span>
        </StatTip>
      )}
      {bathrooms != null && (
        <StatTip
          label={bathrooms === 1 ? "1 bathroom" : `${bathrooms} bathrooms`}
        >
          <Bath className="size-5 text-muted-foreground" aria-hidden />
          <span aria-hidden>{bathrooms}</span>
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
          <Dog className="size-5 text-muted-foreground" aria-hidden />
          <span aria-hidden>{dogs}</span>
          <span className="sr-only">Dog friendly</span>
        </StatTip>
      )}
    </p>
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
    <Dialog open={open} onClose={onClose} labelledBy="offers-dialog-title">
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

/** Why-book-with-us dropdowns, all collapsed by default. */
function WhyBookDropdown({
  items,
}: {
  items: Array<{ title: string; text?: string | null }>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section className="space-y-2" aria-label="Why book with us">
      <h2 className="font-medium">Why book with us?</h2>
      <div className="divide-y divide-border rounded-xl border border-border">
        {items.map((w, i) => {
          const open = openIndex === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                aria-controls={`why-book-panel-${i}`}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="text-sm font-semibold">{w.title}</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {open && (
                <div
                  id={`why-book-panel-${i}`}
                  role="region"
                  className="px-4 pb-4"
                >
                  {w.text ? (
                    <div
                      className="rich-body text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: w.text }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      More details coming soon.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface LinkedAmenity {
  id: string;
  name: string;
  group?: string;
  imageMediaId: string | null;
  iconUrl?: string | null;
}

/** Highlights row: upload wins, then icon URL (mock), then default tick. */
function HighlightRow({ amenities }: { amenities: LinkedAmenity[] }) {
  const { data: photos } = useMediaUrls(
    amenities
      .map((a) => a.imageMediaId)
      .filter((id): id is string => Boolean(id)),
  );
  const byId = new Map((photos ?? []).map((p) => [p.id, p]));
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3">
      {amenities.map((a) => {
        const uploaded = a.imageMediaId
          ? byId.get(a.imageMediaId)?.url
          : undefined;
        const src = uploaded ?? a.iconUrl ?? null;
        return (
          <li
            key={a.id}
            className="inline-flex items-center gap-2 text-sm text-foreground"
          >
            {src ? (
              <img
                src={src}
                alt=""
                className="size-6 shrink-0 object-contain"
                loading="lazy"
              />
            ) : (
              <TickIcon className="size-6 shrink-0 text-muted-foreground" />
            )}
            {a.name}
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

/** Welcome-hamper banner with expandable details. */
function HamperBanner({
  description,
  imageUrl,
}: {
  description: string | null;
  imageUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Welcome hamper" className="overflow-hidden rounded-sm">
      <div className="flex items-center justify-between gap-3 bg-brand px-4 py-3 text-white">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <Gift className="size-5" aria-hidden />
          Welcome hamper included
        </p>
        {(description || imageUrl) && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="shrink-0 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {open ? "Hide details" : "View details"}
          </button>
        )}
      </div>
      {open && (description || imageUrl) && (
        <div className="space-y-3 border border-t-0 border-border bg-card p-4">
          {description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {description}
            </p>
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Welcome hamper"
              className="h-48 w-full rounded-xl object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
    </section>
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
  // Show the section only when reviews exist — no empty state, no form.
  if (reviewsQuery.isPending || data.items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-medium">
        Reviews {data.count > 0 ? `· ${data.average} ★ (${data.count})` : ""}
      </h2>
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
    </section>
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
    <section className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Enquire about {roomName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us your dates, party and budget — we reply shortly.
          </p>
        </div>
        <Button className="rounded-full" onClick={() => setOpen(true)}>
          Enquire now
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
