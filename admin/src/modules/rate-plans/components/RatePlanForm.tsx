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
import type {
  CreateRatePlanPayload,
  PricingType,
  RatePlan,
  RatePlanStatus,
} from "../types/rate-plan.types";

const STATUSES: RatePlanStatus[] = ["DRAFT", "ACTIVE", "INACTIVE"];
const PRICING_TYPES: PricingType[] = ["PER_NIGHT", "PER_STAY"];

/**
 * Amounts display in major units (₹) and convert to minor units (paise)
 * on submit, matching the backend contract.
 */
function toMinorUnits(major: string): number {
  return Math.max(0, Math.round(Number(major) * 100) || 0);
}

function toMajorUnits(minor: number): string {
  return String(minor / 100);
}

interface RatePlanFormProps {
  initial?: RatePlan;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (payload: CreateRatePlanPayload) => void;
}

export function RatePlanForm({ initial, submitLabel, isPending, onSubmit }: RatePlanFormProps) {
  const [roomTypeId, setRoomTypeId] = useState(initial?.roomTypeId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pricingType, setPricingType] = useState<PricingType>(initial?.pricing.type ?? "PER_NIGHT");
  const [amount, setAmount] = useState(
    initial ? toMajorUnits(initial.pricing.amount) : "",
  );
  const [currency, setCurrency] = useState(initial?.pricing.currency ?? "INR");
  const [status, setStatus] = useState<RatePlanStatus>(initial?.status ?? "DRAFT");
  const { data: typesData } = useRoomTypes({ page: 1, limit: 100 });
  const roomTypes = typesData?.items ?? [];

  const invalid = name.trim().length < 2 || !roomTypeId || amount.trim().length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    onSubmit({
      roomTypeId,
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
      description: description.trim() || null,
      pricing: { type: pricingType, amount: toMinorUnits(amount), currency: currency.trim() || "INR" },
      status,
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
          <Label htmlFor="rp-name">Name</Label>
          <Input
            id="rp-name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Flexible rate"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rp-slug">Slug (optional)</Label>
          <Input
            id="rp-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Auto-generated from name"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Pricing type</Label>
          <Select value={pricingType} onValueChange={(value) => setPricingType(value as PricingType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICING_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "PER_NIGHT" ? "Per night" : "Per stay"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rp-amount">Amount (₹)</Label>
          <Input
            id="rp-amount"
            type="number"
            required
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="4500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rp-currency">Currency</Label>
          <Input
            id="rp-currency"
            required
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="INR"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rp-desc">Description (optional)</Label>
        <Input
          id="rp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Free cancellation up to 48h before check-in"
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as RatePlanStatus)}>
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
        <p className="text-xs text-muted-foreground">
          Stay restrictions and advance rules stay on defaults for now.
        </p>
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
