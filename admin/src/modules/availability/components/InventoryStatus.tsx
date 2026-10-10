import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { useRoomTypes } from "@/modules/room-types";
import { useRooms } from "@/modules/rooms";

function toInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultRange(): { checkIn: string; checkOut: string } {
  const inDate = new Date();
  inDate.setDate(inDate.getDate() + 7);
  const outDate = new Date();
  outDate.setDate(outDate.getDate() + 9);
  return { checkIn: toInputValue(inDate), checkOut: toInputValue(outDate) };
}

interface SearchHit {
  roomType: { id: string; name: string };
  availableCount: number;
}

/** Same engine the guest site uses — what the admin sees is what guests get. */
async function searchInventory(checkIn: string, checkOut: string): Promise<SearchHit[]> {
  const base =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "http://localhost:5000/api/v1";
  const publicBase = base.replace(/\/api\/v1\/?$/, "/api/public");
  const response = await apiClient.post<ApiEnvelope<{ results: SearchHit[] }>>(
    `${publicBase}/availability/search`,
    { checkIn, checkOut, adults: 2, children: 0, rooms: 1 },
  );
  return unwrapResponse(response).results ?? [];
}

type RowStatus = "Available" | "Few left" | "Full" | "Hidden";

const PILL: Record<RowStatus, string> = {
  Available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "Few left": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  Full: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  Hidden: "bg-muted text-muted-foreground",
};

/**
 * Live sell-out board: every cottage with free/total rooms for the chosen
 * dates, so staff can see at a glance what is full — including room types
 * the guest site hides when they have zero availability.
 */
export function InventoryStatus() {
  const [draft, setDraft] = useState(defaultRange);
  const [range, setRange] = useState(defaultRange);
  const { data: typesData } = useRoomTypes({ page: 1, limit: 100 });
  const { data: roomsData } = useRooms({ page: 1, limit: 200 });
  const valid = range.checkOut > range.checkIn;
  const search = useQuery({
    queryKey: ["inventory-status", range.checkIn, range.checkOut],
    queryFn: () => searchInventory(range.checkIn, range.checkOut),
    enabled: valid,
    staleTime: 30_000,
    retry: false,
  });

  const rows = useMemo(() => {
    const types = typesData?.items ?? [];
    const rooms = roomsData?.items ?? [];
    const hits = new Map((search.data ?? []).map((h) => [h.roomType.id, h.availableCount]));
    return types.map((t) => {
      const total = rooms.filter((r) => r.roomTypeId === t.id && r.status === "ACTIVE").length;
      if (t.status !== "ACTIVE") return { id: t.id, name: t.name, total, free: 0, status: "Hidden" as RowStatus };
      const free = hits.get(t.id);
      if (free === undefined || free <= 0)
        return { id: t.id, name: t.name, total, free: 0, status: "Full" as RowStatus };
      if (free < total) return { id: t.id, name: t.name, total, free, status: "Few left" as RowStatus };
      return { id: t.id, name: t.name, total, free, status: "Available" as RowStatus };
    });
  }, [typesData, roomsData, search.data]);

  const fullCount = rows.filter((r) => r.status === "Full").length;
  const activeRows = rows.filter((r) => r.status !== "Hidden");
  const soldOut = activeRows.length > 0 && activeRows.every((r) => r.status === "Full");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Inventory status</CardTitle>
        <CardDescription>
          {search.data
            ? `${fullCount} of ${activeRows.length} cottages full for these dates`
            : "What guests see for the chosen dates — full cottages included"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="inv-checkin">Check-in</Label>
            <Input
              id="inv-checkin"
              type="date"
              value={draft.checkIn}
              onChange={(e) => setDraft((d) => ({ ...d, checkIn: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-checkout">Check-out</Label>
            <Input
              id="inv-checkout"
              type="date"
              min={draft.checkIn}
              value={draft.checkOut}
              onChange={(e) => setDraft((d) => ({ ...d, checkOut: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            className="rounded-full sm:w-auto"
            disabled={!draft.checkIn || !draft.checkOut || draft.checkOut <= draft.checkIn || search.isFetching}
            onClick={() => setRange(draft)}
          >
            {search.isFetching ? "Checking…" : "Check"}
          </Button>
        </div>
        {!valid ? (
          <p className="text-sm text-destructive">Check-out must be after check-in.</p>
        ) : search.isPending ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" aria-label="Loading inventory status" />
        ) : search.isError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Could not load live availability.</p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void search.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {soldOut && (
              <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                Sold out — every cottage is full for {range.checkIn} → {range.checkOut}. An email alert is sent to the admin address on file.
              </p>
            )}
            <ul className="divide-y divide-border rounded-xl border border-border">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
                  <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {row.free}/{row.total} free
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${PILL[row.status]}`}
                  >
                    {row.status}
                  </span>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No room types yet.
                </li>
              )}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default InventoryStatus;
