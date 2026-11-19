import { useState, useRef, useEffect } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtraInfoPopoverProps {
  title: string;
  infoTitle?: string | null;
  infoText?: string | null;
  description?: string | null;
  className?: string;
}

/**
 * Balloon popover displaying detailed extra info on hover or click.
 * Smoothly supports both desktop hover and mobile tap without auto-closing.
 */
export function ExtraInfoPopover({
  title,
  infoTitle,
  infoText,
  description,
  className,
}: ExtraInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchRef = useRef(false);

  const displayTitle = (infoTitle || title || "").replace(/<[^>]*>/g, "").trim();
  const rawContent = (infoText && infoText.trim().length > 0 ? infoText : description || "").trim();

  // Clean up any hover timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!rawContent && !displayTitle) return null;

  // Determine if interaction is genuine desktop mouse hover
  const canHover = () => {
    if (isTouchRef.current) return false;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  };

  const handleMouseEnter = () => {
    if (!canHover()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), 120);
  };

  const handleMouseLeave = () => {
    if (!canHover()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 200);
  };

  const handleTriggerPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      isTouchRef.current = true;
    } else {
      isTouchRef.current = false;
    }
  };

  const handleTriggerTouchStart = () => {
    isTouchRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    // Radix Trigger's built-in onClick handles onOpenChange(!open) cleanly.
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          onClick={handleTriggerClick}
          onPointerDown={handleTriggerPointerDown}
          onTouchStart={handleTriggerTouchStart}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "inline-flex size-[20px] shrink-0 items-center justify-center rounded-full border border-[#243c30]/40 bg-[#f4f6ef] text-[#243c30] transition-all hover:bg-[#dbe8d2] hover:border-[#243c30] hover:scale-105 active:scale-95 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#243c30]",
            open && "bg-[#dbe8d2] border-[#243c30] ring-1 ring-[#243c30]/40",
            className,
          )}
          aria-label={`More information about ${displayTitle}`}
        >
          <span className="font-serif text-[13px] font-bold leading-none select-none">
            i
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="center"
          sideOffset={8}
          avoidCollisions
          onMouseEnter={() => {
            if (!canHover()) return;
            if (timerRef.current) clearTimeout(timerRef.current);
          }}
          onMouseLeave={handleMouseLeave}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="z-[140] w-[270px] sm:w-[310px] max-w-[calc(100vw-32px)] rounded-[14px] sm:rounded-[16px] border border-[#d8d9cb] bg-[#fffdfa] p-4 text-[#243c30] shadow-xl outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {/* Header with Title & Close button */}
          <div className="flex items-start justify-between gap-2 border-b border-[#e5e4da] pb-2">
            <h5 className="font-['Instrument_Serif',Georgia,serif] text-[19px] sm:text-[21px] font-normal leading-tight text-[#1b2f24] m-0">
              {displayTitle}
            </h5>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (timerRef.current) clearTimeout(timerRef.current);
                setOpen(false);
              }}
              className="size-6 -mr-1 -mt-0.5 inline-flex items-center justify-center rounded-full text-[#6b7264] hover:text-[#1b2f24] hover:bg-[#e9ecdf] transition-colors cursor-pointer"
              aria-label="Close information"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Description Body with full Rich Text formatting */}
          <div
            className="mt-2.5 text-[12px] sm:text-[12.5px] leading-relaxed text-[#4b5247] [&_p]:m-0 [&_p+p]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-[#1b2f24] [&_b]:font-semibold [&_b]:text-[#1b2f24] [&_em]:italic [&_i]:italic [&_a]:underline [&_a]:text-[#1b2f24] [&_a:hover]:text-[#243c30] [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1.5 [&_li]:mt-0.5"
            dangerouslySetInnerHTML={{
              __html: rawContent,
            }}
          />

          {/* Speech balloon arrow pointing towards the ⓘ icon */}
          <PopoverPrimitive.Arrow
            width={14}
            height={7}
            className="fill-[#fffdfa] stroke-[#d8d9cb] stroke-1"
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
