import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BedDouble, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomTypeImage } from "@/components/common/RoomTypeImage";
import {
  parseAvailabilitySearchParams,
  useAvailabilitySearch,
} from "@/modules/availability";
import { useRoomTypeBySlug } from "../hooks/use-room-type";

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function RoomDetailPage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const search = useMemo(() => parseAvailabilitySearchParams(params), [params]);
  const {
    data: roomType,
    isPending: isTypePending,
    isError: isTypeError,
    refetch: refetchType,
  } = useRoomTypeBySlug(slug);
  const { data: availability } = useAvailabilitySearch(search);
  const match = availability?.results.find((item) => item.roomType.slug === slug);

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
        <div className="aspect-[21/9] w-full">
          <RoomTypeImage name={roomType.name} imageUrl={null} />
        </div>
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
              </span>
            </p>
          </div>

          {roomType.description && (
            <p className="leading-relaxed text-foreground">{roomType.description}</p>
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
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {match.rates.map((rate) => (
                    <li key={rate.ratePlanId} className="flex items-center justify-between gap-3 p-4">
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
                        <Button asChild size="sm" className="rounded-full">
                          <Link
                            to={`/booking/new?roomTypeId=${match.roomType.id}&ratePlanId=${rate.ratePlanId}&checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&roomName=${encodeURIComponent(match.roomType.name)}&rateName=${encodeURIComponent(rate.name)}`}
                          >
                            Book now
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Indicative total — confirmed again at booking.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RoomDetailPage;
