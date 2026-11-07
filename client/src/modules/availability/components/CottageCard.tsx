import { memo } from "react";
import { Link } from "react-router-dom";
import { CottageImage } from "@/components/common/CottageImage";
import { useMediaUrls } from "@/modules/media";
import { countNights, formatDisplayDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { AvailabilitySearchParams, SearchResultItem } from "../types/availability.types";
import { toSearchRecord } from "../utils/search-params";

export const CottageCard = memo(function CottageCard({
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
  const dateLabel =
    search.checkIn && search.checkOut
      ? `${formatDisplayDate(search.checkIn)} – ${formatDisplayDate(search.checkOut)}`
      : "";

  const rawDogs =
    (roomType as unknown as { maxDogs?: number; max_dogs?: number }).maxDogs ??
    (roomType as unknown as { max_dogs?: number }).max_dogs;
  const petFriendly =
    (rawDogs != null && Number(rawDogs) > 0) ||
    roomType.amenities?.some((amenity) => /pet|dog/i.test(amenity));

  return (
    <article className="room-card group grid min-h-[328px] border border-border bg-card sm:grid-cols-[0.82fr_1.18fr]">
      <Link
        to={detailTo}
        state={{ search }}
        aria-label={`View ${roomType.name}`}
        className="relative block min-h-[220px] overflow-hidden bg-surface-2 sm:min-h-full"
      >
        <CottageImage
          name={roomType.name}
          imageUrl={coverPhoto?.url ?? null}
          alt={coverPhoto?.alt ?? roomType.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex min-w-0 flex-col p-[23px]">
        <div className="flex flex-col items-start gap-[9px]">
          <h3 className="font-display text-[30px] font-normal leading-[1.1] tracking-tight">
            <Link
              to={detailTo}
              state={{ search }}
              className="transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {roomType.name}
            </Link>
          </h3>
          {petFriendly ? (
            <span className="border border-brand-light px-2.5 py-0.5 text-[9px] uppercase tracking-[0.5px] text-[#6b7565]">
              Pet friendly
            </span>
          ) : null}
        </div>

        <div className="mt-3.5 mb-[22px] flex flex-wrap gap-x-3 gap-y-1 text-[12px] leading-[18px] text-foreground">
          <span>{roomType.maxOccupancy} total guests</span>
          {roomType.bedrooms != null ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {roomType.bedrooms} bedroom{roomType.bedrooms === 1 ? "" : "s"}
              </span>
            </>
          ) : null}
        </div>

        {hasRates ? (
          <div className="mb-[21px] flex flex-col items-start gap-[5px] leading-6">
            <span className="text-[10px] uppercase tracking-[0.5px] text-[#6b7565]">
              Total stay price
              {nights > 0
                ? ` · ${nights} night${nights === 1 ? "" : "s"}`
                : ""}
            </span>
            <strong className="font-display text-[33px] font-normal leading-[1.08]">
              {formatMoney(minTotal, currency)}
            </strong>
            <span className="text-[12px] text-[#637359]">
              {formatMoney(minPerNight, currency)} per night
              <span className="ml-1.5 whitespace-nowrap text-[9px] text-[#77866c]">
                Example price
              </span>
            </span>
            {dateLabel ? (
              <span className="mt-[3px] text-[11px] leading-[16.5px] text-foreground">
                {dateLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        <Link
          to={detailTo}
          state={{ search }}
          className="btn-arrow mt-auto inline-flex min-h-[39px] items-center justify-between gap-[22px] self-start border border-primary px-[14px] py-[9px] text-[11px] font-medium leading-[1.4] transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          View cottage
          <span aria-hidden className="arrow-icon inline-block">
            →
          </span>
        </Link>
      </div>
    </article>
  );
});

// Alias for backward compatibility
export const RoomTypeCard = CottageCard;
export default CottageCard;
