import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/common/PaginationControls";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRoomTypes } from "@/modules/room-types";
import { useRooms } from "../hooks/use-rooms";
import { useRoomsOccupancy } from "../hooks/use-rooms";
import type { RoomStatus } from "../types/room.types";

const STATUS_FILTERS = ["all", "ACTIVE", "INACTIVE", "MAINTENANCE"] as const;

import { addDays } from "date-fns";
import { toDayKey } from "@/lib/date";

function defaultRange(): { checkIn: string; checkOut: string } {
  const today = new Date();
  return { checkIn: toDayKey(today), checkOut: toDayKey(addDays(today, 1)) };
}

const OCCUPANCY_PILL: Record<string, string> = {
  FREE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  OCCUPIED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  BLOCKED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  HELD: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
};

export function RoomsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [roomTypeId, setRoomTypeId] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { data: typesData } = useRoomTypes({ page: 1, limit: 100 });
  const roomTypes = useMemo(() => typesData?.items ?? [], [typesData]);
  const typeName = useMemo(() => {
    const map = new Map(roomTypes.map((type) => [type.id, type.name] as const));
    return (id: string) => map.get(id) ?? id.slice(-6);
  }, [roomTypes]);

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      ...(status !== "all" ? { status: status as RoomStatus } : {}),
      ...(roomTypeId !== "all" ? { roomTypeId } : {}),
    }),
    [page, debouncedSearch, status, roomTypeId],
  );
  const { data, isPending, isError, refetch } = useRooms(filters);
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const [range, setRange] = useState(defaultRange);
  const occupancy = useRoomsOccupancy(range.checkIn, range.checkOut);
  const occupancyByRoom = useMemo(
    () => new Map((occupancy.data ?? []).map((o) => [o.roomId, o])),
    [occupancy.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} physical rooms` : "Actual bookable inventory"}
          </p>
        </div>
        <Button asChild className="h-11 rounded-full px-6">
          <Link to="/rooms/new">New room</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or number…"
          className="sm:max-w-xs"
          aria-label="Search rooms"
        />
        <Select
          value={roomTypeId}
          onValueChange={(value) => {
            setRoomTypeId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-52" aria-label="Filter by room type">
            <SelectValue placeholder="All room types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All room types</SelectItem>
            {roomTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as (typeof STATUS_FILTERS)[number]);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "all" ? "All statuses" : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="rooms-checkin">Occupancy from</Label>
          <Input
            id="rooms-checkin"
            type="date"
            value={range.checkIn}
            onChange={(e) => setRange((r) => ({ ...r, checkIn: e.target.value }))}
            className="sm:w-44"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rooms-checkout">to</Label>
          <Input
            id="rooms-checkout"
            type="date"
            min={range.checkIn}
            value={range.checkOut}
            onChange={(e) => setRange((r) => ({ ...r, checkOut: e.target.value }))}
            className="sm:w-44"
          />
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          Live occupancy for these dates — blocked, booked, on hold or free.
        </p>
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading rooms">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load rooms.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No rooms yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add physical rooms under a room type to build inventory.
          </p>
          <Button asChild className="mt-4 h-11 rounded-full px-6">
            <Link to="/rooms/new">New room</Link>
          </Button>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((room) => {
                const occ = occupancyByRoom.get(room.id);
                return (
                <TableRow key={room.id}>
                  <TableCell>
                    <div className="font-medium">{room.roomNumber}</div>
                    <div className="text-xs text-muted-foreground">{room.name}</div>
                  </TableCell>
                  <TableCell>{typeName(room.roomTypeId)}</TableCell>
                  <TableCell>
                    <StatusBadge status={room.status} />
                  </TableCell>
                  <TableCell>
                    {occ ? (
                      <span className="inline-flex flex-col items-start gap-0.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${OCCUPANCY_PILL[occ.status] ?? OCCUPANCY_PILL.FREE}`}>
                          {occ.status === "FREE" ? "Free" : occ.status === "OCCUPIED" ? "Occupied" : occ.status === "BLOCKED" ? "Blocked" : "On hold"}
                        </span>
                        {occ.bookingNumber && (
                          <span className="text-[11px] text-muted-foreground">{occ.bookingNumber}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="rounded-full">
                      <Link to={`/rooms/${room.id}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationControls page={data?.page ?? 1} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default RoomsPage;
