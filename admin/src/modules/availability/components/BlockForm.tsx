import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader } from "lucide-react";
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
import { useRooms } from "@/modules/rooms";
import type { Room } from "@/modules/rooms";
import { useRoomTypes } from "@/modules/room-types";
import type { RoomType } from "@/modules/room-types";
import { useCreateBlock } from "../hooks/use-availability";

function toISODate(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

export interface BlockFormProps {
  cottages?: RoomType[];
  rooms?: Room[];
}

export function BlockForm({
  cottages: propCottages,
  rooms: propRooms,
}: BlockFormProps = {}) {
  const [cottageId, setCottageId] = useState("");
  const [blockScope, setBlockScope] = useState<"all" | "specific">("all");
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateBlock();
  const { data: cottagesData } = useRoomTypes({ page: 1, limit: 100 });
  const cottages = propCottages ?? cottagesData?.items ?? [];

  const { data: roomsData } = useRooms({ page: 1, limit: 100 });
  const rooms = propRooms ?? roomsData?.items ?? [];

  const cottageRooms = useMemo(() => {
    if (!cottageId) return [];
    return rooms.filter((r) => String(r.roomTypeId) === String(cottageId));
  }, [cottageId, rooms]);

  const selectedCottage = useMemo(
    () => cottages.find((c) => String(c.id) === String(cottageId)),
    [cottageId, cottages],
  );

  const invalid =
    !cottageId ||
    cottageRooms.length === 0 ||
    (blockScope === "specific" && !roomId) ||
    !startDate ||
    !endDate;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    if (startDate >= endDate) {
      setRangeError("End date must be after start date.");
      return;
    }
    setRangeError(null);

    const payload =
      blockScope === "all"
        ? {
            roomTypeId: cottageId,
            startDate: toISODate(startDate),
            endDate: toISODate(endDate),
            reason: reason.trim() || null,
          }
        : {
            roomId,
            startDate: toISODate(startDate),
            endDate: toISODate(endDate),
            reason: reason.trim() || null,
          };

    mutate(payload, {
      onSuccess: () => {
        setStartDate("");
        setEndDate("");
        setReason("");
        setRoomId("");
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cottage selection */}
      <div className="space-y-2">
        <Label>Cottage</Label>
        <Select
          value={cottageId}
          onValueChange={(val) => {
            setCottageId(val);
            setRoomId("");
            setBlockScope("all");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a cottage" />
          </SelectTrigger>
          <SelectContent>
            {cottages.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info on how many rooms this cottage has + scope options */}
      {selectedCottage && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selectedCottage.name}
            </span>{" "}
            has{" "}
            <span className="font-semibold text-foreground">
              {cottageRooms.length} room{cottageRooms.length === 1 ? "" : "s"}
            </span>
            {cottageRooms.length > 0 && (
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                ({cottageRooms.map((r) => `${r.roomNumber} · ${r.name}`).join(", ")})
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Rooms to block</Label>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="blockScope"
                  value="all"
                  checked={blockScope === "all"}
                  onChange={() => setBlockScope("all")}
                  className="accent-brand"
                />
                <span className="font-medium">
                  Block all rooms in this cottage ({cottageRooms.length} room
                  {cottageRooms.length === 1 ? "" : "s"})
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="blockScope"
                  value="specific"
                  checked={blockScope === "specific"}
                  onChange={() => setBlockScope("specific")}
                  className="accent-brand"
                />
                <span>Block a specific room in this cottage</span>
              </label>
            </div>
          </div>

          {blockScope === "specific" && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">Specific room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {cottageRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.roomNumber} · {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="block-start">Start date</Label>
          <Input
            id="block-start"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="block-end">End date (exclusive)</Label>
          <Input
            id="block-end"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      {rangeError && <p className="text-xs text-error">{rangeError}</p>}

      <div className="space-y-2">
        <Label htmlFor="block-reason">Reason (optional)</Label>
        <Input
          id="block-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Deep cleaning"
        />
      </div>

      <Button
        type="submit"
        className="h-11 rounded-full px-8"
        disabled={isPending || invalid}
      >
        {isPending ? (
          <>
            <Loader className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">Adding…</span>
          </>
        ) : (
          "Add block"
        )}
      </Button>
    </form>
  );
}
