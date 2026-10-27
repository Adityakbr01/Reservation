import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  findFirstBlockedNight,
  isDayInRange,
  formatDisplayDate,
} from "@/lib/date";
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

function prettyDay(date: string): string {
  return formatDisplayDate(date, "EEE, d MMM");
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
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const { from, to } = monthBounds(year, month);
  const { data, isPending } = useAvailabilityCalendar(roomTypeId, from, to);
  const days = data?.types[0]?.days ?? [];
  const today = now.toISOString().slice(0, 10);

  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    for (const d of days) {
      if (d.available <= 0) set.add(d.date);
    }
    return set;
  }, [days]);

  const firstBlockedNight = useMemo(() => {
    if (!selectedCheckIn) return null;
    return findFirstBlockedNight(selectedCheckIn, blockedDates);
  }, [selectedCheckIn, blockedDates]);

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

  /** Confirmed from→to range (both endpoints chosen), excluding blocked dates. */
  function inRange(date: string): boolean {
    if (!selectedCheckIn || !selectedCheckOut) return false;
    return isDayInRange(date, selectedCheckIn, selectedCheckOut) && !blockedDates.has(date);
  }

  /** Live hover preview while choosing check-out after check-in. Cannot cross blocked dates. */
  function inPreview(date: string): boolean {
    if (!selectedCheckIn || selectedCheckOut || !hoverDate) return false;
    if (hoverDate <= selectedCheckIn) return false;
    const effectiveHover =
      firstBlockedNight && hoverDate >= firstBlockedNight ? firstBlockedNight : hoverDate;
    return date > selectedCheckIn && date < effectiveHover && !blockedDates.has(date);
  }

  function tooltipFor(day: CalendarDay, state: ReturnType<typeof stateOf>): string {
    const price = formatPrice(day.price, day.currency);
    if (state === "past") return day.date;
    if (state === "full") return `${prettyDay(day.date)}: fully booked night`;
    const stay = day.minNights != null && day.minNights > 1 ? ` · ${day.minNights}-night minimum stay` : "";
    return `${prettyDay(day.date)}${price ? `: ${price}` : ""} · ${day.available} of ${day.total} free${stay}`;
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
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
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setHoverDate(null)}>
            {cells.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} />;
              const state = stateOf(day);
              const isCheckIn = selectedCheckIn === day.date;
              const isCheckOut = selectedCheckOut === day.date;
              const isEndpoint = isCheckIn || isCheckOut;
              const preview = inPreview(day.date);
              const ranged = inRange(day.date);
              const isPastBlockedWall = Boolean(
                selectedCheckIn && !selectedCheckOut && firstBlockedNight && day.date >= firstBlockedNight
              );
              const clickable =
                onPickDate !== undefined &&
                (state === "free" || state === "few") &&
                !isPastBlockedWall;
              const price = state === "full" ? null : formatPrice(day.price, day.currency);
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={!clickable}
                  onClick={() => onPickDate?.(day.date)}
                  onMouseEnter={() => setHoverDate(day.date)}
                  onFocus={() => setHoverDate(day.date)}
                  title={tooltipFor(day, state)}
                  aria-label={`${prettyDay(day.date)}: ${state === "free" || state === "few" ? `${day.available} of ${day.total} free${price ? `, ${price}` : ""}${day.minNights != null && day.minNights > 1 ? `, ${day.minNights}-night minimum stay` : ""}` : state === "full" ? "fully booked" : state}${isCheckIn ? ", check-in" : ""}${isCheckOut ? ", check-out" : ""}`}
                  className={cn(
                    "group relative flex min-h-12 flex-col items-center justify-center rounded-lg px-1 py-1 text-[13px] font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    state === "past" && "text-muted-foreground/30",
                    state === "full" && !isEndpoint && "bg-destructive/[0.07] text-destructive/70 cursor-not-allowed opacity-60",
                    isPastBlockedWall && !isEndpoint && "cursor-not-allowed opacity-40",
                    state === "few" && !isEndpoint && !ranged && !preview && "bg-amber-400/15 text-amber-800 hover:bg-amber-400/25 dark:text-amber-200",
                    state === "free" && !isEndpoint && !ranged && !preview && "bg-emerald-500/[0.08] text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-200",
                    (ranged || preview) && !isEndpoint && !blockedDates.has(day.date) && "rounded-none bg-brand/20 font-semibold text-brand-900 dark:bg-brand/30 dark:text-brand-100",
                    preview && !blockedDates.has(day.date) && "border-y border-dashed border-brand/60",
                    isCheckIn && !isCheckOut && "rounded-l-lg rounded-r-none bg-brand font-semibold text-white hover:bg-brand",
                    isCheckOut && !isCheckIn && "rounded-r-lg rounded-l-none bg-brand font-semibold text-white hover:bg-brand",
                    isCheckIn && isCheckOut && "rounded-lg bg-brand font-semibold text-white hover:bg-brand",
                  )}
                >
                  {isEndpoint ? (
                    <span className="font-semibold">{Number(day.date.slice(8))}</span>
                  ) : state === "full" ? (
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-[11px] font-medium opacity-80">{Number(day.date.slice(8))}</span>
                      <span aria-hidden className="mt-0.5 text-[10px] font-bold text-destructive/80">✕</span>
                    </div>
                  ) : (
                    <>
                      <span>{Number(day.date.slice(8))}</span>
                      {price && (
                        <span className="text-[10px] font-semibold leading-none opacity-90">{price}</span>
                      )}
                    </>
                  )}
                  {!isEndpoint && !ranged && !preview && state !== "past" && state !== "full" && (
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-1 rounded-full",
                        state === "few" && "bg-amber-500",
                        state === "free" && "bg-emerald-500",
                      )}
                    />
                  )}
                  {/* Hover tooltip: price, availability, minimum stay */}
                  {state !== "past" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-44 -translate-x-1/2 rounded-md bg-night px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <span className="block font-semibold">{prettyDay(day.date)}{price ? ` · ${price}` : ""}</span>
                      <span className="block opacity-90">
                        {state === "full"
                          ? "Fully booked night"
                          : `${day.available} of ${day.total} free`}
                      </span>
                      {state !== "full" && day.minNights != null && day.minNights > 1 && (
                        <span className="block opacity-90">{day.minNights}-night minimum stay</span>
                      )}
                    </span>
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
            <span className="font-bold text-destructive/70">✕</span> Booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-brand" /> Selected
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Dates represent nights stayed. Check-out is the morning of your departure date. Final availability is always rechecked at booking.
        </p>
      </CardContent>
    </Card>
  );
}

export default AvailabilityCalendar;
