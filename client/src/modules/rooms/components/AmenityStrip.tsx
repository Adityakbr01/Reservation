import type { LucideIcon } from "lucide-react";
import {
  Baby,
  BedDouble,
  Bike,
  Bird,
  Check,
  CircleParking,
  Flag,
  Flame,
  Footprints,
  Heart,
  Leaf,
  PawPrint,
  Users,
  Wifi,
} from "lucide-react";
import { useMediaUrls } from "@/modules/media";
import type { ResolvedMedia } from "@/modules/media";

export interface LinkedAmenity {
  id: string;
  name: string;
  group?: string;
  imageMediaId: string | null;
  iconUrl?: string | null;
}

export function amenityIconFor(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("dog")) return PawPrint;
  if (n.includes("wifi")) return Wifi;
  if (n.includes("park")) return CircleParking;
  if (n.includes("baby")) return Baby;
  if (n.includes("family") || n.includes("child")) return Users;
  if (n.includes("bird")) return Bird;
  if (n.includes("ground") || n.includes("bedroom") || n.includes("bed"))
    return BedDouble;
  if (n.includes("cycl") || n.includes("bik")) return Bike;
  if (n.includes("romant") || n.includes("honey")) return Heart;
  if (n.includes("golf")) return Flag;
  if (n.includes("walk")) return Footprints;
  if (n.includes("garden") || n.includes("plant")) return Leaf;
  if (n.includes("bbq") || n.includes("barbecue") || n.includes("grill"))
    return Flame;
  return Check;
}

export interface AmenityStripProps {
  amenities: LinkedAmenity[];
}

/** Amenity strip: gold icon + label chips in a bordered box. */
export function AmenityStrip({ amenities }: AmenityStripProps) {
  const { data: photos } = useMediaUrls(
    amenities
      .map((a) => a.imageMediaId)
      .filter((id): id is string => Boolean(id)),
  );
  const byId = new Map<string, ResolvedMedia>(
    (photos ?? []).map((p: ResolvedMedia) => [p.id, p]),
  );
  return (
    <ul className="flex flex-wrap gap-x-8 gap-y-4">
      {amenities.map((a) => {
        const uploaded = a.imageMediaId
          ? byId.get(a.imageMediaId)?.url
          : undefined;
        const icon =
          a.iconUrl && !a.iconUrl.startsWith("https://picsum.photos")
            ? a.iconUrl
            : undefined;
        const localFallback = a.name.toLowerCase().includes("padel")
          ? "/padel.png"
          : a.name.toLowerCase().includes("infant")
            ? "/infants.png"
            : null;
        const src = uploaded ?? icon ?? localFallback;
        const Icon = amenityIconFor(a.name);
        return (
          <li
            key={a.id}
            className="inline-flex min-w-20 flex-col items-center gap-1.5 text-center"
          >
            {src ? (
              <img
                src={src}
                alt=""
                className="size-6 object-contain"
                loading="lazy"
              />
            ) : (
              <Icon className="size-6 text-brand-dark" aria-hidden />
            )}
            <span className="max-w-24 text-xs text-foreground">{a.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default AmenityStrip;
