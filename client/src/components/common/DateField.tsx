import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseInput(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

interface DateFieldProps {
  id: string;
  label: string;
  /** yyyy-mm-dd, "" when unset. */
  value: string;
  /** Minimum selectable day as yyyy-mm-dd. */
  min?: string;
  onChange: (value: string) => void;
  /** Extra classes for the calendar popover (e.g. z-index inside modals). */
  contentClassName?: string;
}

/** shadcn-style date picker field (popover calendar, brand themed). */
export function DateField({ id, label, value, min, onChange, contentClassName }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseInput(value);
  const minDate = min ? parseInput(min) : undefined;

  // Determine the target month:
  // 1. If value is selected and is on/after minDate, show selected date's month
  // 2. Otherwise if minDate is provided (e.g. checkOut field with min=checkIn), show minDate's month
  // 3. Fallback to today
  const targetMonth = useMemo(() => {
    if (selected && (!minDate || startOfDay(selected) >= startOfDay(minDate))) {
      return selected;
    }
    if (minDate) {
      return minDate;
    }
    return new Date();
  }, [selected, minDate]);

  const [month, setMonth] = useState<Date>(targetMonth);

  // Jump calendar to the target month whenever the popover opens or targetMonth changes
  useEffect(() => {
    if (open) {
      setMonth(targetMonth);
    }
  }, [open, targetMonth]);

  const startMonthDate = minDate ? startOfDay(minDate) : startOfDay(new Date());

  return (
    <div className="min-w-0">
      <Label
        htmlFor={id}
        className="mb-[7px] block text-[13px] font-normal leading-none"
      >
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "flex h-[46px] w-full items-center justify-between overflow-hidden rounded-none border border-input bg-card px-3 text-left text-[13px] font-normal text-foreground shadow-none hover:bg-card",
              !selected && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {selected ? format(selected, "d MMM yyyy") : "Pick a date"}
            </span>
            <CalendarIcon className="ml-2 size-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn("rounded-none border-border", contentClassName)}>
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            defaultMonth={targetMonth}
            startMonth={startMonthDate}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
            disabled={minDate ? { before: startOfDay(minDate) } : undefined}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
