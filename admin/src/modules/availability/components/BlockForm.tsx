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
import { useCottages } from "@/modules/cottages";
import type { Cottage } from "@/modules/cottages";
import {
  toUtcIsoString,
  formatBlockSummary,
  formatDisplayDate,
  toUtcMidnight,
} from "@/lib/date";
import { addDays } from "date-fns";
import { useCreateBlock } from "../hooks/use-availability";

export interface BlockFormProps {
  cottages?: Cottage[];
  /** Pre-selected start/end dates (YYYY-MM-DD), e.g. from a calendar tap. */
  startDate?: string;
  endDate?: string;
  /** Pre-selected cottage id, e.g. from a calendar row tap. */
  cottageId?: string;
  onDateChange?: (start: string, end: string) => void;
  onCottageChange?: (id: string) => void;
}

export function BlockForm({
  cottages: propCottages,
  startDate: propStartDate,
  endDate: propEndDate,
  cottageId: propCottageId,
  onDateChange,
  onCottageChange,
}: BlockFormProps = {}) {
  const [internalCottageId, setInternalCottageId] = useState(propCottageId ?? "");
  const [internalStartDate, setInternalStartDate] = useState(propStartDate ?? "");
  const [internalEndDate, setInternalEndDate] = useState(propEndDate ?? "");
  const cottageId = propCottageId ?? internalCottageId;
  const startDate = propStartDate ?? internalStartDate;
  const endDate = propEndDate ?? internalEndDate;
  const [reason, setReason] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateBlock();
  const { data: cottagesData } = useCottages({ page: 1, limit: 100 });
  const cottages = propCottages?.length ? propCottages : cottagesData?.items ?? [];

  const selectedCottage = useMemo(
    () => cottages.find((c) => String(c.id) === String(cottageId)),
    [cottageId, cottages],
  );

  const invalid = !cottageId || !startDate || !endDate;

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
        roomTypeId: cottageId,
        cottageId,
        startDate: toUtcIsoString(startDate),
        endDate: toUtcIsoString(endDate),
        reason: reason.trim() || null,
      },
      {
        onSuccess: () => {
          setInternalStartDate("");
          setInternalEndDate("");
          setReason("");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cottage selection */}
      <div className="space-y-2">
        <Label>Cottage</Label>
        <Select value={cottageId} onValueChange={(value) => {
          setInternalCottageId(value);
          void onCottageChange?.(value);
        }}>
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

      {selectedCottage && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Blocking calendar availability for{" "}
          <span className="font-semibold text-foreground">{selectedCottage.name}</span>
          {selectedCottage.bedrooms ? ` (${selectedCottage.bedrooms} bedroom cottage)` : ""}.
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
            onChange={(e) => {
              const val = e.target.value;
              setInternalStartDate(val);
              void onDateChange?.(val, endDate);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="block-end">End date (exclusive)</Label>
          <Input
            id="block-end"
            type="date"
            required
            value={endDate}
            onChange={(e) => {
              const val = e.target.value;
              setInternalEndDate(val);
              void onDateChange?.(startDate, val);
            }}
          />
        </div>
      </div>
      {startDate && endDate && startDate < endDate && (
        <div className="rounded-lg border border-brand/20 bg-brand/5 p-2.5 text-xs text-foreground space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-brand">
            <span>Stay impact:</span>
            <span>{formatBlockSummary(startDate, endDate).nightsText}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Blocks nights: <strong className="text-foreground">{formatDisplayDate(startDate)}</strong> through <strong className="text-foreground">{formatDisplayDate(addDays(toUtcMidnight(endDate), -1))}</strong>. Guests can still check in on the afternoon of {formatDisplayDate(endDate)}.
          </p>
        </div>
      )}
      {rangeError && <p className="text-xs text-error">{rangeError}</p>}

      <div className="space-y-2">
        <Label htmlFor="block-reason">Reason (optional)</Label>
        <Input
          id="block-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Maintenance / private booking"
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
