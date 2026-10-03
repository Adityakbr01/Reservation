import { useMemo, useState } from "react";
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

type DayState = "past" | "full" | "left-few" | "free";

function dayState(day: CalendarDay | undefined, today: string): DayState {
  if (!day || day.date < today) return "past";
  if (day.available <= 0) return "full";
  if (day.available < day.total) return "left-few";
  return "free";
}

const DAY_CLASS: Record<DayState, string> = {
  past: "text-muted-foreground/40",
  full: "bg-destructive/15 text-destructive line-through",
  "left-few": "bg-amber-400/25 text-amber-700 dark:text-amber-300",
  free: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30",
};

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
  const view = useMemo(() => {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
  }, [now, offset]);
  const { from, to } = monthBounds(view.year, view.month);
  const { data, isPending } = useAvailabilityCalendar(roomTypeId, from, to);
  const dayList = data?.types[0]?.days;
  const byDate = useMemo(() => new Map((dayList ?? []).map((day) => [day.date, day])), [dayList]);
  const days = dayList ?? [];
  const today = now.toISOString().slice(0, 10);

  const leadBlanks = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const cells: Array<string | null> = [...Array<string | null>(leadBlanks).fill(null)];
  for (const day of days) cells.push(day.date);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl">Availability</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={offset <= 0 || isPending}
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {monthLabel(view.year, view.month)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={offset >= 2 || isPending}
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Next month"
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        {isPending ? (
          <div className="grid grid-cols-7 gap-1" aria-label="Loading calendar">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) =>
              date === null ? (
                <span key={`blank-${i}`} />
              ) : (
                <button
                  key={date}
                  type="button"
                  disabled={!onPickDate || dayState(byDate.get(date), today) !== "free"}
                  onClick={() => onPickDate?.(date)}
                  aria-label={`${date}: ${dayState(byDate.get(date), today).replace("-", " ")}`}
                  className={cn(
                    "h-9 rounded-md text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    dayState(byDate.get(date), today),
                    (selectedCheckIn === date || selectedCheckOut === date) &&
                      "ring-2 ring-brand",
                    DAY_CLASS[dayState(byDate.get(date), today)],
                  )}
                >
                  {Number(date.slice(8))}
                </button>
              ),
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-emerald-500/40" /> Free
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-amber-400/50" /> Few left
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-destructive/25" /> Full
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tap a free date to start your stay — tap a second date for check-out.
        </p>
      </CardContent>
    </Card>
  );
}

export default AvailabilityCalendar;
