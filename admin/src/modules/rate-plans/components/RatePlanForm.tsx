import { useState } from "react";
import type { FormEvent } from "react";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/common/StatusBadge";
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
  const [minNights, setMinNights] = useState(initial?.restrictions?.minNights != null ? String(initial.restrictions.minNights) : "");
  const [maxNights, setMaxNights] = useState(initial?.restrictions?.maxNights != null ? String(initial.restrictions.maxNights) : "");
  const [minAdvanceDays, setMinAdvanceDays] = useState(initial?.restrictions?.minAdvanceDays != null ? String(initial.restrictions.minAdvanceDays) : "");
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(initial?.restrictions?.maxAdvanceDays != null ? String(initial.restrictions.maxAdvanceDays) : "");
  const [validFrom, setValidFrom] = useState(initial?.restrictions?.validFrom ? String(initial.restrictions.validFrom).slice(0, 10) : "");
  const [validUntil, setValidUntil] = useState(initial?.restrictions?.validUntil ? String(initial.restrictions.validUntil).slice(0, 10) : "");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.restrictions?.daysOfWeek ?? []);
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
      restrictions: {
        minNights: minNights.trim() ? Math.max(1, Number(minNights) || 1) : null,
        maxNights: maxNights.trim() ? Math.max(1, Number(maxNights) || 1) : null,
        minAdvanceDays: minAdvanceDays.trim() ? Math.max(0, Number(minAdvanceDays) || 0) : null,
        maxAdvanceDays: maxAdvanceDays.trim() ? Math.max(0, Number(maxAdvanceDays) || 0) : null,
        validFrom: validFrom.trim() ? new Date(`${validFrom}T00:00:00Z`).toISOString() : null,
        validUntil: validUntil.trim() ? new Date(`${validUntil}T00:00:00Z`).toISOString() : null,
        daysOfWeek: [...daysOfWeek].sort(),
      },
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
          <Label htmlFor="rp-amount">Amount</Label>
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
        <Label htmlFor="rp-desc">Description (optional — shown as rate policy at checkout)</Label>
        <Input
          id="rp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Advance Purchase — fully prepaid, non refundable"
        />
      </div>

      <div className="space-y-3 rounded-md border border-input p-4">
        <p className="text-sm font-medium">Stay rules (e.g. min 2 / max 28 nights, Sep 2026 – Jan 2027)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rp-min-nights">Min nights (optional)</Label>
            <Input id="rp-min-nights" type="number" min={1} value={minNights} onChange={(e) => setMinNights(e.target.value)} placeholder="2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-max-nights">Max nights (optional)</Label>
            <Input id="rp-max-nights" type="number" min={1} value={maxNights} onChange={(e) => setMaxNights(e.target.value)} placeholder="28" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-valid-from">Stay valid from (optional)</Label>
            <Input id="rp-valid-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-valid-until">Stay valid until (optional)</Label>
            <Input id="rp-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-min-adv">Min advance days (optional)</Label>
            <Input id="rp-min-adv" type="number" min={0} value={minAdvanceDays} onChange={(e) => setMinAdvanceDays(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-max-adv">Max advance days (optional)</Label>
            <Input id="rp-max-adv" type="number" min={0} value={maxAdvanceDays} onChange={(e) => setMaxAdvanceDays(e.target.value)} placeholder="365" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Arrival days (empty = all days)</Label>
          <div className="flex flex-wrap gap-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label, day) => (
              <label key={day} className="flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={daysOfWeek.includes(day)}
                  onChange={(e) =>
                    setDaysOfWeek((prev) => (e.target.checked ? [...prev, day] : prev.filter((d) => d !== day)))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border border-input px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="rp-active">Active</Label>
          <p className="text-xs text-muted-foreground">On: bookable · Off: hidden from customers</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <Switch
            id="rp-active"
            checked={status === "ACTIVE"}
            onCheckedChange={(on) => setStatus(on ? "ACTIVE" : "INACTIVE")}
            aria-label="Active"
          />
        </div>
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
