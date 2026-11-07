import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CottageImageProps {
  name: string;
  imageUrl?: string | null;
  alt?: string | null;
  className?: string;
}

/**
 * Cottage visual: renders the photo the moment a URL exists, otherwise a branded placeholder.
 */
export function CottageImage({ name, imageUrl, alt, className }: CottageImageProps) {
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
      <Building2 className="size-12 text-muted-foreground/50" aria-hidden />
    </div>
  );
}

export default CottageImage;

