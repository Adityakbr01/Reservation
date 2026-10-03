import { useState } from "react";
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
import { useCreateBlock } from "../hooks/use-availability";

function toISODate(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

export function BlockForm() {
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const { mutate, isPending } = useCreateBlock();
  const { data: roomsData } = useRooms({ page: 1, limit: 100 });
  const rooms = roomsData?.items ?? [];

  const invalid = !roomId || !startDate || !endDate;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    if (startDate >= endDate) {
      setRangeError("End date must be after start date.");
      return;
    }
    setRangeError(null);
    mutate(
      {
        roomId,
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        reason: reason.trim() || null,
      },
      {
        onSuccess: () => {
          setStartDate("");
          setEndDate("");
          setReason("");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Room</Label>
        <Select value={roomId} onValueChange={setRoomId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.roomNumber} · {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
      <Button type="submit" className="h-11 rounded-full px-8" disabled={isPending || invalid}>
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
