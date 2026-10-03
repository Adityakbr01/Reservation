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
import { useRoomTypes } from "@/modules/room-types";
import type { CreateRoomPayload, Room, RoomStatus } from "../types/room.types";

const STATUSES: RoomStatus[] = ["ACTIVE", "INACTIVE", "MAINTENANCE"];

interface RoomFormProps {
  initial?: Room;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (payload: CreateRoomPayload) => void;
}

export function RoomForm({ initial, submitLabel, isPending, onSubmit }: RoomFormProps) {
  const [roomTypeId, setRoomTypeId] = useState(initial?.roomTypeId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [roomNumber, setRoomNumber] = useState(initial?.roomNumber ?? "");
  const [floor, setFloor] = useState(initial?.floor ?? "");
  const [status, setStatus] = useState<RoomStatus>(initial?.status ?? "ACTIVE");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const { data: typesData } = useRoomTypes({ page: 1, limit: 100 });
  const roomTypes = typesData?.items ?? [];

  const invalid = name.trim().length === 0 || roomNumber.trim().length === 0 || !roomTypeId;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    onSubmit({
      roomTypeId,
      name: name.trim(),
      roomNumber: roomNumber.trim(),
      floor: floor.trim() || null,
      status,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Room type</Label>
        <Select value={roomTypeId} onValueChange={setRoomTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a room type" />
          </SelectTrigger>
          <SelectContent>
            {roomTypes.map((roomType) => (
              <SelectItem key={roomType.id} value={roomType.id}>
                {roomType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="room-name">Name</Label>
          <Input
            id="room-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deluxe 101"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="room-number">Room number</Label>
          <Input
            id="room-number"
            required
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="101"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="room-floor">Floor (optional)</Label>
          <Input
            id="room-floor"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as RoomStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="room-notes">Notes (optional)</Label>
        <textarea
          id="room-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Under renovation until…"
          className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <Button type="submit" className="h-11 rounded-full px-8" disabled={isPending || invalid}>
        {isPending ? (
          <>
            <Loader className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">Saving…</span>
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
