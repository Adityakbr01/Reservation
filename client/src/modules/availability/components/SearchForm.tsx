import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, ChevronDown, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/common/DateField";
import { addDays } from "date-fns";
import { toDayKey } from "@/lib/date";
import type { AvailabilitySearchParams } from "../types/availability.types";

const selectClass =
  "h-[46px] w-full min-w-0 rounded-none border border-input bg-card px-3 pr-10 text-[13px] text-foreground outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none";
const fieldLabelClass = "mb-[7px] block text-[13px] font-normal leading-none";

function daysFromNow(days: number): string {
  return toDayKey(addDays(new Date(), days));
}

export const defaultSearchParams: AvailabilitySearchParams = {
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  rooms: 1,
};

export function defaultSearchDates(): Pick<AvailabilitySearchParams, "checkIn" | "checkOut"> {
  return { checkIn: daysFromNow(7), checkOut: daysFromNow(9) };
}

interface SearchFormProps {
  initial: AvailabilitySearchParams;
  isPending: boolean;
  onSearch: (params: AvailabilitySearchParams) => void;
}

export function SearchForm({ initial, isPending, onSearch }: SearchFormProps) {
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [adults, setAdults] = useState(String(initial.adults));
  const [children, setChildren] = useState(String(initial.children));
  const [rooms, setRooms] = useState(String(initial.rooms));
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [today] = useState(() => toDayKey(new Date()));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setRangeError("Choose both check-in and check-out dates.");
      return;
    }
    if (checkOut <= checkIn) {
      setRangeError("Check-out must be after check-in.");
      return;
    }
    if (checkIn < today) {
      setRangeError("Check-in cannot be in the past.");
      return;
    }
    setRangeError(null);
    onSearch({
      checkIn,
      checkOut,
      adults: Math.max(1, Number(adults) || 1),
      children: Math.max(0, Number(children) || 0),
      rooms: Math.max(1, Number(rooms) || 1),
    });
  }

  function handleReset() {
    const dates = defaultSearchDates();
    setCheckIn(dates.checkIn);
    setCheckOut(dates.checkOut);
    setAdults("2");
    setChildren("0");
    setRooms("1");
    setRangeError(null);
    onSearch({
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      adults: 2,
      children: 0,
      rooms: 1,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:gap-[14px] lg:grid-cols-[1.4fr_1.4fr_0.7fr_0.7fr_0.7fr_auto_auto] lg:items-end">
        <div className="col-span-1">
          <DateField
            id="search-checkin"
            label="Check-in"
            value={checkIn}
            min={today}
            onChange={setCheckIn}
          />
        </div>
        <div className="col-span-1">
          <DateField
            id="search-checkout"
            label="Check-out"
            value={checkOut}
            min={checkIn || today}
            onChange={setCheckOut}
          />
        </div>

        <div className="min-w-0 relative">
          <Label htmlFor="search-adults" className={fieldLabelClass}>
            Adults
          </Label>
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <select
              id="search-adults"
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
              className={selectClass}
            >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          </div>
        </div>

        <div className="min-w-0 relative">
          <Label htmlFor="search-children" className={fieldLabelClass}>
            Children
          </Label>
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <select
              id="search-children"
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              className={selectClass}
            >
            {Array.from({ length: 21 }, (_, i) => i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          </div>
        </div>

        <div className="min-w-0 relative">
          <Label htmlFor="search-cottages" className={fieldLabelClass}>
            Cottages
          </Label>
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <select
              id="search-cottages"
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              className={selectClass}
            >
            {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          </div>
        </div>

        <Button
          type="submit"
          className="btn-arrow btn-shine col-span-2 h-12 w-full shrink-0 rounded-none bg-primary px-6 text-[12px] font-medium text-primary-foreground hover:bg-brand-dark lg:col-span-1"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader className="size-4 animate-spin" aria-hidden />
              <span className="sr-only">Searching…</span>
            </>
          ) : (
            <>
              <span className="whitespace-nowrap">Find cottages</span>
              <ArrowRight aria-hidden className="arrow-icon size-4" />
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={handleReset}
          title="Reset search to show all cottages"
          className="col-span-2 h-12 shrink-0 px-1 text-[12px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring lg:col-span-1"
        >
          Reset
        </button>
      </div>
      {rangeError && <p className="text-xs text-error">{rangeError}</p>}
    </form>
  );
}
