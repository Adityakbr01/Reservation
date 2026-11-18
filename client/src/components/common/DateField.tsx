import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseInput(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
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
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            disabled={minDate ? { before: startOfDay(minDate) } : undefined}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
