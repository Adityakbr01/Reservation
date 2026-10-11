import { Check } from "lucide-react";
import type { LinkedAmenity } from "./AmenityStrip";

function FacilityTickIcon({ className }: { className?: string }) {
  return (
    <Check
      className={className ?? "size-5 shrink-0 text-brand"}
      strokeWidth={3}
      aria-hidden
    />
  );
}

export interface FacilityGridProps {
  amenities: LinkedAmenity[];
  extra: string[];
}

/** Facilities grid: tick + label in columns (legacy text amenities merge in). */
export function FacilityGrid({ amenities, extra }: FacilityGridProps) {
  if (amenities.length === 0 && extra.length === 0) return null;
  return (
    <ul className="mx-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-2.5 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3">
      {amenities.map((a) => (
        <li
          key={a.id}
          className="flex w-full items-center justify-self-start gap-2.5 text-sm text-foreground"
        >
          <FacilityTickIcon />
          {a.name}
        </li>
      ))}
      {extra.map((name) => (
        <li
          key={name}
          className="flex w-full items-center justify-self-start gap-2.5 text-sm text-foreground"
        >
          <FacilityTickIcon />
          {name}
        </li>
      ))}
    </ul>
  );
}

export default FacilityGrid;
