import { Minus, Plus } from "lucide-react";

export interface GuestStepperProps {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  disabledMinus?: boolean;
  disabledPlus?: boolean;
  onChange: (v: number) => void;
}

export function GuestStepper({
  label,
  sublabel,
  value,
  min,
  max,
  disabledMinus,
  disabledPlus,
  onChange,
}: GuestStepperProps) {
  const isMinusDisabled = disabledMinus ?? value <= min;
  const isPlusDisabled = disabledPlus ?? value >= max;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {sublabel && (
          <span className="block text-[11px] text-muted-foreground">{sublabel}</span>
        )}
      </div>
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={isMinusDisabled}
          onClick={() => onChange(value - 1)}
          className="flex size-8 items-center justify-center rounded-full border border-input transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <span
          className="w-6 text-center text-sm font-semibold tabular-nums text-foreground"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={isPlusDisabled}
          onClick={() => onChange(value + 1)}
          className="flex size-8 items-center justify-center rounded-full border border-input transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </span>
    </div>
  );
}

export default GuestStepper;
