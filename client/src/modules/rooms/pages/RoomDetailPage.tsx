import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { BedDouble, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomTypeImage } from "@/components/common/RoomTypeImage";
import { useMediaUrls } from "@/modules/media";
import {
  AvailabilityCalendar,
  parseAvailabilitySearchParams,
  useAvailabilitySearch,
} from "@/modules/availability";
import { fetchAmenities, fetchSettings } from "@/modules/amenities/api/amenities.api";
import { fetchReviews, submitReview } from "@/modules/reviews/api/reviews.api";
import { EnquiryForm } from "@/modules/enquiry/components/EnquiryForm";
import { Dialog } from "@/components/ui/dialog";
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
  const match = availability?.results.find((item) => item.roomType.slug === slug);
  const [picked, setPicked] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const gallery = useMemo(() => {
    const media = (roomType as unknown as { media?: Array<{ mediaId: string; kind: string; altText: string | null; sortOrder: number }> })?.media;
    if (media && media.length > 0) return [...media].sort((a, b) => a.sortOrder - b.sortOrder);
    return [...(roomType?.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => ({ ...i, kind: "image" }));
  }, [roomType]);
  const mediaIds = useMemo(() => gallery.map((g) => g.mediaId), [gallery]);
  const { data: photos } = useMediaUrls(mediaIds);
  const photoById = useMemo(() => new Map((photos ?? []).map((p) => [p.id, p])), [photos]);
  const coverPhoto = gallery.length > 0 ? photoById.get(gallery[Math.min(galleryIndex, gallery.length - 1)]?.mediaId ?? "") : undefined;
  const { data: amenities } = useQuery({ queryKey: ["amenities-public"], queryFn: fetchAmenities, staleTime: 300_000 });
  const { data: settings } = useQuery({ queryKey: ["site-settings-public"], queryFn: fetchSettings, staleTime: 300_000 });
  const { data: floorplanPhotos } = useMediaUrls(roomType?.floorplanMediaIds ?? []);
  const { data: hamperPhoto } = useMediaUrls(roomType?.welcomeHamperImageMediaId ? [roomType.welcomeHamperImageMediaId] : []);
  const reviewsQuery = useQuery({
    queryKey: ["reviews", roomType?.id],
    queryFn: () => fetchReviews(roomType?.id as string),
    enabled: !!roomType?.id,
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
      <div className="space-y-6 pb-8" aria-busy="true" aria-label="Loading room details">
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
            <CardDescription>This room type does not exist or is unavailable.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button className="flex-1 rounded-full" onClick={() => void refetchType()}>
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
  const mapUrl = roomType.mapEmbedUrl || (roomType.mapLat != null && roomType.mapLng != null ? osmEmbed(roomType.mapLat, roomType.mapLng) : null);

  return (
    <div className="space-y-6 pb-8">
      <Link
        to="/"
        state={search ? { search } : undefined}
        className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        ← Back to search
      </Link>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="aspect-[21/9] w-full bg-muted">
          {gallery[galleryIndex]?.kind === "video" && coverPhoto?.url ? (
            <video src={coverPhoto.url} className="h-full w-full bg-black" controls preload="metadata" />
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
                    <span className="flex h-full w-full items-center justify-center bg-black text-xs text-white">▶ Video</span>
                  ) : p?.url ? (
                    <img src={p.url} alt={g.altText ?? ""} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-muted text-xs">{g.mediaId.slice(-6)}</span>
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
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-4" aria-hidden />
                {roomType.maxAdults} adults · {roomType.maxChildren} children · max{" "}
                {roomType.maxOccupancy}
                {roomType.bedrooms != null ? ` · ${roomType.bedrooms} bedrooms` : ""}
                {roomType.maxDogs != null && roomType.maxDogs > 0 ? ` · ${roomType.maxDogs} dog${roomType.maxDogs === 1 ? "" : "s"} allowed` : ""}
              </span>
            </p>
          </div>

          {roomType.description && (
            <p className="leading-relaxed text-foreground">{roomType.description}</p>
          )}

          {linkedAmenities.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-medium">Features</h2>
              <AmenityChips amenities={linkedAmenities} />
            </section>
          )}

          {roomType.amenities.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-medium">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {roomType.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {roomType.beds.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-medium">Beds</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {roomType.beds.map((bed, index) => (
                  <li key={index} className="inline-flex items-center gap-1">
                    <BedDouble className="size-4" aria-hidden />
                    {bed.type} × {bed.quantity}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {roomType.welcomeHamperIncluded && (
            <section className="space-y-2 rounded-xl border border-border p-4">
              <h2 className="font-medium">Welcome hamper included</h2>
              {roomType.welcomeHamperDescription && <p className="text-sm text-muted-foreground">{roomType.welcomeHamperDescription}</p>}
              {hamperPhoto?.[0]?.url && <img src={hamperPhoto[0].url} alt="Welcome hamper" className="mt-2 h-48 w-full rounded-xl object-cover" loading="lazy" />}
            </section>
          )}

          <section className="space-y-2">
            <h2 className="font-medium">Property details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {roomType.layoutHtml && (
                <Card><CardContent className="p-4"><h3 className="text-sm font-semibold">Layout</h3><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{roomType.layoutHtml}</p></CardContent></Card>
              )}
              {(floorplanPhotos ?? []).length > 0 && (
                <Card><CardContent className="space-y-2 p-4"><h3 className="text-sm font-semibold">Floorplan</h3>{(floorplanPhotos ?? []).map((f) => (<img key={f.id} src={f.url} alt={f.alt ?? "Floorplan"} className="w-full rounded-lg border border-border" loading="lazy" />))}</CardContent></Card>
              )}
              {(roomType.locationText || mapUrl) && (
                <Card><CardContent className="space-y-2 p-4"><h3 className="text-sm font-semibold">Location</h3>{roomType.locationText && <p className="text-sm text-muted-foreground">{roomType.locationText}</p>}{mapUrl && (<iframe title="Map" src={mapUrl} className="h-56 w-full rounded-lg border border-border" loading="lazy" />)}</CardContent></Card>
              )}
              {roomType.surroundingsHtml && (
                <Card><CardContent className="p-4"><h3 className="text-sm font-semibold">Surrounding local area</h3><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{roomType.surroundingsHtml}</p></CardContent></Card>
              )}
            </div>
          </section>

          {(settings?.whyBookWithUs ?? []).length > 0 && (
            <section className="space-y-2">
              <h2 className="font-medium">Why book with us?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(settings?.whyBookWithUs ?? []).map((w, i) => (
                  <Card key={i}><CardContent className="p-4"><p className="text-sm font-semibold">{w.title}</p>{w.text && <div className="rich-body mt-1 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: w.text }} />}</CardContent></Card>
                ))}
              </div>
            </section>
          )}

          <AvailabilityCalendar
            roomTypeId={roomType.id}
            selectedCheckIn={picked[0] ?? search?.checkIn ?? null}
            selectedCheckOut={picked[1] ?? search?.checkOut ?? null}
            onPickDate={pickDate}
          />

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
                  {match.availableCount} room{match.availableCount === 1 ? "" : "s"} available
                </p>
                <p className="text-xs text-muted-foreground">
                  From {formatMoney(Math.min(...match.rates.map((r) => r.total)), match.rates[0]?.currency ?? "GBP")} total for {match.rates[0]?.nightly?.length ?? ""} nights · including taxes and fees
                </p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {match.rates.map((rate) => (
                    <li key={rate.ratePlanId} className="gap-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{rate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(rate.perNight, rate.currency)}
                            {rate.pricingType === "PER_NIGHT" ? " / night" : " / stay"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-display text-xl font-light">
                            {formatMoney(rate.total, rate.currency)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Total</p>
                          <Button asChild size="sm" className="btn-shine rounded-full">
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
                          <summary className="cursor-pointer text-muted-foreground">Price details</summary>
                          <ul className="mt-1 divide-y divide-border">
                            {rate.nightly.map((n) => (
                              <li key={n.date} className="flex justify-between py-0.5">
                                <span className="text-muted-foreground">{n.date}</span>
                                <span>{formatMoney(n.price, rate.currency)}</span>
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

function AmenityChips({ amenities }: { amenities: Array<{ id: string; name: string; imageMediaId: string | null }> }) {
  const { data: photos } = useMediaUrls(amenities.map((a) => a.imageMediaId).filter((id): id is string => Boolean(id)));
  const byId = new Map((photos ?? []).map((p) => [p.id, p]));
  return (
    <div className="flex flex-wrap gap-2">
      {amenities.map((a) => {
        const img = a.imageMediaId ? byId.get(a.imageMediaId) : undefined;
        return (
          <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
            {img?.url && <img src={img.url} alt="" className="size-5 rounded-full object-cover" loading="lazy" />}
            {a.name}
          </span>
        );
      })}
    </div>
  );
}

function ReviewsBlock({ roomTypeId, reviewsQuery }: { roomTypeId: string; reviewsQuery: ReturnType<typeof useQuery> }) {
  const queryClient = useQueryClient();
  const data = (reviewsQuery.data ?? { items: [], average: 0, count: 0 }) as { items: Array<{ id: string; authorName: string; rating: number; title: string | null; body: string }>; average: number; count: number };
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const mutation = useMutation({
    mutationFn: () => submitReview({ roomTypeId, rating: Number(rating), body: body.trim() }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["reviews", roomTypeId] });
      toast.success("Review submitted for moderation — only completed stays are eligible");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Only guests with a completed stay can review"),
  });
  return (
    <section className="space-y-3">
      <h2 className="font-medium">Reviews {data.count > 0 ? `· ${data.average} ★ (${data.count})` : ""}</h2>
      {reviewsQuery.isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet — be the first after your stay.</p>
      ) : (
        <div className="grid gap-3">
          {data.items.map((r) => (
            <Card key={r.id}><CardContent className="p-4"><p className="text-sm font-medium">{r.authorName} · {"★".repeat(r.rating)}</p><p className="mt-1 text-sm text-muted-foreground">{r.title ? `${r.title} — ` : ""}{r.body}</p></CardContent></Card>
          ))}
        </div>
      )}
      <div className="grid gap-2 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">Write a review (completed stays only)</p>
        <div className="flex gap-2">
          <div className="space-y-1"><Label htmlFor="rev-rating">Rating</Label><Input id="rev-rating" type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} className="w-24" /></div>
        </div>
        <div className="space-y-1"><Label htmlFor="rev-body">Review</Label><textarea id="rev-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="How was your stay?" /></div>
        <Button className="w-fit rounded-full" disabled={mutation.isPending || body.trim().length < 4} onClick={() => mutation.mutate()}>{mutation.isPending ? "Submitting…" : "Submit review"}</Button>
      </div>
    </section>
  );
}

function EnquireAboutRoom({ roomTypeId, roomName }: { roomTypeId: string; roomName: string }) {
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
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="enquiry-dialog-title">
        <h2 id="enquiry-dialog-title" className="pr-10 font-display text-2xl font-light tracking-tight">
          Enquire about {roomName}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Holiday budget, party size, dates, location, dog friendly — anything helps.
        </p>
        <EnquiryForm roomTypeId={roomTypeId} roomName={roomName} onSuccess={() => setOpen(false)} />
      </Dialog>
    </section>
  );
}

export default RoomDetailPage;
