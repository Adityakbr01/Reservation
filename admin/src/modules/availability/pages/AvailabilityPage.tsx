import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { useRooms } from "@/modules/rooms";
import { useRoomTypes } from "@/modules/room-types";
import { BlockForm } from "../components/BlockForm";
import { InventoryStatus } from "../components/InventoryStatus";
import { AdminCalendar } from "../components/AdminCalendar";
import { useBlocks, useDeleteBlock } from "../hooks/use-availability";

import { formatDisplayDate, countNights } from "@/lib/date";

export function AvailabilityPage() {
  const [cottageId, setCottageId] = useState("all");
  const [roomId, setRoomId] = useState("all");
  const [page, setPage] = useState(1);
  const { data: cottagesData } = useRoomTypes({ page: 1, limit: 100 });
  const cottages = useMemo(() => cottagesData?.items ?? [], [cottagesData]);
  const { data: roomsData } = useRooms({ page: 1, limit: 100 });
  const rooms = useMemo(() => roomsData?.items ?? [], [roomsData]);

  const filteredRooms = useMemo(() => {
    if (cottageId === "all") return rooms;
    return rooms.filter((r) => r.roomTypeId === cottageId);
  }, [cottageId, rooms]);

  const roomLabel = useMemo(() => {
    const map = new Map(rooms.map((room) => [room.id, `${room.roomNumber} · ${room.name}`] as const));
    return (id: string) => map.get(id) ?? id.slice(-6);
  }, [rooms]);

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(roomId !== "all" ? { roomId } : {}),
      ...(cottageId !== "all" && roomId === "all" ? { roomTypeId: cottageId } : {}),
    }),
    [page, roomId, cottageId],
  );
  const { data, isPending, isError, refetch } = useBlocks(filters);
  const { mutate: removeBlock, isPending: isDeleting } = useDeleteBlock();
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} manual blocks` : "Block rooms out of inventory"}
        </p>
      </div>

      <InventoryStatus />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">New block</CardTitle>
            <CardDescription>End date is exclusive — checkout day stays free</CardDescription>
          </CardHeader>
          <CardContent>
            <BlockForm cottages={cottages} rooms={rooms} />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label>Cottage</Label>
              <Select
                value={cottageId}
                onValueChange={(value) => {
                  setCottageId(value);
                  setRoomId("all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-48" aria-label="Filter blocks by cottage">
                  <SelectValue placeholder="All cottages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cottages</SelectItem>
                  {cottages.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Select
                value={roomId}
                onValueChange={(value) => {
                  setRoomId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-52" aria-label="Filter blocks by room">
                  <SelectValue placeholder="All rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rooms</SelectItem>
                  {filteredRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.roomNumber} · {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading blocks">
              {[0, 1].map((row) => (
                <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load blocks.</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="font-medium">No blocks</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every room is available unless blocked or booked.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Nights blocked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>
                        <div className="font-medium">{roomLabel(block.roomId)}</div>
                        {block.reason && (
                          <div className="text-xs text-muted-foreground">{block.reason}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatDisplayDate(block.startDate)} → {formatDisplayDate(block.endDate)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {countNights(block.startDate, block.endDate)} night{countNights(block.startDate, block.endDate) === 1 ? "" : "s"} · checkout {formatDisplayDate(block.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmButton
                          title="Remove this block?"
                          description="These dates become bookable again immediately."
                          confirmLabel="Remove"
                          triggerLabel="Remove"
                          pending={isDeleting}
                          onConfirm={() => removeBlock(block.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls page={data?.page ?? 1} totalPages={totalPages} onPage={setPage} />
            </>
          )}
        </div>
      </div>

      <AdminCalendar />
    </div>
  );
}

export default AvailabilityPage;
