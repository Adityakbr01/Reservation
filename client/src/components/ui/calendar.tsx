import { DayPicker } from "react-day-picker";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn-style calendar on react-day-picker v10, themed to the brand
 * (ring, muted, accent, brand selected day).
 */
function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        button_previous:
          "absolute left-1 inline-flex size-7 items-center justify-center rounded-md border border-input bg-background p-0 opacity-50 shadow-sm outline-none hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none",
        button_next:
          "absolute right-1 inline-flex size-7 items-center justify-center rounded-md border border-input bg-background p-0 opacity-50 shadow-sm outline-none hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        weeks: "[&_tr]:flex w-full [&_tr]:mt-2",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-full",
        day_button:
          "inline-flex size-9 items-center justify-center rounded-full p-0 text-sm font-normal transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-selected:opacity-100",
        selected:
          "bg-brand text-white hover:bg-brand hover:text-white focus:bg-brand focus:text-white",
        today: "bg-surface-2 text-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        chevron: "size-4 text-muted-foreground",
        footer: "pt-3 text-sm text-muted-foreground",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
