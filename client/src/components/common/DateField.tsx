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
}

/** shadcn-style date picker field (popover calendar, brand themed). */
export function DateField({ id, label, value, min, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseInput(value);
  const minDate = min ? parseInput(min) : undefined;

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "h-9 w-full justify-start overflow-hidden rounded-md px-3 py-1 text-left text-sm font-normal shadow-sm",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0" aria-hidden />
            <span className="truncate">{selected ? format(selected, "PPP") : "Pick a date"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
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
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
