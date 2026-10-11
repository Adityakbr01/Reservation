import { ArrowRight, BedDouble, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomTypeImage } from "@/components/common/RoomTypeImage";
import { useMediaUrls } from "@/modules/media";
import type { AvailabilitySearchParams, SearchResultItem } from "../types/availability.types";
import { toSearchRecord } from "../utils/search-params";

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

export function RoomTypeCard({
  item,
  search,
}: {
  item: SearchResultItem;
  search: AvailabilitySearchParams;
}) {
  const { roomType, availableCount, rates } = item;
  const soldOut = availableCount <= 0;
  const galleryMedia = (roomType as unknown as { media?: Array<{ mediaId: string; kind: string; sortOrder: number }> }).media;
  const coverId =
    galleryMedia && galleryMedia.length > 0
      ? (([...galleryMedia].sort((a, b) => a.sortOrder - b.sortOrder).find((m) => m.kind !== "video") ??
        [...galleryMedia].sort((a, b) => a.sortOrder - b.sortOrder)[0])?.mediaId)
      : [...(roomType.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.mediaId;
  const { data: photos } = useMediaUrls(coverId ? [coverId] : []);
  const coverPhoto = photos?.[0];
  const detailTo = {
    pathname: `/rooms/${roomType.slug}`,
    search: new URLSearchParams(toSearchRecord(search)).toString(),
  };

  return (
    <Card className="room-card flex h-full flex-col overflow-hidden shadow-card sm:flex-row">
      <div className="p-2.5 pb-0 sm:w-[38%] sm:shrink-0 sm:py-2.5 sm:pl-2.5 sm:pr-0">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl sm:aspect-auto sm:h-full sm:min-h-[240px]">
          <RoomTypeImage
            name={roomType.name}
            imageUrl={coverPhoto?.url ?? null}
            alt={coverPhoto?.alt}
            className="absolute inset-0"
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-display text-xl font-medium">
            <Link
              to={detailTo}
              state={{ search }}
              className="hover:text-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {roomType.name}
            </Link>
          </CardTitle>
          <CardDescription className="mt-1 line-clamp-2">
            {roomType.shortDescription ?? `${roomType.maxAdults} adults · max ${roomType.maxOccupancy} guests`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-3 p-4 pt-0">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden />
            {roomType.maxAdults} adults · {roomType.maxChildren} children · max {roomType.maxOccupancy}
          </span>
          <span className="inline-flex items-center gap-1">
            <BedDouble className="size-4" aria-hidden />
            {roomType.amenities.slice(0, 3).join(" · ") || "Standard amenities"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          From <span className="text-base font-bold text-foreground">{formatMoney(Math.min(...rates.map((r) => r.perNight)), rates[0]?.currency ?? "GBP")}</span> Per Night
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          From {formatMoney(Math.min(...rates.map((r) => r.total)), rates[0]?.currency ?? "GBP")} total for {search.checkIn} → {search.checkOut} · incl. taxes & fees
        </p>
        {soldOut && (
          <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Fully booked for these dates — try different dates, or view details.
          </p>
        )}
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rates.map((rate) => (
            <li key={rate.ratePlanId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{rate.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(rate.perNight, rate.currency)}
                  {rate.pricingType === "PER_NIGHT" ? " / night" : " / stay"}
                  {rate.nightly && rate.nightly.length > 0 ? ` · ${rate.nightly.length} nights` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <p className="font-display text-lg font-light">
                  {formatMoney(rate.total, rate.currency)}
                </p>
                <p className="text-[11px] text-muted-foreground">Total</p>
                {soldOut ? (
                  <Button size="sm" disabled className="rounded-full">
                    Sold out
                  </Button>
                ) : (
                  <Button asChild size="sm" className="btn-shine rounded-full">
                    <Link
                      to={`/booking/new?roomTypeId=${item.roomType.id}&ratePlanId=${rate.ratePlanId}&checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms ?? 1}&roomName=${encodeURIComponent(item.roomType.name)}&rateName=${encodeURIComponent(rate.name)}&roomSlug=${item.roomType.slug}`}
                      state={{ from: `/rooms/${item.roomType.slug}`, roomSlug: item.roomType.slug }}
                    >
                      Book now
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Indicative total — availability and price are confirmed again at booking.
        </p>
        <div className="mt-auto flex gap-2 pt-1">
          <Button asChild variant="outline" className="btn-arrow flex-1 rounded-full">
            <Link to={detailTo} state={{ search }}>
              View details
              <ArrowRight className="arrow-icon size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
      </div>
    </Card>
  );
}
