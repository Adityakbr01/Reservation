import { Check } from "lucide-react";
import { useMediaUrls } from "@/modules/media";
import type { ResolvedMedia } from "@/modules/media";
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

/** Facilities grid: dynamic icon/tick + label in columns (legacy text amenities merge in). */
export function FacilityGrid({ amenities, extra }: FacilityGridProps) {
  const { data: photos } = useMediaUrls(
    amenities
      .map((a) => a.imageMediaId)
      .filter((id): id is string => Boolean(id)),
  );
  const byId = new Map<string, ResolvedMedia>(
    (photos ?? []).map((p: ResolvedMedia) => [p.id, p]),
  );

  if (amenities.length === 0 && extra.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
      {amenities.map((a) => {
        const uploaded = a.imageMediaId
          ? byId.get(a.imageMediaId)?.url
          : undefined;
        const icon =
          a.iconUrl && !a.iconUrl.startsWith("https://picsum.photos")
            ? a.iconUrl
            : undefined;
        const customIcon = uploaded ?? icon;

        return (
          <li
            key={a.id}
            className="flex w-full items-center justify-self-start gap-2.5 text-sm text-foreground"
          >
            {customIcon ? (
              <img
                src={customIcon}
                alt=""
                className="size-5 shrink-0 object-contain"
                loading="lazy"
              />
            ) : (
              <FacilityTickIcon />
            )}
            {a.name}
          </li>
        );
      })}
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
