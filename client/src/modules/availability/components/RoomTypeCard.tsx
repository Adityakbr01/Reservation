import { BedDouble, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomTypeImage } from "@/components/common/RoomTypeImage";
import type { AvailabilitySearchParams, SearchResultItem } from "../types/availability.types";
import { toSearchRecord } from "../utils/search-params";

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function RoomTypeCard({
  item,
  search,
}: {
  item: SearchResultItem;
  search: AvailabilitySearchParams;
}) {
  const { roomType, availableCount, rates } = item;
  const lowStock = availableCount <= 2;
  const detailTo = {
    pathname: `/rooms/${roomType.slug}`,
    search: new URLSearchParams(toSearchRecord(search)).toString(),
  };

  return (
    <Card className="overflow-hidden shadow-card">
      <div className="aspect-[21/9] w-full border-b border-border">
        <RoomTypeImage name={roomType.name} />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">
              <Link
                to={detailTo}
                state={{ search }}
                className="hover:text-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {roomType.name}
              </Link>
            </CardTitle>
            <CardDescription>
              {roomType.shortDescription ?? `${roomType.maxAdults} adults · max ${roomType.maxOccupancy} guests`}
            </CardDescription>
          </div>
          <Badge variant={lowStock ? "warning" : "success"}>
            {availableCount} room{availableCount === 1 ? "" : "s"} left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden />
            {roomType.maxAdults} adults · {roomType.maxChildren} children · max {roomType.maxOccupancy}
          </span>
          <span className="inline-flex items-center gap-1">
            <BedDouble className="size-4" aria-hidden />
            {roomType.amenities.slice(0, 3).join(" · ") || "Standard amenities"}
          </span>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rates.map((rate) => (
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
                    to={`/booking/new?roomTypeId=${item.roomType.id}&ratePlanId=${rate.ratePlanId}&checkIn=${search.checkIn}&checkOut=${search.checkOut}&adults=${search.adults}&children=${search.children}&roomName=${encodeURIComponent(item.roomType.name)}&rateName=${encodeURIComponent(rate.name)}`}
                  >
                    Book now
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Indicative total — availability and price are confirmed again at booking.
        </p>
        <Link
          to={detailTo}
          state={{ search }}
          className="inline-block text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          View details →
        </Link>
      </CardContent>
    </Card>
  );
}
