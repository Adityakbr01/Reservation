import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, ChevronDown, Loader } from "lucide-react";
import toast from "react-hot-toast";
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
  onFindCottages?: (params: AvailabilitySearchParams) => void;
  checkInLabel?: string;
  checkOutLabel?: string;
  adultsLabel?: string;
  childrenLabel?: string;
  cottagesLabel?: string;
  findCottagesText?: string;
  resetText?: string;
  showCheckIn?: boolean;
  showCheckOut?: boolean;
  showAdults?: boolean;
  showChildren?: boolean;
  showCottages?: boolean;
  showFindCottagesButton?: boolean;
  showResetButton?: boolean;
  showArrow?: boolean;
}

export function SearchForm({
  initial,
  isPending,
  onSearch,
  onFindCottages,
  checkInLabel,
  checkOutLabel,
  adultsLabel,
  childrenLabel,
  cottagesLabel,
  findCottagesText,
  resetText,
  showCheckIn = true,
  showCheckOut = true,
  showAdults = true,
  showChildren = true,
  showCottages = true,
  showFindCottagesButton = true,
  showResetButton = true,
  showArrow = true,
}: SearchFormProps) {
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [adults, setAdults] = useState(String(initial.adults));
  const [children, setChildren] = useState(String(initial.children));
  const [rooms, setRooms] = useState(String(initial.rooms));
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [today] = useState(() => toDayKey(new Date()));

  // Keep form inputs synced whenever initial changes (e.g. from restored state or URL)
  useEffect(() => {
    setCheckIn(initial.checkIn);
    setCheckOut(initial.checkOut);
    setAdults(String(initial.adults));
    setChildren(String(initial.children));
    setRooms(String(initial.rooms));
  }, [initial.checkIn, initial.checkOut, initial.adults, initial.children, initial.rooms]);

  function emitSearch(
    nextCheckIn: string,
    nextCheckOut: string,
    nextAdults: string,
    nextChildren: string,
    nextRooms: string,
  ) {
    if (!nextCheckIn || !nextCheckOut) return;
    if (nextCheckOut <= nextCheckIn) return;
    if (nextCheckIn < today) return;
    setRangeError(null);
    onSearch({
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      adults: Math.max(1, Number(nextAdults) || 1),
      children: Math.max(0, Number(nextChildren) || 0),
      rooms: Math.max(1, Number(nextRooms) || 1),
    });
  }

  function handleCheckInChange(val: string) {
    setCheckIn(val);
    setRangeError(null);
    let nextCheckOut = checkOut;
    // Minimum 2 nights: if checkOut is empty or less than 2 nights after new checkIn, automatically push it forward
    try {
      const inDate = new Date(`${val}T00:00:00`);
      if (!isNaN(inDate.getTime())) {
        const minOut = toDayKey(addDays(inDate, 2));
        if (!nextCheckOut || nextCheckOut < minOut) {
          nextCheckOut = toDayKey(addDays(inDate, 3));
          setCheckOut(nextCheckOut);
        }
      }
    } catch {}

    if (nextCheckOut && nextCheckOut > val && val >= today) {
      emitSearch(val, nextCheckOut, adults, children, rooms);
    }
  }

  function handleCheckOutChange(val: string) {
    setCheckOut(val);
    if (val <= checkIn) {
      setRangeError("Check-out must be after check-in.");
      toast.error("Check-out must be after check-in.");
      return;
    }
    if (checkIn) {
      const inDate = new Date(`${checkIn}T00:00:00Z`);
      const outDate = new Date(`${val}T00:00:00Z`);
      const diffNights = Math.round((outDate.getTime() - inDate.getTime()) / 86400000);
      if (diffNights < 2) {
        setRangeError("A minimum stay of 2 nights is required.");
        toast.error("A minimum stay of 2 nights is required.");
        return;
      }
    }
    setRangeError(null);
    if (checkIn && val > checkIn && checkIn >= today) {
      emitSearch(checkIn, val, adults, children, rooms);
    }
  }

  function handleAdultsChange(val: string) {
    setAdults(val);
    if (checkIn && checkOut && checkOut > checkIn && checkIn >= today) {
      emitSearch(checkIn, checkOut, val, children, rooms);
    }
  }

  function handleChildrenChange(val: string) {
    setChildren(val);
    if (checkIn && checkOut && checkOut > checkIn && checkIn >= today) {
      emitSearch(checkIn, checkOut, adults, val, rooms);
    }
  }

  function handleRoomsChange(val: string) {
    setRooms(val);
    if (checkIn && checkOut && checkOut > checkIn && checkIn >= today) {
      emitSearch(checkIn, checkOut, adults, children, val);
    }
  }

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
    const searchParams: AvailabilitySearchParams = {
      checkIn,
      checkOut,
      adults: Math.max(1, Number(adults) || 1),
      children: Math.max(0, Number(children) || 0),
      rooms: Math.max(1, Number(rooms) || 1),
    };
    onSearch(searchParams);
    onFindCottages?.(searchParams);
  }

  function handleReset() {
    setCheckIn("");
    setCheckOut("");
    setAdults("2");
    setChildren("0");
    setRooms("1");
    setRangeError(null);
    onSearch({
      checkIn: "",
      checkOut: "",
      adults: 2,
      children: 0,
      rooms: 1,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-6 gap-3 sm:gap-[14px] lg:grid-cols-[1.4fr_1.4fr_0.7fr_0.7fr_0.7fr_auto_auto] lg:items-end">
        {showCheckIn && (
          <div className="col-span-3 lg:col-span-1">
            <DateField
              id="search-checkin"
              label={checkInLabel ?? ""}
              value={checkIn}
              min={today}
              onChange={handleCheckInChange}
            />
          </div>
        )}
        {showCheckOut && (
          <div className="col-span-3 lg:col-span-1">
            <DateField
              id="search-checkout"
              label={checkOutLabel ?? ""}
              value={checkOut}
              min={checkIn ? toDayKey(addDays(new Date(`${checkIn}T00:00:00`), 2)) : today}
              onChange={handleCheckOutChange}
            />
          </div>
        )}
        {showAdults && (
          <div className="col-span-2 min-w-0 relative lg:col-span-1">
            <Label htmlFor="search-adults" className={fieldLabelClass}>
              {adultsLabel ?? ""}
            </Label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <select
                id="search-adults"
                value={adults}
                onChange={(e) => handleAdultsChange(e.target.value)}
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
        )}
        {showChildren && (
          <div className="col-span-2 min-w-0 relative lg:col-span-1">
            <Label htmlFor="search-children" className={fieldLabelClass}>
              {childrenLabel ?? ""}
            </Label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <select
                id="search-children"
                value={children}
                onChange={(e) => handleChildrenChange(e.target.value)}
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
        )}
        {showCottages && (
          <div className="col-span-2 min-w-0 relative lg:col-span-1">
            <Label htmlFor="search-cottages" className={fieldLabelClass}>
              {cottagesLabel ?? ""}
            </Label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <select
                id="search-cottages"
                value={rooms}
                onChange={(e) => handleRoomsChange(e.target.value)}
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
        )}
        {showFindCottagesButton && (
          <Button
            type="submit"
            className="btn-arrow btn-shine col-span-6 h-12 w-full shrink-0 rounded-none bg-primary px-6 text-[12px] font-medium text-primary-foreground hover:bg-brand-dark lg:col-span-1"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader className="size-4 animate-spin" aria-hidden />
                <span className="sr-only">Searching…</span>
              </>
            ) : (
              <>
                <span className="whitespace-nowrap">{findCottagesText ?? ""}</span>
                {showArrow && <ArrowRight aria-hidden className="arrow-icon size-4" />}
              </>
            )}
          </Button>
        )}
        {showResetButton && (
          <button
            type="button"
            onClick={handleReset}
            title="Reset search to show all cottages"
            className="col-span-6 hidden h-12 shrink-0 px-1 text-[12px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:block lg:col-span-1"
          >
            {resetText ?? ""}
          </button>
        )}
      </div>
      {rangeError && <p className="text-xs text-error">{rangeError}</p>}
    </form>
  );
}
