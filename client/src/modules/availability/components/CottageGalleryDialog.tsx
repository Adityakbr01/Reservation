import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "@/components/ui/dialog";
import { CottageImage } from "@/components/common/CottageImage";
import { useMediaUrls } from "@/modules/media";
import { cn } from "@/lib/utils";
import type { AvailabilitySearchParams, SearchResultRoomType } from "../types/availability.types";
import { toSearchRecord } from "../utils/search-params";

interface GalleryPhoto {
  mediaId: string;
  altText: string;
  sortOrder: number;
  url?: string;
}

interface CottageGalleryDialogProps {
  roomType: SearchResultRoomType;
  search: AvailabilitySearchParams;
  open: boolean;
  onClose: () => void;
  /** Extra cleanup when the "Explore cottage" CTA is followed (e.g. close a parent modal). */
  onExplore?: () => void;
}

export function CottageGalleryDialog({
  roomType,
  search,
  open,
  onClose,
  onExplore,
}: CottageGalleryDialogProps) {
  const titleId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  const isDogFriendly = Boolean(
    roomType.dogPolicyEnabled ??
      roomType.dog_policy_enabled ??
      ((roomType.maxDogs ?? roomType.max_dogs) != null &&
        Number(roomType.maxDogs ?? roomType.max_dogs) > 0),
  );

  const photos = useMemo<GalleryPhoto[]>(() => {
    const media = roomType.media ?? [];
    const images = roomType.images ?? [];
    const list = media.length > 0 ? media.filter((m) => m.kind !== "video") : images;
    return [...list]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item, index) => ({
        mediaId: item.mediaId,
        sortOrder: item.sortOrder,
        url: item.url,
        altText: item.altText || `${roomType.name} — photograph ${index + 1}`,
      }));
  }, [roomType]);

  const unresolvedIds = useMemo(
    () => (open ? photos.filter((p) => !p.url).map((p) => p.mediaId) : []),
    [open, photos],
  );
  const { data: resolvedPhotos } = useMediaUrls(unresolvedIds);
  const urlById = useMemo(
    () => new Map((resolvedPhotos ?? []).map((p) => [p.id, p.url])),
    [resolvedPhotos],
  );

  useEffect(() => {
    if (!open || photos.length < 2) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + photos.length) % photos.length);
      } else if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % photos.length);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, photos.length]);

  const safeIndex = photos.length > 0 ? Math.min(activeIndex, photos.length - 1) : 0;
  const activePhoto = photos[safeIndex];
  const activeUrl = activePhoto?.url ?? urlById.get(activePhoto?.mediaId ?? "");
  const counterText = photos.length > 0 ? `${safeIndex + 1} / ${photos.length}` : "0 / 0";

  const detailTo = {
    pathname: `/cottages/${roomType.slug}`,
    search: new URLSearchParams(toSearchRecord(search)).toString(),
  };

  function goPrevious() {
    if (photos.length < 2) return;
    setActiveIndex((index) => (index - 1 + photos.length) % photos.length);
  }

  function goNext() {
    if (photos.length < 2) return;
    setActiveIndex((index) => (index + 1) % photos.length);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      showCloseButton={false}
      className="w-[calc(100vw-24px)] max-w-[1160px] rounded-none bg-[#182a21] p-0 text-[#fffdf8] shadow-[0_20px_90px_0_rgba(0,0,0,0.267)] sm:w-[calc(100vw-50px)] sm:rounded-none sm:p-0"
    >
      <header className="flex items-center justify-between gap-[25px] border-b-[0.8px] border-white/[0.125] px-[18px] py-[16px] sm:px-[25px] sm:py-[19px]">
        <div className="min-w-0">
          <span className="mb-[8px] block text-[9px] font-semibold uppercase leading-[14.4px] tracking-[1.8px] text-[#c4b27d]">
            A closer look at Home Farm
          </span>
          <h2
            id={titleId}
            className="m-0 font-['Instrument_Serif',Georgia,serif] text-[24px] font-normal leading-[1.02] tracking-[-0.75px] text-[#fffdf8] sm:text-[30px]"
          >
            {roomType.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo gallery"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[0.8px] border-[#fffdf8] text-[#fffdf8] opacity-85 outline-offset-[4.8px] transition-opacity hover:opacity-100"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
          >
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[9px] bg-[#21382a] px-[18px] py-[13px] text-[10px] text-[#e0e6d7] sm:px-[25px]">
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
        {isDogFriendly && <span>Pet friendly</span>}
      </div>

      <div className="relative h-[240px] w-full overflow-hidden bg-[#132319] sm:h-[353px]">
        {activeUrl ? (
          <img
            key={activePhoto?.mediaId}
            src={activeUrl}
            alt={activePhoto?.altText}
            decoding="async"
            className="absolute inset-0 block h-full w-full object-contain"
          />
        ) : (
          <CottageImage
            name={roomType.name}
            imageUrl={null}
            alt={activePhoto?.altText}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              data-action="gallery-prev"
              aria-label="Previous photograph"
              onClick={goPrevious}
              className="absolute left-[18px] top-1/2 grid size-[43px] -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-[#fffdf8] text-[#243c30] shadow-[0_2px_14px_0_rgba(0,0,0,0.133)] outline-offset-[4.8px] transition-opacity hover:opacity-85"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-5 shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
              >
                <path d="m14 6-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              data-action="gallery-next"
              aria-label="Next photograph"
              onClick={goNext}
              className="absolute right-[18px] top-1/2 grid size-[43px] -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-[#fffdf8] text-[#243c30] shadow-[0_2px_14px_0_rgba(0,0,0,0.133)] outline-offset-[4.8px] transition-opacity hover:opacity-85"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-5 shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
              >
                <path d="m10 6 6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-[14px] px-[18px] pb-[20px] pt-[16px] sm:flex-row sm:items-center sm:justify-between sm:gap-[20px] sm:px-[24px]">
        <div
          aria-label="Gallery thumbnails"
          className="flex gap-[8px] overflow-x-auto p-[2px] sm:max-w-[80%]"
        >
          {photos.map((photo, index) => {
            const url = photo.url ?? urlById.get(photo.mediaId);
            const isActive = index === safeIndex;
            return (
              <button
                key={photo.mediaId}
                type="button"
                data-gallery-index={index}
                aria-label={`Open photograph ${index + 1}`}
                aria-pressed={isActive}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "w-[75px] shrink-0 cursor-pointer border-2 p-0 outline-offset-[4.8px] transition-opacity",
                  isActive
                    ? "border-[#d2ba7d] opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80",
                )}
              >
                {url ? (
                  <img
                    src={url}
                    alt={photo.altText}
                    loading="lazy"
                    decoding="async"
                    className="block h-[45px] w-full object-cover"
                  />
                ) : (
                  <span className="block h-[45px] w-full bg-[#21382a]" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        <span aria-live="polite" className="whitespace-nowrap text-[11px] text-[#d8dfd0]">
          {counterText}
        </span>
      </div>

      {roomType.shortDescription && (
        <p className="m-0 max-w-[850px] px-[18px] pb-[17px] text-[12px] leading-[21.6px] text-[#dbe3d1] sm:px-[25px]">
          {roomType.shortDescription}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-[20px] border-t-[0.8px] border-white/[0.125] bg-[#233c2e] px-[18px] pb-[22px] pt-[16px] sm:px-[25px]">
        <span className="text-[11px] text-[#d2dcc6]">
          {photos.length} {photos.length === 1 ? "photograph" : "photographs"} · {roomType.name}
        </span>
        <Link
          to={detailTo}
          state={{ search }}
          onClick={() => {
            onExplore?.();
            onClose();
          }}
          data-action="gallery-explore"
          className="flex min-h-[44px] items-center justify-center gap-[24px] bg-[#ac812a] px-[23px] py-[14px] text-[11px] font-medium leading-[14.85px] text-white no-underline transition-colors outline-offset-[4.8px] hover:bg-[#967122]"
        >
          Explore cottage
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 shrink-0 fill-none stroke-white stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
          >
            <path d="M4 12h15m-6-6 6 6-6 6" />
          </svg>
        </Link>
      </div>
    </Dialog>
  );
}

export default CottageGalleryDialog;
