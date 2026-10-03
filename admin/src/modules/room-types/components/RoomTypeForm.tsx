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
import type {
  CreateRoomTypePayload,
  RoomType,
  RoomTypeBed,
  RoomTypeStatus,
} from "../types/room-type.types";

const STATUSES: RoomTypeStatus[] = ["DRAFT", "ACTIVE", "INACTIVE"];

interface RoomTypeFormProps {
  initial?: RoomType;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (payload: CreateRoomTypePayload) => void;
}

export function RoomTypeForm({ initial, submitLabel, isPending, onSubmit }: RoomTypeFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [maxAdults, setMaxAdults] = useState(String(initial?.maxAdults ?? 2));
  const [maxChildren, setMaxChildren] = useState(String(initial?.maxChildren ?? 0));
  const [maxOccupancy, setMaxOccupancy] = useState(String(initial?.maxOccupancy ?? 2));
  const [amenities, setAmenities] = useState((initial?.amenities ?? []).join(", "));
  const [status, setStatus] = useState<RoomTypeStatus>(initial?.status ?? "DRAFT");
  const [beds, setBeds] = useState<RoomTypeBed[]>(
    initial?.beds.length ? initial.beds : [{ type: "", quantity: 1 }],
  );

  const invalid = name.trim().length < 2;

  function updateBed(index: number, patch: Partial<RoomTypeBed>) {
    setBeds((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    onSubmit({
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
      shortDescription: shortDescription.trim() || null,
      description: description.trim() || null,
      maxAdults: Math.max(1, Number(maxAdults) || 1),
      maxChildren: Math.max(0, Number(maxChildren) || 0),
      maxOccupancy: Math.max(1, Number(maxOccupancy) || 1),
      beds: beds.filter((bed) => bed.type.trim().length > 0),
      amenities: amenities
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rt-name">Name</Label>
          <Input
            id="rt-name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deluxe Room"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-slug">Slug (optional)</Label>
          <Input
            id="rt-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Auto-generated from name"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rt-adults">Max adults</Label>
          <Input
            id="rt-adults"
            type="number"
            required
            min={1}
            value={maxAdults}
            onChange={(e) => setMaxAdults(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-children">Max children</Label>
          <Input
            id="rt-children"
            type="number"
            required
            min={0}
            value={maxChildren}
            onChange={(e) => setMaxChildren(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rt-occupancy">Max occupancy</Label>
          <Input
            id="rt-occupancy"
            type="number"
            required
            min={1}
            value={maxOccupancy}
            onChange={(e) => setMaxOccupancy(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rt-short">Short description</Label>
        <Input
          id="rt-short"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="One-line highlight"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rt-desc">Description</Label>
        <textarea
          id="rt-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Full room description"
          className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-3">
        <Label>Beds</Label>
        {beds.map((bed, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={bed.type}
              onChange={(e) => updateBed(index, { type: e.target.value })}
              placeholder="King bed"
              aria-label={`Bed ${index + 1} type`}
            />
            <Input
              type="number"
              min={1}
              value={bed.quantity}
              onChange={(e) => updateBed(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
              className="w-24"
              aria-label={`Bed ${index + 1} quantity`}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={beds.length <= 1}
              onClick={() => setBeds((rows) => rows.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setBeds((rows) => [...rows, { type: "", quantity: 1 }])}
        >
          Add bed
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rt-amenities">Amenities (comma separated)</Label>
        <Input
          id="rt-amenities"
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          placeholder="WiFi, AC, Sea view"
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as RoomTypeStatus)}>
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
