import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Loader, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/common/DateField";
import type { AvailabilitySearchParams } from "../types/availability.types";

function toInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toInputValue(date);
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
  const [today] = useState(() => toInputValue(new Date()));

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.35fr_1.35fr_0.75fr_0.75fr_0.8fr]">
        <DateField
          id="search-checkin"
          label="Check-in"
          value={checkIn}
          min={today}
          onChange={setCheckIn}
        />
        <DateField
          id="search-checkout"
          label="Check-out"
          value={checkOut}
          min={checkIn || today}
          onChange={setCheckOut}
        />
        <div className="min-w-0 space-y-2">
          <Label htmlFor="search-adults">Adults</Label>
          <Input
            id="search-adults"
            type="number"
            required
            min={1}
            max={20}
            value={adults}
            onChange={(e) => setAdults(e.target.value)}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="search-children">Children</Label>
          <Input
            id="search-children"
            type="number"
            required
            min={0}
            max={20}
            value={children}
            onChange={(e) => setChildren(e.target.value)}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="search-rooms">Rooms</Label>
          <Input
            id="search-rooms"
            type="number"
            required
            min={1}
            max={10}
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
          />
        </div>
        </div>
        <Button
          type="submit"
          className="btn-shine h-12 w-full shrink-0 rounded-full bg-night px-8 text-white hover:bg-night/90 lg:w-auto"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader className="size-4 animate-spin" aria-hidden />
              <span className="sr-only">Searching…</span>
            </>
          ) : (
            <>
              <Search aria-hidden className="text-gold" />
              <span className="whitespace-nowrap">Search availability</span>
              <ArrowRight aria-hidden className="text-gold" />
            </>
          )}
        </Button>
      </div>
      {rangeError && <p className="text-xs text-error">{rangeError}</p>}
    </form>
  );
}
