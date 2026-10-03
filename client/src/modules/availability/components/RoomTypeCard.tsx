import { BedDouble, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SearchResultItem } from "../types/availability.types";

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function RoomTypeCard({ item }: { item: SearchResultItem }) {
  const { roomType, availableCount, rates } = item;
  const lowStock = availableCount <= 2;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">{roomType.name}</CardTitle>
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
              <p className="font-display text-xl font-light">{formatMoney(rate.total, rate.currency)}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Indicative total — availability and price are confirmed again at booking.
        </p>
      </CardContent>
    </Card>
  );
}
