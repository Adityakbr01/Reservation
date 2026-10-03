import { useState } from "react";
import type { FormEvent } from "react";
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
  Coupon,
  CreateCouponPayload,
  DiscountType,
} from "../types/coupon.types";

interface CouponFormProps {
  initial?: Coupon;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (payload: CreateCouponPayload) => void;
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Money inputs are rupees; the API stores minor units. */
export function CouponForm({ initial, submitLabel, isPending, onSubmit }: CouponFormProps) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    initial?.discountType ?? "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState(
    initial
      ? String(initial.discountType === "FIXED" ? initial.discountValue / 100 : initial.discountValue)
      : "10",
  );
  const [maxDiscount, setMaxDiscount] = useState(
    initial?.maxDiscount != null ? String(initial.maxDiscount / 100) : "",
  );
  const [minimumBookingAmount, setMinimumBookingAmount] = useState(
    initial?.minimumBookingAmount != null ? String(initial.minimumBookingAmount / 100) : "",
  );
  const [validFrom, setValidFrom] = useState(toDateInput(initial?.validFrom ?? null));
  const [validUntil, setValidUntil] = useState(toDateInput(initial?.validUntil ?? null));
  const [usageLimit, setUsageLimit] = useState(
    initial?.usageLimit != null ? String(initial.usageLimit) : "",
  );

  const invalid = code.trim().length < 2 || !(Number(discountValue) > 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    const rupees = (raw: string): number | null => {
      if (!raw.trim()) return null;
      const major = Number(raw);
      return Number.isFinite(major) && major >= 0 ? Math.round(major * 100) : null;
    };
    onSubmit({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue:
        discountType === "FIXED"
          ? Math.max(1, Math.round(Number(discountValue) * 100) || 1)
          : Math.min(100, Math.max(1, Math.round(Number(discountValue)) || 1)),
      maxDiscount: discountType === "PERCENTAGE" ? rupees(maxDiscount) : null,
      minimumBookingAmount: rupees(minimumBookingAmount),
      validFrom: validFrom ? new Date(`${validFrom}T00:00:00Z`).toISOString() : null,
      validUntil: validUntil ? new Date(`${validUntil}T00:00:00Z`).toISOString() : null,
      usageLimit: usageLimit.trim() ? Math.max(1, Number(usageLimit) || 1) : null,
      applicableRoomTypeIds: [],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cp-code">Code</Label>
          <Input
            id="cp-code"
            required
            minLength={2}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-type">Discount type</Label>
          <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
            <SelectTrigger id="cp-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FIXED">Fixed amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-value">
            {discountType === "FIXED" ? "Amount (₹)" : "Percent (1–100)"}
          </Label>
          <Input
            id="cp-value"
            required
            inputMode="decimal"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </div>
        {discountType === "PERCENTAGE" && (
          <div className="space-y-2">
            <Label htmlFor="cp-max">Max discount (₹, optional)</Label>
            <Input
              id="cp-max"
              inputMode="decimal"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              placeholder="No cap"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="cp-min">Minimum booking (₹, optional)</Label>
          <Input
            id="cp-min"
            inputMode="decimal"
            value={minimumBookingAmount}
            onChange={(e) => setMinimumBookingAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-limit">Usage limit (optional)</Label>
          <Input
            id="cp-limit"
            inputMode="numeric"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-from">Valid from (optional)</Label>
          <Input
            id="cp-from"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-until">Valid until (optional)</Label>
          <Input
            id="cp-until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" className="rounded-full" disabled={invalid || isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
