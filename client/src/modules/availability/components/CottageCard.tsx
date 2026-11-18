import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { CottageImage } from "@/components/common/CottageImage";
import { useMediaUrls } from "@/modules/media";
import { countNights } from "@/lib/date";
import { getCurrencySymbol } from "@/lib/money";
import { useBookingJourneyStore } from "@/stores/booking-journey-store";
import type {
  AvailabilitySearchParams,
  SearchResultItem,
} from "../types/availability.types";
import { toSearchRecord } from "../utils/search-params";
import { CottageGalleryDialog } from "./CottageGalleryDialog";

const dogPolicyLinkStyles = document.createElement("style");
dogPolicyLinkStyles.textContent = `
  .dog-policy-html a {
    text-decoration: underline;
    text-decoration-color: currentColor;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .dog-policy-html a:hover {
    opacity: 0.85;
  }
`;
if (typeof document !== "undefined" && !document.querySelector("style[data-dog-policy]")) {
  dogPolicyLinkStyles.setAttribute("data-dog-policy", "true");
  document.head?.appendChild(dogPolicyLinkStyles);
}

function toBool(val: unknown, fallback = true): boolean {
  if (val === undefined || val === null) return fallback;
  if (val === false || val === 0 || val === "false" || val === "0") return false;
  if (val === true || val === 1 || val === "true" || val === "1") return true;
  return fallback;
}

export const CottageCard = memo(function CottageCard({
  item,
  search,
}: {
  item: SearchResultItem;
  search: AvailabilitySearchParams;
}) {
  const { roomType, rates } = item;
  const openBookingJourney = useBookingJourneyStore((state) => state.openBookingJourney);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Per-cottage card element toggles (default: show everything)
  const card = roomType.sectionSettings?.cottageCard ?? {};
  const cardEnabled = toBool(card.isEnabled, true);
  const showCoverImage = toBool(card.showCoverImage, true);
  const showPhotoCount = toBool(card.showPhotoCount, true);
  const showTitle = toBool(card.showTitle, true);
  const showCapacity = toBool(card.showCapacity, true);
  const showPetFriendly = toBool(card.showPetFriendly, true);
  const showDescription = toBool(card.showDescription, true);
  const showPrice = toBool(card.showPrice, true);
  const showExampleRate = toBool(card.showExampleRate, true);
  const showDogPolicy = toBool(card.showDogPolicy, true);
  const showExploreLink = toBool(card.showExploreLink, true);
  const showCheckAvailability = toBool(card.showCheckAvailability, true);

  // Custom editable text values (admin-configurable per cottage — no fallbacks)
  const cardTitle = card.cardTitle || undefined;
  const cardDescription = card.cardDescription || undefined;
  const cardPriceLabel = card.cardPriceLabel || undefined;
  const cardExampleRateLabel = card.cardExampleRateLabel || undefined;
  const cardExploreText = card.cardExploreText || undefined;
  const cardBookText = card.cardBookText || undefined;

  // Media & Photo count resolution (hooks must run unconditionally)
  const mediaList = roomType.media && roomType.media.length > 0 ? roomType.media : [];
  const imageList = roomType.images && roomType.images.length > 0 ? roomType.images : [];
  const photoMedia = mediaList.filter((m) => m.kind !== "video");
  const photoCount = photoMedia.length > 0 ? photoMedia.length : imageList.length || 1;

  const sortedPhotos = [...(photoMedia.length > 0 ? photoMedia : imageList)].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const firstPhoto = sortedPhotos[0];
  const directUrl = (firstPhoto as { url?: string } | undefined)?.url;
  const coverId = firstPhoto?.mediaId;
  const { data: fetchedPhotos } = useMediaUrls(directUrl ? [] : coverId ? [coverId] : []);
  const coverUrl = directUrl || fetchedPhotos?.[0]?.url;
  const coverAlt = firstPhoto?.altText || `${roomType.name} interior`;

  if (!cardEnabled) return null;

  const detailTo = {
    pathname: `/cottages/${roomType.slug}`,
    search: new URLSearchParams(toSearchRecord(search)).toString(),
  };

  const currency = rates[0]?.currency ?? "GBP";
  const hasRates = rates.length > 0;
  const minPerNight = hasRates ? Math.min(...rates.map((rate) => rate.perNight)) : 26000;
  const nights =
    search.checkIn && search.checkOut
      ? countNights(search.checkIn, search.checkOut)
      : 0;

  const rawDogs = roomType.maxDogs ?? roomType.max_dogs;
  const maxDogsCount = rawDogs != null ? Number(rawDogs) : 0;
  const dogPolicyDisabled =
    roomType.dogPolicyEnabled === false ||
    roomType.dog_policy_enabled === false;
  const isDogFriendly =
    !dogPolicyDisabled &&
    (roomType.dogPolicyEnabled === true ||
      roomType.dog_policy_enabled === true ||
      maxDogsCount > 0) &&
    maxDogsCount > 0;

  const dogFeeAmount = roomType.dogFee ?? roomType.dog_fee ?? 70;
  const dogPolicyTitleText =
    roomType.dogPolicyTitle ??
    roomType.dog_policy_title ??
    `Dogs welcome · £${dogFeeAmount} per dog, per stay`;
  const dogPolicySubtitleText =
    roomType.dogPolicySubtitle ??
    roomType.dog_policy_subtitle ??
    `Up to ${maxDogsCount} dog${maxDogsCount === 1 ? "" : "s"} · added only if you bring a dog`;
  const customDogIcon = roomType.dogPolicyImageUrl ?? roomType.dog_policy_image_url ?? null;

  const symbol = getCurrencySymbol(currency);
  const pounds = Math.round(minPerNight / 100);
  const formattedPrice = `${symbol}${pounds}`;

  return (
    <article className="group flex min-w-0 flex-col border border-[#d8d9cb] bg-[#fffdf8] transition-shadow duration-200">
      {/* Photo gallery preview with photo count badge */}
      {showCoverImage && (
        <button
          type="button"
          data-gallery={roomType.slug}
          aria-label={`View ${roomType.name} photos`}
          onClick={() => setGalleryOpen(true)}
          className="relative block h-[200px] w-full cursor-pointer overflow-hidden border-0 bg-[#d8ddcd] p-0 text-left text-[#243c30] outline-offset-[5px] md:h-[230px]"
        >
          <CottageImage
            name={roomType.name}
            imageUrl={coverUrl ?? null}
            alt={coverAlt}
            className="absolute inset-0 h-[200px] w-full object-cover transition-transform duration-600 ease-out group-hover:scale-105 md:h-[230px]"
          />
          {showPhotoCount && (
            <span className="pointer-events-none absolute right-[13px] bottom-[13px] flex items-center gap-[7px] rounded-[2px] bg-[rgba(255,253,248,0.937)] px-[10px] py-[7px] text-[10px] text-[#243c30] shadow-[0_2px_10px_0_rgba(0,0,0,0.067)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-[13px] w-[13px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
              >
                <path d="M4 7h4l2-3h4l2 3h4v13H4ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0" />
              </svg>
              {photoCount} {photoCount === 1 ? "photo" : "photos"}
            </span>
          )}
        </button>
      )}

      <CottageGalleryDialog
        key={galleryOpen ? "gallery-open" : "gallery-closed"}
        roomType={roomType}
        search={search}
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      {/* Cottage details and actions */}
      <div className="flex flex-1 flex-col p-4 pt-4 md:p-[24px] md:pt-[23px]">
        {showTitle && cardTitle && (
          <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[35.2px] tracking-[-0.9px] text-[#243c30] md:text-[36px] md:leading-[39.6px]">
            <Link
              to={detailTo}
              state={{ search }}
              className="text-[#243c30] no-underline outline-offset-[5px] transition-opacity hover:opacity-85"
            >
              {cardTitle}
            </Link>
          </h3>
        )}

        {showCapacity || showPetFriendly ? (
          <div className="mt-[12px] flex flex-wrap items-center gap-[12px] text-[10px] leading-[18px] text-[#535b51]">
            {showCapacity && (
              <>
                <span>Sleeps {roomType.maxOccupancy}</span>
                {roomType.bedrooms != null && (
                  <span>
                    {roomType.bedrooms} {roomType.bedrooms === 1 ? "bedroom" : "bedrooms"}
                  </span>
                )}
                {roomType.bathrooms != null && (
                  <span>
                    {roomType.bathrooms} {roomType.bathrooms === 1 ? "bathroom" : "bathrooms"}
                  </span>
                )}
              </>
            )}
            {showPetFriendly && isDogFriendly && <span>Pet friendly</span>}
          </div>
        ) : null}

        {showDescription && cardDescription && (
          <p className="m-0 mt-[17px] line-clamp-2 text-[12px] leading-[22.8px] text-[#535b51] md:line-clamp-3">
            {cardDescription}
          </p>
        )}

        {showPrice && cardPriceLabel && (
          <div className="mt-[20px] flex items-baseline gap-[7px] leading-[19.2px]">
            <span className="text-[10px] text-[#535b51]">{cardPriceLabel}</span>
            <strong className="font-['Instrument_Serif',Georgia,serif] text-[38px] font-normal leading-[41.8px] text-[#243c30]">
              {formattedPrice}
            </strong>
            <small className="text-[10px] text-[#535b51]">/ night</small>
          </div>
        )}

        {showExampleRate && cardExampleRateLabel && (
          <p className="m-0 mt-[7px] hidden text-[10px] leading-[18px] text-[#535b51] md:block">
            {hasRates && nights > 0
              ? `${cardExampleRateLabel} · ${nights} night${nights === 1 ? "" : "s"} selected`
              : `${cardExampleRateLabel} · choose dates when you’re ready`}
          </p>
        )}

        {/* Dog Policy Section - shown only when cottage is dog friendly */}
        {showDogPolicy && isDogFriendly && (
          <div className="dog-policy-html relative mt-[14px]">
            <p className="m-0 hidden text-[11px] leading-[18.7px] text-[#243c30] md:block">
              {customDogIcon ? (
                <img
                  src={customDogIcon}
                  alt="Dogs welcome"
                  className="mr-[5px] inline-block h-[17px] w-[17px] object-contain align-middle"
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="mr-[5px] inline-block h-[17px] w-[17px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round align-middle"
                >
                  <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                </svg>
              )}
              {dogPolicyTitleText && (
                <span
                  className="inline-block"
                  dangerouslySetInnerHTML={{ __html: dogPolicyTitleText }}
                />
              )}
            </p>
            <small className="block pl-[24px] mt-[1px] text-[10px] text-[#535b51]" dangerouslySetInnerHTML={{ __html: dogPolicySubtitleText || "" }} />
          </div>
        )}

        <div className="mt-auto pt-[20px]">
          <div className="flex items-center justify-between gap-[20px] border-t border-[#d8d9cb] pt-[16px]">
            {showExploreLink && cardExploreText && (
              <Link
                to={detailTo}
                state={{ search }}
                className="flex min-h-[42px] items-center justify-between gap-[19px] p-[0_0_4px] text-[11px] leading-[17.6px] text-[#243c30] no-underline outline-offset-[5px] transition-opacity hover:opacity-85"
              >
                {cardExploreText}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                >
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </Link>
            )}
            {showCheckAvailability && cardBookText && (
              <button
                type="button"
                data-action="book"
                data-key={roomType.slug}
                onClick={() => openBookingJourney(roomType, search)}
                className="flex min-h-[43px] cursor-pointer items-center justify-center gap-[15px] border-0 bg-[#243c30] p-[12px_16px] text-[10px] font-medium leading-[13.5px] text-[#fffdf8] outline-offset-[5px] transition-colors hover:bg-[#1a2d24]"
              >
                {cardBookText}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                >
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

export const RoomTypeCard = CottageCard;
export default CottageCard;
