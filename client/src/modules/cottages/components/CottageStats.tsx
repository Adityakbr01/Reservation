import type { ReactNode } from "react";
import { Bath, BedDouble, Check, Dog, Users } from "lucide-react";

export function TickIcon({ className }: { className?: string }) {
  return (
    <Check
      className={className ?? "size-5 shrink-0 text-brand"}
      strokeWidth={3}
      aria-hidden
    />
  );
}

export function StatTip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex items-center gap-1.5 text-sm text-foreground">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-44 -translate-x-1/2 rounded-md bg-night px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export interface CottageStatsProps {
  sleeps: number;
  adults: number;
  childrenCount?: number;
  /** @deprecated use childrenCount */
  children?: number;
  bedrooms: number | null;
  bathrooms: number | null;
  dogs: number | null;
}

/** Cottage stats icon row (sleeps · bedrooms · bathrooms · dogs) with tooltips. */
export function CottageStats({
  sleeps,
  adults,
  childrenCount,
  children,
  bedrooms,
  bathrooms,
  dogs,
}: CottageStatsProps) {
  const effectiveChildren = childrenCount ?? children ?? 0;
  return (
    <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <StatTip
        label={`Guests — sleeps up to ${sleeps} (${adults} adults, ${effectiveChildren} children)`}
      >
        <Users className="size-4 text-muted-foreground" aria-hidden />
        <span aria-hidden>{sleeps} guests</span>
        <span className="sr-only">Guests: sleeps up to {sleeps}</span>
      </StatTip>
      {bedrooms != null && (
        <StatTip label={bedrooms === 1 ? "1 bedroom" : `${bedrooms} bedrooms`}>
          <BedDouble className="size-4 text-muted-foreground" aria-hidden />
          <span aria-hidden>
            {bedrooms} bedroom{bedrooms === 1 ? "" : "s"}
          </span>
          <span className="sr-only">{bedrooms} bedrooms</span>
        </StatTip>
      )}
      {bathrooms != null && (
        <StatTip
          label={bathrooms === 1 ? "1 bathroom" : `${bathrooms} bathrooms`}
        >
          <Bath className="size-4 text-muted-foreground" aria-hidden />
          <span aria-hidden>
            {bathrooms} bathroom{bathrooms === 1 ? "" : "s"}
          </span>
          <span className="sr-only">{bathrooms} bathrooms</span>
        </StatTip>
      )}
      {dogs != null && dogs > 0 && (
        <StatTip label={dogs === 1 ? "1 dog allowed" : `${dogs} dogs allowed`}>
          <Dog className="size-4 text-muted-foreground" aria-hidden />
          <span aria-hidden>
            {dogs} {dogs === 1 ? "dog allowed" : "dogs allowed"}
          </span>
          <span className="sr-only">
            {dogs === 1 ? "1 dog allowed" : `${dogs} dogs allowed`}
          </span>
        </StatTip>
      )}
    </p>
  );
}

export default CottageStats;
