import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAvailabilityCalendar } from "../hooks/use-availability-search";
import type { CalendarDay } from "../api/availability.api";

function monthBounds(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${last}` };
}

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatPrice(minor: number | null | undefined, currency?: string): string | null {
  if (minor == null) return null;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency ?? "GBP",
      maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);
  } catch {
    return `£${(minor / 100).toFixed(0)}`;
  }
}

interface AvailabilityCalendarProps {
  roomTypeId: string;
  selectedCheckIn?: string | null;
  selectedCheckOut?: string | null;
  onPickDate?: (date: string) => void;
}

export function AvailabilityCalendar({
  roomTypeId,
  selectedCheckIn,
  selectedCheckOut,
  onPickDate,
}: AvailabilityCalendarProps) {
  const [now] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const { from, to } = monthBounds(year, month);
  const { data, isPending } = useAvailabilityCalendar(roomTypeId, from, to);
  const days = data?.types[0]?.days ?? [];
  const today = now.toISOString().slice(0, 10);

  const leadBlanks = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: Array<CalendarDay | null> = [
    ...Array<CalendarDay | null>(leadBlanks).fill(null),
    ...days,
  ];

  function stateOf(day: CalendarDay): "past" | "full" | "few" | "free" {
    if (day.date < today) return "past";
    if (day.available <= 0) return "full";
    if (day.available < day.total) return "few";
    return "free";
  }

  function inRange(date: string): boolean {
    if (!selectedCheckIn || !selectedCheckOut) return false;
    return date > selectedCheckIn && date < selectedCheckOut;
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Availability</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="size-8 rounded-full p-0"
            disabled={offset <= 0 || isPending}
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-28 text-center text-sm font-semibold">
            {monthLabel(year, month)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="size-8 rounded-full p-0"
            disabled={offset >= 2 || isPending}
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          aria-hidden
        >
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
            <span key={i} className="py-1">{d}</span>
          ))}
        </div>
        {isPending ? (
          <div className="grid grid-cols-7 gap-1" aria-label="Loading calendar">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} />;
              const state = stateOf(day);
              const isEndpoint = selectedCheckIn === day.date || selectedCheckOut === day.date;
              const clickable = onPickDate !== undefined && state === "free";
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={!clickable}
                  onClick={() => onPickDate?.(day.date)}
                  title={
                    state === "past"
                      ? day.date
                      : state === "full"
                        ? `${day.date}: full`
                        : `${day.date}: ${day.available} of ${day.total} free${formatPrice(day.price, day.currency) ? ` · ${formatPrice(day.price, day.currency)}` : ""}`
                  }
                  aria-label={`${day.date}: ${state === "free" ? `${day.available} free` : state}`}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center rounded-lg px-1 py-1 text-[13px] font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    state === "past" && "text-muted-foreground/30",
                    state === "full" && "bg-destructive/[0.07] text-destructive/70 line-through",
                    state === "few" && "bg-amber-400/15 text-amber-800 dark:text-amber-200",
                    state === "free" && !isEndpoint && !inRange(day.date) && "bg-emerald-500/[0.08] text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-200",
                    inRange(day.date) && "rounded-none bg-brand/10 text-foreground",
                    isEndpoint && "bg-brand font-semibold text-white hover:bg-brand",
                  )}
                >
                  <span>{Number(day.date.slice(8))}</span>
                  {state !== "past" && formatPrice(day.price, day.currency) && (
                    <span className="text-[10px] font-semibold leading-none opacity-90">{formatPrice(day.price, day.currency)}</span>
                  )}
                  {!isEndpoint && state !== "past" && (
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-1 rounded-full",
                        state === "full" && "bg-destructive/60",
                        state === "few" && "bg-amber-500",
                        state === "free" && "bg-emerald-500",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Free
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" /> Few left
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive/60" /> Full
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tap a free date to start your stay — tap a second date for check-out. Final
          availability is always rechecked at booking.
        </p>
      </CardContent>
    </Card>
  );
}

export default AvailabilityCalendar;
