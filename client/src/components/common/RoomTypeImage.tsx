import { BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomTypeImageProps {
  name: string;
  /** Resolved photo URL. Absent until the media module lands (Phase 11). */
  imageUrl?: string | null;
  alt?: string | null;
  className?: string;
}

/**
 * Room visual that upgrades itself: renders the photo the moment a URL
 * exists, otherwise a branded placeholder (never a broken <img>).
 */
export function RoomTypeImage({ name, imageUrl, alt, className }: RoomTypeImageProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt || `${name} photo`}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center bg-surface-2", className)}
      role="img"
      aria-label={`${name} photo coming soon`}
    >
      <BedDouble className="size-12 text-muted-foreground/50" aria-hidden />
    </div>
  );
}
