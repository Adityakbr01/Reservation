import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useCreateRoom, useRooms, useRoomsOccupancy } from "../hooks/use-rooms";
import type { Room, RoomStatus } from "../types/room.types";

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

type SortField = "room" | "type" | "capacity" | "status" | "occupancy";
type SortDirection = "asc" | "desc";

function getRoomTypePrefix(typeName: string): string {
  const clean = typeName.replace(/^The\s+/i, "").trim();
  const letters = clean.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, 3) || "RM";
}

function getNextRoomSuggestion(
  roomType: { id: string; name: string },
  allRooms: Room[],
): { roomNumber: string; name: string } {
  const roomsOfType = allRooms.filter((r) => r.roomTypeId === roomType.id);
  let prefix = "";
  for (const r of roomsOfType) {
    const match = r.roomNumber.match(/^([A-Z]{2,4})-(\d+)$/i);
    if (match) {
      prefix = match[1].toUpperCase();
      break;
    }
  }
  if (!prefix) {
    prefix = getRoomTypePrefix(roomType.name);
  }

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`, "i");
  for (const r of allRooms) {
    const m = r.roomNumber.match(regex);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }
  const nextNum = maxNum + 1;
  const roomNumber = `${prefix}-${nextNum}`;
  const name = `${roomType.name} ${nextNum}`;
  return { roomNumber, name };
}

export function RoomsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [roomTypeId, setRoomTypeId] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("room");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [creatingTypeId, setCreatingTypeId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const { data: typesData } = useRoomTypes({ page: 1, limit: 100 });
  const roomTypes = useMemo(() => typesData?.items ?? [], [typesData]);
  const typeById = useMemo(
    () => new Map(roomTypes.map((type) => [type.id, type] as const)),
    [roomTypes],
  );
  const typeName = useMemo(() => {
    return (id?: string | null) => (id ? (typeById.get(id)?.name ?? (id.length > 6 ? id.slice(-6) : id)) : "—");
  }, [typeById]);

  // All rooms cache for global prefix calculation & inventory
  const allRoomsQuery = useRooms({ page: 1, limit: 500 });
  const allRooms = useMemo(() => allRoomsQuery.data?.items ?? [], [allRoomsQuery.data]);

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

  const createRoomMutation = useCreateRoom();

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      const roomNumA = String(a.roomNumber ?? (a as any).room_number ?? "");
      const roomNumB = String(b.roomNumber ?? (b as any).room_number ?? "");
      const roomTypeA = String(a.roomTypeId ?? (a as any).room_type_id ?? "");
      const roomTypeB = String(b.roomTypeId ?? (b as any).room_type_id ?? "");

      if (sortField === "room") {
        cmp = roomNumA.localeCompare(roomNumB, undefined, { numeric: true });
      } else if (sortField === "type") {
        cmp = typeName(roomTypeA).localeCompare(typeName(roomTypeB));
      } else if (sortField === "capacity") {
        const capA = typeById.get(roomTypeA)?.maxOccupancy ?? 0;
        const capB = typeById.get(roomTypeB)?.maxOccupancy ?? 0;
        cmp = capA - capB;
      } else if (sortField === "status") {
        cmp = String(a.status ?? "").localeCompare(String(b.status ?? ""));
      } else if (sortField === "occupancy") {
        const occA = occupancyByRoom.get(a.id)?.status ?? "FREE";
        const occB = occupancyByRoom.get(b.id)?.status ?? "FREE";
        cmp = occA.localeCompare(occB);
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [items, sortField, sortDirection, typeName, typeById, occupancyByRoom]);

  async function handleQuickCreate(type: { id: string; name: string }) {
    setCreatingTypeId(type.id);
    const suggestion = getNextRoomSuggestion(type, allRooms.length > 0 ? allRooms : items);
    try {
      await createRoomMutation.mutateAsync({
        roomTypeId: type.id,
        roomNumber: suggestion.roomNumber,
        name: suggestion.name,
        status: "ACTIVE",
      });
      void allRoomsQuery.refetch();
      void refetch();
    } finally {
      setCreatingTypeId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} physical rooms across all cottages` : "Actual bookable inventory"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-5 border-brand/40 bg-brand/5 hover:bg-brand/10 text-brand-dark font-medium shadow-xs"
            onClick={() => setQuickAddOpen(true)}
          >
            <Sparkles className="mr-2 size-4 text-brand" />
            1-Click Add Room
          </Button>
          <Button asChild className="h-11 rounded-full px-6">
            <Link to="/rooms/new">
              <Plus className="mr-1.5 size-4" />
              New room
            </Link>
          </Button>
        </div>
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
          <div className="mt-4 flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5"
              onClick={() => setQuickAddOpen(true)}
            >
              <Sparkles className="mr-2 size-4 text-brand" />
              1-Click Add Room
            </Button>
            <Button asChild className="h-11 rounded-full px-6">
              <Link to="/rooms/new">New room</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("room")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Room</span>
                    {sortField === "room" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="size-3.5 text-brand" />
                      ) : (
                        <ArrowDown className="size-3.5 text-brand" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Type</span>
                    {sortField === "type" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="size-3.5 text-brand" />
                      ) : (
                        <ArrowDown className="size-3.5 text-brand" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("capacity")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Capacity (Max Guests)</span>
                    {sortField === "capacity" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="size-3.5 text-brand" />
                      ) : (
                        <ArrowDown className="size-3.5 text-brand" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {sortField === "status" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="size-3.5 text-brand" />
                      ) : (
                        <ArrowDown className="size-3.5 text-brand" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("occupancy")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Occupancy</span>
                    {sortField === "occupancy" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="size-3.5 text-brand" />
                      ) : (
                        <ArrowDown className="size-3.5 text-brand" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((room) => {
                const occ = occupancyByRoom.get(room.id);
                const rTypeId = room.roomTypeId ?? (room as any).room_type_id;
                const type = typeById.get(rTypeId);
                const roomNum = room.roomNumber ?? (room as any).room_number ?? "—";
                return (
                  <TableRow key={room.id}>
                    <TableCell>
                      <div className="font-semibold font-mono text-foreground">{roomNum}</div>
                      <div className="text-xs text-muted-foreground">{room.name}</div>
                    </TableCell>
                    <TableCell className="font-medium">{typeName(rTypeId)}</TableCell>
                    <TableCell>
                      {type ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                            <Users className="size-3.5 text-brand shrink-0" />
                            Max {type.maxOccupancy} guests
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {type.maxAdults} adults{type.maxChildren > 0 ? ` · ${type.maxChildren} children` : " · adults only"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={room.status} />
                    </TableCell>
                    <TableCell>
                      {occ ? (
                        <span className="inline-flex flex-col items-start gap-0.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              OCCUPANCY_PILL[occ.status] ?? OCCUPANCY_PILL.FREE
                            }`}
                          >
                            {occ.status === "FREE"
                              ? "Free"
                              : occ.status === "OCCUPIED"
                              ? "Occupied"
                              : occ.status === "BLOCKED"
                              ? "Blocked"
                              : "On hold"}
                          </span>
                          {occ.bookingNumber && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {occ.bookingNumber}
                            </span>
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

      {/* 1-Click Quick Add Room Modal */}
      {quickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="1-Click Quick Add Room"
          onClick={() => setQuickAddOpen(false)}
        >
          <Card className="w-full max-w-lg shadow-2xl border-brand/20" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <Sparkles className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-xl">1-Click Quick Add Room</CardTitle>
                    <CardDescription>
                      Auto-names sequential units matching cottage codes (FER-1, FOX-1, etc.)
                    </CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setQuickAddOpen(false)}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 max-h-[65vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Select a cottage type below to instantly generate and add the next physical room to live inventory:
              </p>
              <div className="space-y-2.5">
                {roomTypes.map((type) => {
                  const pool = allRooms.length > 0 ? allRooms : items;
                  const suggestion = getNextRoomSuggestion(type, pool);
                  const currentUnits = pool.filter((r) => r.roomTypeId === type.id).length;
                  const isCreating = creatingTypeId === type.id;

                  return (
                    <div
                      key={type.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-brand/50 hover:bg-muted/30 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{type.name}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {currentUnits} {currentUnits === 1 ? "unit" : "units"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span>
                            Next: <strong className="text-brand-dark font-mono font-semibold">{suggestion.roomNumber}</strong> ({suggestion.name})
                          </span>
                          <span>•</span>
                          <span>Max {type.maxOccupancy} guests ({type.maxAdults} adults)</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 rounded-full h-8 px-3.5 text-xs font-semibold"
                        disabled={isCreating || createRoomMutation.isPending}
                        onClick={() => void handleQuickCreate(type)}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 size-3.5" />
                            Add {suggestion.roomNumber}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default RoomsPage;

