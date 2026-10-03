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
import { useRooms } from "@/modules/rooms";
import { BlockForm } from "../components/BlockForm";
import { AdminCalendar } from "../components/AdminCalendar";
import { useBlocks, useDeleteBlock } from "../hooks/use-availability";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AvailabilityPage() {
  const [roomId, setRoomId] = useState("all");
  const [page, setPage] = useState(1);
  const { data: roomsData } = useRooms({ page: 1, limit: 100 });
  const rooms = useMemo(() => roomsData?.items ?? [], [roomsData]);
  const roomLabel = useMemo(() => {
    const map = new Map(rooms.map((room) => [room.id, `${room.roomNumber} · ${room.name}`] as const));
    return (id: string) => map.get(id) ?? id.slice(-6);
  }, [rooms]);

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(roomId !== "all" ? { roomId } : {}),
    }),
    [page, roomId],
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

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">New block</CardTitle>
            <CardDescription>End date is exclusive — checkout day stays free</CardDescription>
          </CardHeader>
          <CardContent>
            <BlockForm />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
                  {rooms.map((room) => (
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
                        {formatDate(block.startDate)} → {formatDate(block.endDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-destructive hover:text-destructive"
                          disabled={isDeleting}
                          onClick={() => removeBlock(block.id)}
                        >
                          Remove
                        </Button>
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
