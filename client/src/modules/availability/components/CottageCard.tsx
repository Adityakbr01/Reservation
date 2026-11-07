import { Link } from "react-router-dom";
import { CottageImage } from "@/components/common/CottageImage";
import { useMediaUrls } from "@/modules/media";
import { countNights } from "@/lib/date";
import type { AvailabilitySearchParams, SearchResultItem } from "../types/availability.types";
import { toSearchRecord } from "../utils/search-params";

function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export function CottageCard({
  item,
  search,
}: {
  item: SearchResultItem;
  search: AvailabilitySearchParams;
}) {
  const { roomType, rates } = item;
  const galleryMedia = (roomType as unknown as { media?: Array<{ mediaId: string; kind: string; sortOrder: number }> }).media;
  const coverId =
    galleryMedia && galleryMedia.length > 0
      ? (([...galleryMedia].sort((a, b) => a.sortOrder - b.sortOrder).find((m) => m.kind !== "video") ??
        [...galleryMedia].sort((a, b) => a.sortOrder - b.sortOrder)[0])?.mediaId)
      : [...(roomType.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.mediaId;
  const { data: photos } = useMediaUrls(coverId ? [coverId] : []);
  const coverPhoto = photos?.[0];
  const detailTo = {
    pathname: `/cottages/${roomType.slug}`,
    search: new URLSearchParams(toSearchRecord(search)).toString(),
  };

  const currency = rates[0]?.currency ?? "GBP";
  const hasRates = rates.length > 0;
  const minTotal = hasRates ? Math.min(...rates.map((rate) => rate.total)) : 0;
  const minPerNight = hasRates ? Math.min(...rates.map((rate) => rate.perNight)) : 0;
  const nights =
    search.checkIn && search.checkOut
      ? countNights(search.checkIn, search.checkOut)
      : 0;
  const petFriendly =
    (roomType.maxDogs != null && roomType.maxDogs > 0) ||
    roomType.amenities?.some((amenity) => /pet|dog/i.test(amenity));

  return (
    <article className="cottage-card group grid min-h-[328px] border border-border bg-card sm:grid-cols-[0.82fr_1.18fr]">
      <Link
        to={detailTo}
        className="relative block h-72 overflow-hidden sm:h-full"
        aria-label={`View ${roomType.name} details`}
      >
        <CottageImage
          name={roomType.name}
          imageUrl={coverPhoto?.url}
          alt={roomType.name}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {petFriendly && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-surface/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
            Dog friendly
          </span>
        )}
      </Link>

      <div className="flex flex-col justify-between p-6">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-light tracking-tight text-foreground">
                <Link to={detailTo} className="hover:text-brand transition-colors">
                  {roomType.name}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sleeps up to {roomType.maxOccupancy} guests
                {roomType.bedrooms ? ` · ${roomType.bedrooms} bedrooms` : ""}
                {roomType.bathrooms ? ` · ${roomType.bathrooms} bathrooms` : ""}
              </p>
            </div>
          </div>

          {roomType.shortDescription && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {roomType.shortDescription}
            </p>
          )}

          {roomType.amenities && roomType.amenities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {roomType.amenities.slice(0, 4).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {amenity}
                </span>
              ))}
              {roomType.amenities.length > 4 && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
                  +{roomType.amenities.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <div>
            {hasRates ? (
              <div>
                <div className="text-xs text-muted-foreground">From</div>
                <div className="font-display text-2xl font-medium text-foreground">
                  {formatMoney(minPerNight, currency)}
                  <span className="font-sans text-xs font-normal text-muted-foreground">
                    {" "}/ night
                  </span>
                </div>
                {nights > 1 && (
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(minTotal, currency)} for {nights} nights
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Prices upon request</span>
            )}
          </div>

          <Link
            to={detailTo}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View cottage
          </Link>
        </div>
      </div>
    </article>
  );
}

// Alias for backward compatibility
export const RoomTypeCard = CottageCard;
export default CottageCard;
