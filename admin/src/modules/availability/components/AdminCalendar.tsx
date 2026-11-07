import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { getDefaultTimeZone } from "@/lib/date";
import { useCottages } from "@/modules/cottages";

interface CalendarDay {
  date: string;
  total: number;
  available: number;
  booked: number;
  blocked: number;
}

interface CalendarResponse {
  from: string;
  to: string;
  types: Array<{ roomTypeId: string; name: string; days: CalendarDay[] }>;
}

function monthBounds(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${last}` };
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: getDefaultTimeZone(),
  }).format(new Date(Date.UTC(year, month, 1)));
}

/** Ops month grid: booked vs blocked vs free per room type (docs 07 §36). */
export function AdminCalendar() {
  const [now] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const [cottageId, setCottageId] = useState("all");
  const { data: typesData } = useCottages({ page: 1, limit: 100 });
  const types = useMemo(() => typesData?.items ?? [], [typesData]);

  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const { from, to } = monthBounds(base.getUTCFullYear(), base.getUTCMonth());
  const { data, isPending } = useQuery({
    queryKey: ["admin", "calendar", cottageId, from, to],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CalendarResponse>>(
        "/public/availability/calendar",
        { params: { from, to, ...(cottageId !== "all" ? { roomTypeId: cottageId } : {}) } },
      );
      return unwrapResponse(response);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-xl">Month grid</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="cal-type" className="sr-only">
            Cottage
          </Label>
          <Select value={cottageId} onValueChange={setCottageId}>
            <SelectTrigger id="cal-type" className="w-44" aria-label="Cottage">
              <SelectValue placeholder="All cottages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cottages</SelectItem>
              {types.map((type: { id: string; name: string }) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={offset <= 0 || isPending}
            onClick={() => setOffset((o) => o - 1)}
          >
            ←
          </Button>
          <span className="min-w-28 text-center text-sm font-medium">
            {monthLabel(base.getUTCFullYear(), base.getUTCMonth())}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={offset >= 2 || isPending}
            onClick={() => setOffset((o) => o + 1)}
          >
            →
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading calendar" />
        ) : (
          (data?.types ?? []).map((type) => (
            <div key={type.roomTypeId} className="space-y-1">
              <p className="text-sm font-semibold">{type.name}</p>
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-10">
                {type.days.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.available}/${day.total} free (${day.booked} booked, ${day.blocked} blocked)`}
                    className={
                      day.available <= 0
                        ? "rounded-md bg-destructive/15 px-1 py-1.5 text-center text-xs font-medium text-destructive"
                        : day.available < day.total
                          ? "rounded-md bg-amber-400/20 px-1 py-1.5 text-center text-xs font-medium"
                          : "rounded-md bg-emerald-500/10 px-1 py-1.5 text-center text-xs text-muted-foreground"
                    }
                  >
                    {Number(day.date.slice(8))}
                    <span className="block text-[10px]">{day.available}/{day.total}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default AdminCalendar;
