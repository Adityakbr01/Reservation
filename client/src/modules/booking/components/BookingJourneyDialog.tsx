import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { addDays } from "date-fns";
import toast from "react-hot-toast";
import { countNights, formatDisplayDate, toDayKey } from "@/lib/date";
import { getStripePromise } from "@/lib/stripe";
import { DateField } from "@/components/common/DateField";
import { fetchSiteSettings } from "@/modules/cms/api/cms.api";
import { useAvailabilitySearch, CottageGalleryDialog } from "@/modules/availability";
import { useMediaUrls } from "@/modules/media";
import { useBookingJourneyStore } from "@/stores/booking-journey-store";
import { createGuestBooking } from "@/modules/booking/api/booking.api";
import type {
  SearchResultItem,
  SearchResultRoomType,
  CottageExtra,
} from "@/modules/availability/types/availability.types";

function SafeImage({
  src,
  alt,
  className,
  style,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-[#d5d8cb] text-[#243c30]/40 ${className ?? ""}`}
        style={style}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-6 w-6 fill-none stroke-current stroke-[1.5]"
        >
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
    />
  );
}

function JourneyPaymentForm({
  totalAmount,
  bookingId,
  onSuccess,
  onBack,
}: {
  totalAmount: number;
  bookingId: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setPayError(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/confirmation/${bookingId}`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setPayError(result.error.message ?? "Payment failed. Please try again.");
        setPaying(false);
      } else if (
        result.paymentIntent &&
        (result.paymentIntent.status === "succeeded" ||
          result.paymentIntent.status === "processing")
      ) {
        toast.success("Payment successful!");
        onSuccess();
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setPayError(err?.message || "An error occurred during payment processing.");
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="mt-4 space-y-4">
      <div className="rounded border border-[#d8d9cb] bg-[#fffdf8] p-4">
        <PaymentElement
          onLoadError={(err) => {
            setPayError(err.error?.message ?? "Unable to load card payment fields.");
          }}
        />
      </div>

      {payError && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {payError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={paying}
          className="cursor-pointer border-0 p-[10px_0] text-[11px] text-[#243c30] underline underline-offset-4 outline-offset-[5px] disabled:opacity-50"
        >
          ← Edit guest details
        </button>

        <button
          type="submit"
          disabled={paying || !stripe || !elements}
          className="flex min-h-[49px] cursor-pointer items-center justify-center gap-[15px] border-0 bg-[#243c30] p-[13px_20px] text-[12px] font-medium leading-[14.85px] text-[#fffdf8] transition-colors hover:bg-[#1b2d24] disabled:cursor-not-allowed disabled:opacity-50 outline-offset-[5px]"
        >
          {paying ? "Processing payment…" : `Pay £${totalAmount.toLocaleString()} & Confirm`}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none h-[18px] w-[18px] shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
          >
            <path d="M4 12h15m-6-6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <p className="text-center text-[10px] text-[#535b51]">
        Guaranteed safe &amp; secure checkout powered by Stripe.
      </p>
    </form>
  );
}

export function BookingJourneyDialog({
  cottages: propCottages,
}: {
  cottages?: SearchResultItem[];
}) {
  const {
    isOpen,
    cottage: storeCottage,
    searchParams: storeSearchParams,
    closeBookingJourney,
  } = useBookingJourneyStore();

  // Load Admin Configured Site Settings
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: fetchSiteSettings,
    staleTime: 300_000,
  });

  const bjSettings = siteSettings?.bookingPage?.bookingJourney;

  // Step state: 0=Dates, 1=Cottage, 2=Extras, 3=Details & payment, 4=Confirmation
  const [step, setStep] = useState<number>(0);

  // Dates & Guests — no default dates; filled from the home search when the
  // guest has already picked them, otherwise chosen in this step.
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [today] = useState(() => toDayKey(new Date()));

  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // Selected Cottage
  const [selectedCottageId, setSelectedCottageId] = useState<string>("");

  // Cottage whose photo gallery is open (selection stays on the Choose button/radio)
  const [galleryCottageId, setGalleryCottageId] = useState<string | null>(null);

  // Selected Extras (Set of IDs)
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(new Set());

  // Dogs selection (count: 0 or 1+)
  const [dogsCount, setDogsCount] = useState<number>(0);

  // Guest Details & Billing
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [requests, setRequests] = useState("");

  // Live Booking & Stripe Payment State
  const [isCreatingHold, setIsCreatingHold] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise] = useState(getStripePromise);
  const [confirmedTotal, setConfirmedTotal] = useState<number>(0);
  const idempotencyKey = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36),
  );

  // Live availability query if propCottages not provided
  const hasStayDates = Boolean(checkIn && checkOut && checkOut > checkIn);
  const availabilityQuery = useAvailabilitySearch(
    !propCottages || propCottages.length === 0
      ? hasStayDates
        ? { checkIn, checkOut, adults, children, rooms: 1 }
        : null
      : null,
  );

  const cottages = useMemo(() => {
    if (propCottages && propCottages.length > 0) return propCottages;
    return availabilityQuery.data?.results ?? [];
  }, [propCottages, availabilityQuery.data]);

  // Lock page scroll and pause Lenis smooth scroll while the dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const lenis = (window as any).__lenis;
    lenis?.stop();
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !galleryCottageId) closeBookingJourney();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      lenis?.start();
    };
  }, [isOpen, closeBookingJourney, galleryCottageId]);

  // When store triggers open or cottage changes - ALWAYS START AT STEP 0 (DATES)
  useEffect(() => {
    if (isOpen) {
      if (storeCottage?.id) {
        setSelectedCottageId(storeCottage.id);
      }
      if (storeSearchParams?.checkIn) {
        setCheckIn(storeSearchParams.checkIn);
      } else {
        setCheckIn("");
      }
      if (storeSearchParams?.checkOut) {
        setCheckOut(storeSearchParams.checkOut);
      } else {
        setCheckOut("");
      }
      if (storeSearchParams?.adults) {
        setAdults(storeSearchParams.adults);
      }
      if (storeSearchParams?.children !== undefined) {
        setChildren(storeSearchParams.children);
      }
      setStep(0); // NEVER SKIP THE DATE STEP
      setClientSecret(null);
      setBookingId(null);
      setBookingNumber(null);
      setHoldError(null);
    } else {
      setSelectedExtraIds(new Set());
      setDogsCount(0);
      setClientSecret(null);
      setGalleryCottageId(null);
    }
  }, [isOpen, storeCottage, storeSearchParams]);

  // If no cottage selected yet, default to first cottage
  useEffect(() => {
    if (!selectedCottageId && cottages.length > 0) {
      setSelectedCottageId(cottages[0].roomType.id);
    }
  }, [selectedCottageId, cottages]);

  // Find currently selected cottage
  const selectedCottageItem = useMemo(() => {
    return (
      cottages.find((c) => c.roomType.id === selectedCottageId) ??
      cottages[0] ??
      null
    );
  }, [cottages, selectedCottageId]);

  const selectedCottage = selectedCottageItem?.roomType;

  const galleryRoomType = useMemo(
    () => cottages.find((c) => c.roomType.id === galleryCottageId)?.roomType ?? null,
    [cottages, galleryCottageId],
  );

  // Nights calculation
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 7;
    const n = countNights(checkIn, checkOut);
    return n > 0 ? n : 7;
  }, [checkIn, checkOut]);

  // Pricing calculations
  const perNightPence = useMemo(() => {
    if (!selectedCottageItem?.rates || selectedCottageItem.rates.length === 0) return 26000;
    return Math.min(...selectedCottageItem.rates.map((r) => r.perNight));
  }, [selectedCottageItem]);

  const perNightPounds = Math.round(perNightPence / 100);
  const cottageTotalPounds = perNightPounds * nights;

  // Dog Policy on selected cottage
  const isDogFriendly = useMemo(() => {
    if (!selectedCottage) return false;
    const rawDogs = selectedCottage.maxDogs ?? selectedCottage.max_dogs;
    return Boolean(
      selectedCottage.dogPolicyEnabled ??
        selectedCottage.dog_policy_enabled ??
        (rawDogs != null && Number(rawDogs) > 0),
    );
  }, [selectedCottage]);

  const maxDogsAllowed = selectedCottage?.maxDogs ?? selectedCottage?.max_dogs ?? 1;
  const unitDogFee = selectedCottage?.dogFee ?? selectedCottage?.dog_fee ?? 70;
  const totalDogFee = isDogFriendly ? unitDogFee * dogsCount : 0;

  // Extras available for the selected cottage (managed in Admin)
  const availableExtras: CottageExtra[] = useMemo(() => {
    const raw = selectedCottage?.extras ?? storeCottage?.extras ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [selectedCottage, storeCottage]);

  // Dynamic media resolution for extras: resolves any imageMediaId / image_media_id
  const extraMediaIds = useMemo(() => {
    const ids: string[] = [];
    for (const ex of availableExtras) {
      const mid = ex.imageMediaId || (ex as any).image_media_id;
      if (mid && typeof mid === "string" && mid.trim().length > 0) {
        ids.push(mid.trim());
      }
    }
    return Array.from(new Set(ids));
  }, [availableExtras]);

  const { data: resolvedExtraPhotos } = useMediaUrls(extraMediaIds);

  const extraMediaMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of resolvedExtraPhotos ?? []) {
      if (item?.id && item?.url) {
        map.set(item.id, item.url);
      }
    }
    return map;
  }, [resolvedExtraPhotos]);

  const getExtraImageUrl = (extra: CottageExtra): string | null => {
    const mid = extra.imageMediaId || (extra as any).image_media_id;
    if (mid && extraMediaMap.has(mid)) {
      return extraMediaMap.get(mid)!;
    }
    const directUrl = extra.imageUrl || (extra as any).image_url;
    if (directUrl && typeof directUrl === "string" && directUrl.trim().length > 0) {
      return directUrl.trim();
    }
    return null;
  };

  const calculateExtraAmount = (extra: CottageExtra): number => {
    if (extra.pricingType === "PER_PERSON") {
      return extra.price * Math.max(1, adults);
    }
    return extra.price;
  };

  const totalExtrasPounds = useMemo(() => {
    let sum = 0;
    for (const extra of availableExtras) {
      if (selectedExtraIds.has(extra.id)) {
        sum += calculateExtraAmount(extra);
      }
    }
    return sum;
  }, [availableExtras, selectedExtraIds, adults]);

  const grandTotal = cottageTotalPounds + totalDogFee + totalExtrasPounds;

  if (!isOpen) return null;

  const toggleExtra = (id: string) => {
    setSelectedExtraIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getCottageCoverUrl = (rt: SearchResultRoomType): string | null => {
    const mediaList = rt.media && rt.media.length > 0 ? rt.media : [];
    const imageList = rt.images && rt.images.length > 0 ? rt.images : [];
    const photoMedia = mediaList.filter((m) => m.kind !== "video");
    const sorted = [...(photoMedia.length > 0 ? photoMedia : imageList)].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return (sorted[0] as { url?: string })?.url ?? null;
  };

  const getCottagePhotoCount = (rt: SearchResultRoomType): number => {
    const mediaList = rt.media && rt.media.length > 0 ? rt.media : [];
    const imageList = rt.images && rt.images.length > 0 ? rt.images : [];
    const photoMedia = mediaList.filter((m) => m.kind !== "video");
    return photoMedia.length > 0 ? photoMedia.length : imageList.length || 1;
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) closeBookingJourney();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-2 sm:p-4 backdrop-blur-xs"
    >
      <div
        data-lenis-prevent
        role="dialog"
        aria-label="Preview booking journey"
        aria-modal="true"
        className="relative my-auto flex max-h-[92vh] w-full max-w-[1140px] flex-col overflow-y-auto overscroll-contain border-0 bg-[#f7f4ec] text-[#243c30] shadow-[0_20px_90px_rgba(0,0,0,0.267)]"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-[25px] border-b border-[#d8d9cb] bg-[#f7f4ec] px-[30px] py-[23px]">
          <div>
            <span className="mb-[8px] block text-[9px] font-semibold uppercase leading-[14.4px] tracking-[1.8px]">
              {bjSettings?.previewNotice || "DESIGN PREVIEW · NO BOOKINGS OR PAYMENTS TAKEN"}
            </span>
            <h2 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[35px] font-normal leading-[35.7px] tracking-[-0.875px]">
              {bjSettings?.modalTitle || "Book your stay."}
            </h2>
          </div>
          <button
            type="button"
            data-action="close"
            aria-label="Close booking preview"
            onClick={closeBookingJourney}
            className="flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-full border border-[#243c30] text-[#243c30] opacity-85 transition-opacity hover:opacity-100 outline-offset-[5px]"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
            >
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </div>

        {/* 5-Step Progress Nav */}
        <nav
          aria-label="Booking progress"
          className="grid grid-cols-5 gap-[12px] border-b border-[#d8d9cb] bg-[#eeeade] px-[30px] py-[20px]"
        >
          {[
            { index: 0, label: "Dates" },
            { index: 1, label: "Cottage" },
            { index: 2, label: "Extras" },
            { index: 3, label: "Details & payment" },
            { index: 4, label: "Confirmation" },
          ].map(({ index, label }) => {
            const isActive = step === index;
            const isCompleted = step > index;
            return (
              <button
                key={index}
                type="button"
                data-step={index}
                aria-current={isActive ? "step" : undefined}
                disabled={step < index}
                onClick={() => setStep(index)}
                className={`flex min-w-0 items-center gap-[8px] text-[10px] leading-[15px] outline-offset-[5px] transition-colors ${
                  isActive
                    ? "cursor-pointer font-medium text-[#243c30]"
                    : isCompleted
                      ? "cursor-pointer text-[#243c30]/80 hover:text-[#243c30]"
                      : "cursor-not-allowed opacity-45 text-[#7a806f]"
                }`}
              >
                <span
                  className={`grid h-[25px] w-[25px] shrink-0 place-items-center rounded-full text-[11px] ${
                    isActive
                      ? "border border-[#243c30] bg-[#243c30] text-white"
                      : isCompleted
                        ? "border border-[#243c30] bg-[#243c30]/10 text-[#243c30]"
                        : "border border-[#a2aa94] text-[#7a806f]"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Step 0: Dates */}
        {step === 0 && (
          <div className="p-[31px_40px_27px] max-w-[650px] mx-auto">
            <span className="block text-[9px] font-semibold uppercase leading-[14.4px] tracking-[1.8px] text-[#ac812a]">
              {bjSettings?.step1Subtitle || "YOUR STAY AT HOME FARM"}
            </span>
            <h3 className="m-0 mt-[11px] font-['Instrument_Serif',Georgia,serif] text-[38px] font-normal leading-[41.8px] tracking-[-0.95px]">
              {bjSettings?.step1Title || "When would you like to stay?"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!checkIn || !checkOut) {
                  toast.error("Choose both arrival and departure dates.");
                  return;
                }
                if (checkOut <= checkIn) {
                  toast.error("Check-out date must be after check-in date.");
                  return;
                }
                setStep(1);
              }}
              className="mt-[27px]"
            >
              <div className="grid grid-cols-2 gap-[20px]">
                <DateField
                  id="booking-checkIn"
                  label="Arrival"
                  value={checkIn}
                  min={today}
                  contentClassName="z-[120]"
                  onChange={(value) => {
                    setCheckIn(value);
                    if (!checkOut || checkOut <= value) {
                      const inDate = new Date(`${value}T00:00:00`);
                      if (!Number.isNaN(inDate.getTime())) {
                        setCheckOut(toDayKey(addDays(inDate, 3)));
                      }
                    }
                  }}
                />
                <DateField
                  id="booking-checkOut"
                  label="Departure"
                  value={checkOut}
                  min={checkIn || today}
                  contentClassName="z-[120]"
                  onChange={setCheckOut}
                />
                <label className="flex flex-col gap-[9px] text-[11px]">
                  <span className="text-[10px] tracking-[0.6px] text-[#535b51]">ADULTS</span>
                  <select
                    name="booking-adults"
                    aria-label="Adults"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="h-[48px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[11px_13px] text-[13px] text-[#243c30] outline-offset-[5px]"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-[9px] text-[11px]">
                  <span className="text-[10px] tracking-[0.6px] text-[#535b51]">CHILDREN</span>
                  <select
                    name="booking-children"
                    aria-label="Children"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="h-[48px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[11px_13px] text-[13px] text-[#243c30] outline-offset-[5px]"
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-[20px] flex flex-col gap-[9px] text-[11px]">
                <span className="text-[10px] tracking-[0.6px] text-[#535b51]">COTTAGE</span>
                <select
                  name="booking-preferred"
                  aria-label="Preferred cottage"
                  value={selectedCottageId}
                  onChange={(e) => setSelectedCottageId(e.target.value)}
                  className="h-[48px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[11px_13px] text-[13px] text-[#243c30] outline-offset-[5px]"
                >
                  <option value="">Explore all cottages</option>
                  {cottages.map((item) => (
                    <option key={item.roomType.id} value={item.roomType.id}>
                      {item.roomType.name} · sleeps {item.roomType.maxOccupancy}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="mt-[27px] inline-flex min-h-[49px] w-full cursor-pointer items-center justify-center gap-[24px] border-0 bg-[#243c30] p-[14px_23px] text-[12px] font-medium leading-[16.2px] text-[#fffdf8] transition-colors hover:bg-[#1b2d24] outline-offset-[5px]"
              >
                Check availability
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                >
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </button>

              <p className="m-0 mt-[13px] text-center text-[10px] leading-[17.5px] text-[#535b51]">
                {bjSettings?.step1Note || "Design preview · example prices, no live availability."}
              </p>
            </form>

            <div className="mt-[25px] border-t border-[#d8d9cb] pt-[15px] text-center">
              <button
                type="button"
                onClick={closeBookingJourney}
                className="inline-flex cursor-pointer items-center justify-between gap-[25px] border-0 border-b border-[#243c30] p-[8px_0_10px] text-[11px] leading-[17.6px] text-[#243c30] outline-offset-[5px]"
              >
                {bjSettings?.step1ExploreLinkText || "Explore the cottages first"}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                >
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Steps 1, 2, 3: Layout with Main content + Aside price summary */}
        {(step === 1 || step === 2 || step === 3) && (
          <div className="grid grid-cols-1 gap-[28px] p-[27px] lg:grid-cols-[1fr_280px]">
            {/* Main Area */}
            <div>
              {/* STEP 1: Choose your cottage */}
              {step === 1 && (
                <div>
                  <div>
                    <span className="mb-[10px] block text-[9px] font-semibold uppercase leading-[14.4px] tracking-[1.8px] text-[#ac812a]">
                      {bjSettings?.step2Subtitle || "YOUR STAY AT HOME FARM"}
                    </span>
                    <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[39px] font-normal leading-[39.78px] tracking-[-0.975px]">
                      {bjSettings?.step2Title || "Choose your cottage."}
                    </h3>
                    <p className="m-0 mt-[10px] max-w-[510px] text-[13px] leading-[22.1px] text-[#535b51]">
                      {bjSettings?.step2Description ||
                        "Take a closer look and choose your place at Home Farm."}
                    </p>
                  </div>

                  {/* Date/Guest pill banner */}
                  <div className="mt-[22px] flex items-center justify-between gap-[15px] border border-[#d8d9cb] bg-[#e9ecdf] p-[14px_16px] text-[12px]">
                    <span className="flex items-center gap-[10px]">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-[16px] w-[16px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                      >
                        <path d="M5 5h14v15H5ZM8 3v4m8-4v4M5 10h14" />
                      </svg>
                      {formatDisplayDate(checkIn)} – {formatDisplayDate(checkOut)} · {adults}{" "}
                      guest{adults === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      data-action="edit-booking-dates"
                      onClick={() => setStep(0)}
                      className="cursor-pointer border-0 text-[11px] text-[#243c30] underline underline-offset-4 outline-offset-[5px]"
                    >
                      Change
                    </button>
                  </div>

                  {/* Header info */}
                  <div className="mt-[28px] flex items-center justify-between gap-[15px]">
                    <h4 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[28px] font-normal tracking-[-0.56px]">
                      {cottages.length} cottages to explore
                    </h4>
                    <span className="text-[10px] text-[#535b51]">1 cottage selected</span>
                  </div>

                  {/* Cottage cards grid */}
                  <div className="mt-[17px] grid grid-cols-1 gap-[18px] md:grid-cols-2">
                    {cottages.map((item) => {
                      const rt = item.roomType;
                      const isSelected = rt.id === selectedCottageId;
                      const cover = getCottageCoverUrl(rt);
                      const photoCnt = getCottagePhotoCount(rt);
                      const petOk = Boolean(
                        rt.dogPolicyEnabled ??
                          rt.dog_policy_enabled ??
                          ((rt.maxDogs ?? rt.max_dogs) != null && Number(rt.maxDogs ?? rt.max_dogs) > 0),
                      );
                      const itemPerNightPence = item.rates[0]?.perNight ?? 26000;
                      const itemPerNightPounds = Math.round(itemPerNightPence / 100);
                      const itemTotalPounds = itemPerNightPounds * nights;

                      return (
                        <article
                          key={rt.id}
                          aria-label={`${rt.name} booking option`}
                          onClick={() => setSelectedCottageId(rt.id)}
                          className={`flex cursor-pointer flex-col overflow-hidden border bg-[#fffdf8] transition-all ${
                            isSelected
                              ? "border-[#243c30] ring-1 ring-[#243c30]"
                              : "border-[#d8d9cb]"
                          }`}
                        >
                          <button
                            type="button"
                            data-gallery={rt.slug}
                            aria-label={`View ${rt.name} photos`}
                            aria-haspopup="dialog"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryCottageId(rt.id);
                            }}
                            className="relative block w-full overflow-hidden border-0 bg-[#d5d8cb] p-0 text-left cursor-pointer outline-offset-[5px]"
                          >
                            <SafeImage
                              src={cover}
                              alt={`${rt.name} interior`}
                              className="h-[190px] w-full object-cover transition-transform duration-350 hover:scale-105"
                            />
                            <span className="pointer-events-none absolute right-[11px] bottom-[11px] flex items-center gap-[6px] rounded-[2px] bg-[rgba(255,253,248,0.937)] p-[6px_9px] text-[9px] text-[#243c30]">
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-[13px] w-[13px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                              >
                                <path d="M4 7h4l2-3h4l2 3h4v13H4ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0" />
                              </svg>
                              {photoCnt} photos
                            </span>
                            {isSelected && (
                              <span className="absolute top-[11px] left-[11px] bg-[#243c30] p-[6px_9px] text-[8px] uppercase tracking-[0.48px] text-[#fffdf8]">
                                Your choice
                              </span>
                            )}
                          </button>

                          <div className="flex flex-1 flex-col p-[17px]">
                            <h4 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[30px] font-normal leading-[33px] tracking-[-0.6px]">
                              {rt.name}
                            </h4>
                            <p className="m-0 mt-[10px] text-[10px] leading-[18px] text-[#535b51]">
                              Sleeps {rt.maxOccupancy}
                              {rt.bedrooms != null && ` · ${rt.bedrooms} bedrooms`}
                              {rt.bathrooms != null &&
                                ` · ${rt.bathrooms} bathroom${rt.bathrooms === 1 ? "" : "s"}`}
                              {petOk && (
                                <span className="block mt-[3px] text-[9px] text-[#243c30]">
                                  Pet friendly
                                </span>
                              )}
                            </p>

                            {petOk && (
                              <p className="m-0 mt-[14px] block text-[11px] leading-[18.7px] text-[#243c30]">
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="mr-[5px] inline-block h-[17px] w-[17px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round align-middle"
                                >
                                  <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                                </svg>
                                {rt.dogPolicyTitle ||
                                  `Dogs welcome · £${rt.dogFee ?? 70} per dog, per stay`}
                                <small className="mt-[6px] block pl-[24px] text-[10px] leading-[15px] text-[#535b51]">
                                  {rt.dogPolicySubtitle ||
                                    `Up to ${rt.maxDogs ?? 1} dog · added only if you bring a dog`}
                                </small>
                              </p>
                            )}

                            <div className="mt-[15px] flex flex-col gap-[5px]">
                              <strong className="font-['Instrument_Serif',Georgia,serif] text-[30px] font-normal leading-[36px]">
                                <small className="font-['DM_Sans',Arial,sans-serif] text-[9px] text-[#535b51]">
                                  From{" "}
                                </small>
                                £{itemPerNightPounds}
                                <small className="font-['DM_Sans',Arial,sans-serif] text-[9px] text-[#535b51]">
                                  {" "}
                                  / night
                                </small>
                              </strong>
                              <span className="text-[10px] text-[#535b51]">
                                £{itemTotalPounds.toLocaleString()} cottage total · {nights} nights
                              </span>
                            </div>

                            <div className="mt-auto flex items-center justify-between gap-[12px] border-t border-[#d8d9cb] pt-[12px] mt-[17px]">
                              <button
                                type="button"
                                data-gallery={rt.slug}
                                aria-haspopup="dialog"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGalleryCottageId(rt.id);
                                }}
                                className="flex cursor-pointer items-center gap-[9px] border-0 border-b border-[#243c30] p-[4px_0] text-[10px] text-[#243c30] outline-offset-[5px]"
                              >
                                Photos &amp; details
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="pointer-events-none h-[14px] w-[14px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                                >
                                  <path d="M7 17 17 7M7 7h10v10" />
                                </svg>
                              </button>
                              <label
                                className={`flex min-h-[36px] cursor-pointer items-center justify-center gap-[7px] p-[7px_9px] text-[10px] transition-colors ${
                                  isSelected
                                    ? "border border-[#243c30] bg-[#e9ecdf]"
                                    : "border border-[#243c30]/25 bg-transparent"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="booking-cottage"
                                  value={rt.id}
                                  checked={isSelected}
                                  onChange={() => setSelectedCottageId(rt.id)}
                                  className="m-0 h-[14px] w-[14px] shrink-0 accent-[#243c30]"
                                />
                                <span>{isSelected ? "Selected" : "Choose"}</span>
                              </label>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    data-action="enquire"
                    onClick={() => {
                      alert("Planning a multi-cottage booking? Contact our team directly to arrange group stays!");
                    }}
                    className="mt-[18px] block cursor-pointer border-0 text-left text-[10px] text-[#243c30] underline underline-offset-4 outline-offset-[5px]"
                  >
                    {bjSettings?.groupStayText || "Booking several cottages? Plan a group stay ↗"}
                  </button>

                  <div className="mt-[25px] flex items-center justify-between gap-[15px]">
                    <button
                      type="button"
                      data-action="booking-next"
                      onClick={() => setStep(2)}
                      className="ml-auto flex min-h-[49px] cursor-pointer items-center justify-center gap-[15px] border-0 bg-[#243c30] p-[13px_17px] text-[11px] font-medium leading-[14.85px] text-[#fffdf8] transition-colors hover:bg-[#1b2d24] outline-offset-[5px]"
                    >
                      Continue to extras
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                      >
                        <path d="M4 12h15m-6-6 6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Extras */}
              {step === 2 && (
                <div>
                  {/* Dogs Policy Box */}
                  {isDogFriendly ? (
                    <section className="mb-[28px] border border-[#b8c3ac] bg-[#e9ecdf] p-[22px]">
                      <div className="flex items-start gap-[13px]">
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="h-[28px] w-[28px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                        >
                          <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                        </svg>
                        <div>
                          <h4 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[35.2px]">
                            {bjSettings?.step3DogsTitle || "Bringing a dog?"}
                          </h4>
                          <p className="m-0 mt-[8px] text-[12px] leading-[21.6px]">
                            {selectedCottage?.name} welcomes up to {maxDogsAllowed} dog
                            {maxDogsAllowed === 1 ? "" : "s"}. £{unitDogFee} per dog for the whole
                            stay.
                          </p>
                        </div>
                      </div>

                      <label className="mt-[18px] block flex-col gap-[9px] text-[11px]">
                        <span className="mb-[8px] block text-[10px] tracking-[0.8px] text-[#535b51]">
                          DOGS JOINING YOUR STAY
                        </span>
                        <select
                          name="booking-dogs"
                          aria-label="Dogs joining your stay"
                          value={dogsCount}
                          onChange={(e) => setDogsCount(Number(e.target.value))}
                          className="block h-[46px] min-h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[12px] text-[14px] text-[#243c30] outline-offset-[5px]"
                        >
                          <option value="0">No dogs — no charge</option>
                          {Array.from({ length: maxDogsAllowed }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n} dog{n === 1 ? "" : "s"} — +£{unitDogFee * n} per stay
                            </option>
                          ))}
                        </select>
                      </label>

                      <p role="status" className="m-0 mt-[12px] text-[11px] leading-[19.25px]">
                        {dogsCount > 0
                          ? `£${totalDogFee} pet charge included in your total.`
                          : "No pet charge added."}
                      </p>
                    </section>
                  ) : (
                    <p className="mb-[25px] border border-[#d8d9cb] bg-[#e9ecdf] p-[16px] text-[12px] leading-[21.6px]">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="mr-[6px] inline-block h-[20px] w-[18px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round align-middle"
                      >
                        <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                      </svg>
                      {bjSettings?.noPetsNotice || "This cottage does not accommodate pets."}{" "}
                      <button
                        type="button"
                        data-action="pet-cottages"
                        onClick={() => setStep(1)}
                        className="inline-flex cursor-pointer items-center justify-between gap-[25px] border-0 border-b border-[#243c30] p-[8px_0_10px] text-[11px] leading-[17.6px] text-[#243c30] outline-offset-[5px]"
                      >
                        See pet-friendly cottages
                      </button>
                    </p>
                  )}

                  {/* Make it your kind of stay */}
                  <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[32.64px] tracking-[-0.8px]">
                    {bjSettings?.extrasHeading || "Make it your kind of stay."}
                  </h3>
                  <p className="m-0 mt-[10px] text-[12px] leading-[20.4px] text-[#535b51]">
                    {bjSettings?.extrasDescription ||
                      "A little more time outdoors, or something lovely around the table. Everything here is optional."}
                  </p>

                  {availableExtras.length === 0 ? (
                    <div className="mt-[20px] rounded border border-dashed border-[#d8d9cb] p-6 text-center text-xs text-[#535b51]">
                      No optional extras currently listed for this cottage. Admin can add extras in the Admin Panel anytime.
                    </div>
                  ) : (
                    <div className="mt-[24px] grid gap-[12px]">
                      {availableExtras.map((extra) => {
                        const isChecked = selectedExtraIds.has(extra.id);
                        const extraPrice = calculateExtraAmount(extra);

                        return (
                          <label
                            key={extra.id}
                            className="flex cursor-pointer items-center gap-[12px] border border-[#d8d9cb] bg-[#fffdf8] p-[12px] transition-colors hover:border-[#243c30]/50"
                          >
                            <SafeImage
                              src={getExtraImageUrl(extra)}
                              alt={extra.title}
                              className="h-[65px] w-[65px] shrink-0 object-cover"
                            />
                            <div>
                              <span className="block text-[12px] font-medium">{extra.title}</span>
                              <span className="mt-[5px] block text-[10px] leading-[16px] text-[#535b51]">
                                {extra.description ||
                                  (extra.pricingType === "PER_PERSON"
                                    ? `£${extra.price} per adult`
                                    : `£${extra.price} per stay`)}
                              </span>
                              <span className="mt-[4px] block font-['Instrument_Serif',Georgia,serif] text-[21px]">
                                + £{extraPrice}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleExtra(extra.id)}
                              className="ml-auto h-[17px] w-[17px] shrink-0 accent-[#243c30]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <p className="m-0 mt-[18px] bg-[#e9e2cf] p-[11px_13px] text-[10px] leading-[17px] text-[#655b3e]">
                    {bjSettings?.extrasDisclaimer ||
                      "These prices demonstrate the booking flow. Final prices, times, availability and package inclusions must be confirmed before the live site offers them."}
                  </p>

                  <div className="mt-[25px] flex items-center justify-between gap-[15px]">
                    <button
                      type="button"
                      data-action="booking-back"
                      onClick={() => setStep(1)}
                      className="cursor-pointer border-0 p-[10px_0] text-[11px] text-[#243c30] outline-offset-[5px]"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      data-action="booking-next"
                      onClick={() => setStep(3)}
                      className="flex min-h-[49px] cursor-pointer items-center justify-center gap-[15px] border-0 bg-[#243c30] p-[13px_17px] text-[11px] font-medium leading-[14.85px] text-[#fffdf8] transition-colors hover:bg-[#1b2d24] outline-offset-[5px]"
                    >
                      Your details
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                      >
                        <path d="M4 12h15m-6-6 6 6-6 6" />
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    data-action="skip-extras"
                    onClick={() => {
                      setSelectedExtraIds(new Set());
                      setStep(3);
                    }}
                    className="mt-[18px] block cursor-pointer border-0 text-left text-[10px] text-[#243c30] underline underline-offset-4 outline-offset-[5px]"
                  >
                    Skip activities &amp; dining →
                  </button>
                </div>
              )}

              {/* STEP 3: Details & payment */}
              {step === 3 && (
                <div>
                  {dogsCount > 0 && isDogFriendly && (
                    <p className="mb-[25px] border border-[#d8d9cb] bg-[#e9ecdf] p-[16px] text-[12px] leading-[21.6px]">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="mr-[6px] inline-block h-[20px] w-[18px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round align-middle"
                      >
                        <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                      </svg>
                      {dogsCount} dog{dogsCount === 1 ? "" : "s"} · £{totalDogFee} pet charge
                      included.
                    </p>
                  )}

                  <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[32.64px] tracking-[-0.8px]">
                    {bjSettings?.step4Title || "Guest Details & Payment"}
                  </h3>
                  <p className="m-0 mt-[10px] text-[12px] leading-[20.4px] text-[#535b51]">
                    {clientSecret
                      ? "Your cottage is reserved. Complete payment securely below to confirm your stay."
                      : bjSettings?.step4Description ||
                        "Please provide your contact details to secure your reservation at Home Farm."}
                  </p>

                  {holdError && (
                    <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      {holdError}
                    </div>
                  )}

                  {!clientSecret ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!firstName.trim() || !lastName.trim()) {
                          toast.error("Please enter your first and last name.");
                          return;
                        }
                        if (!/.+@.+\..+/.test(email.trim())) {
                          toast.error("Please enter a valid email address.");
                          return;
                        }
                        if (phone.trim().length < 4) {
                          toast.error("Please enter a valid phone number.");
                          return;
                        }

                        if (!selectedCottage) {
                          toast.error("Please choose a cottage first.");
                          setStep(1);
                          return;
                        }

                        setIsCreatingHold(true);
                        setHoldError(null);

                        try {
                          const res = await createGuestBooking(
                            {
                              rooms: [
                                {
                                  roomTypeId: selectedCottage.id,
                                  ratePlanId: selectedCottageItem?.rates[0]?.ratePlanId ?? "",
                                  quantity: 1,
                                },
                              ],
                              checkIn,
                              checkOut,
                              guests: {
                                adults,
                                children,
                                ...(dogsCount > 0 && isDogFriendly
                                  ? { dogs: dogsCount, dogsCount }
                                  : {}),
                              },
                              contact: {
                                title,
                                firstName: firstName.trim(),
                                lastName: lastName.trim(),
                                email: email.trim(),
                                phone: phone.trim(),
                                mobile: phone.trim(),
                                ...(address1.trim() ? { address1: address1.trim() } : {}),
                                ...(city.trim() ? { city: city.trim() } : {}),
                                ...(postcode.trim() ? { postcode: postcode.trim() } : {}),
                              },
                              notes: [
                                requests.trim(),
                                selectedExtraIds.size > 0
                                  ? `Selected Extras: ${availableExtras
                                      .filter((x) => selectedExtraIds.has(x.id))
                                      .map((x) => `${x.title}${x.pricingType === "PER_PERSON" ? ` (${adults} guests)` : ""}`)
                                      .join(", ")}`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join("\n"),
                              acceptPrivacy: true,
                              acceptTerms: true,
                            },
                            idempotencyKey.current,
                          );

                          setBookingId(res.booking.id);
                          setBookingNumber(res.booking.bookingNumber);
                          setConfirmedTotal(grandTotal);

                          const secret = res.payment?.clientSecret;
                          if (secret) {
                            setClientSecret(secret);
                          } else if (res.paymentError) {
                            setHoldError(res.paymentError);
                            toast.error(res.paymentError);
                          } else {
                            // If payment not required (e.g. manual / external confirmation)
                            setStep(4);
                          }
                        } catch (err: any) {
                          const msg =
                            err?.response?.data?.message ||
                            err?.message ||
                            "Failed to reserve cottage. Please try again.";
                          setHoldError(msg);
                          toast.error(msg);
                        } finally {
                          setIsCreatingHold(false);
                        }
                      }}
                    >
                      <div className="mt-[24px] grid grid-cols-1 gap-[17px_14px] md:grid-cols-2">
                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            TITLE
                          </span>
                          <select
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          >
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Miss">Miss</option>
                            <option value="Dr">Dr</option>
                          </select>
                        </label>
                        <div className="hidden md:block" />

                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            FIRST NAME *
                          </span>
                          <input
                            name="firstName"
                            aria-label="First name"
                            autoComplete="given-name"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First name"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            LAST NAME *
                          </span>
                          <input
                            name="lastName"
                            aria-label="Last name"
                            autoComplete="family-name"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last name"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        <label className="col-span-full flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            EMAIL ADDRESS *
                          </span>
                          <input
                            type="email"
                            name="email"
                            aria-label="Email address"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        <label className="col-span-full flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            PHONE NUMBER *
                          </span>
                          <input
                            type="tel"
                            name="phone"
                            aria-label="Phone number"
                            autoComplete="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Your contact number"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        <label className="col-span-full flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            ADDRESS LINE 1
                          </span>
                          <input
                            name="address1"
                            aria-label="Address"
                            autoComplete="street-address"
                            value={address1}
                            onChange={(e) => setAddress1(e.target.value)}
                            placeholder="House number & street name"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            CITY / TOWN
                          </span>
                          <input
                            name="city"
                            aria-label="City"
                            autoComplete="address-level2"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City / Town"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            POSTCODE
                          </span>
                          <input
                            name="postcode"
                            aria-label="Postcode"
                            autoComplete="postal-code"
                            value={postcode}
                            onChange={(e) => setPostcode(e.target.value)}
                            placeholder="e.g. SP5 2DU"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        <label className="col-span-full flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            ANYTHING WE SHOULD KNOW? (OPTIONAL)
                          </span>
                          <textarea
                            name="requests"
                            aria-label="Special requests"
                            value={requests}
                            onChange={(e) => setRequests(e.target.value)}
                            placeholder="A question or a little detail about your stay"
                            className="h-[80px] w-full resize-y rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>
                      </div>

                      <div className="mt-[25px] flex items-center justify-between gap-[15px]">
                        <button
                          type="button"
                          data-action="booking-back"
                          onClick={() => setStep(2)}
                          className="cursor-pointer border-0 p-[10px_0] text-[11px] text-[#243c30] underline underline-offset-4 outline-offset-[5px]"
                        >
                          ← Back to extras
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingHold}
                          className="flex min-h-[49px] cursor-pointer items-center justify-center gap-[15px] border-0 bg-[#243c30] p-[13px_22px] text-[11px] font-medium leading-[14.85px] text-[#fffdf8] transition-colors hover:bg-[#1b2d24] disabled:opacity-50 disabled:cursor-not-allowed outline-offset-[5px]"
                        >
                          {isCreatingHold ? "Reserving cottage…" : "Proceed to secure payment →"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {/* Guest Summary Card */}
                      <div className="flex items-center justify-between border border-[#d8d9cb] bg-[#fffdf8] p-4 text-[12px]">
                        <div>
                          <p className="font-semibold text-[#243c30]">
                            {title} {firstName} {lastName}
                          </p>
                          <p className="text-[11px] text-[#535b51]">
                            {email} · {phone}
                          </p>
                          {postcode && (
                            <p className="text-[10px] text-[#535b51]">
                              {address1 ? `${address1}, ` : ""}{city ? `${city}, ` : ""}{postcode}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setClientSecret(null)}
                          className="cursor-pointer border-0 text-[11px] text-[#243c30] underline underline-offset-4"
                        >
                          Change
                        </button>
                      </div>

                      {/* Embedded Stripe Elements Form */}
                      {stripePromise && (
                        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                          <JourneyPaymentForm
                            totalAmount={grandTotal}
                            bookingId={bookingId!}
                            onSuccess={() => setStep(4)}
                            onBack={() => setClientSecret(null)}
                          />
                        </Elements>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Aside: Sticky Price Summary */}
            <aside
              aria-label="Booking price summary"
              className="sticky top-[90px] self-start border border-[#d0d6c3] bg-[#e9ecdf] p-[18px]"
            >
              <SafeImage
                src={selectedCottage ? getCottageCoverUrl(selectedCottage) : null}
                alt={selectedCottage?.name ?? "Cottage"}
                className="mb-[17px] h-[110px] w-full object-cover"
              />
              <span className="block text-[10px] font-semibold uppercase leading-[16px] tracking-[2px]">
                YOUR LITTLE ESCAPE
              </span>
              <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[27px] font-normal leading-[27.54px] tracking-[-0.675px]">
                {selectedCottage?.name}
              </h3>
              <p className="m-0 mt-[12px] text-[11px] leading-[19.8px] text-[#535b51]">
                {formatDisplayDate(checkIn)} – {formatDisplayDate(checkOut)}
                <br />
                {nights} nights · {adults} adult{adults === 1 ? "" : "s"}
                {children > 0 && `, ${children} child${children === 1 ? "" : "ren"}`}
              </p>

              <button
                type="button"
                data-action="edit-booking-dates"
                onClick={() => setStep(0)}
                className="flex cursor-pointer items-center gap-[10px] border-0 p-[8px_0] text-[10px] text-[#243c30] underline underline-offset-4 outline-offset-[5px]"
              >
                Change dates &amp; guests
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none h-[13px] w-[13px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                >
                  <path d="M5 5h14v15H5ZM8 3v4m8-4v4M5 10h14" />
                </svg>
              </button>

              <div className="mt-[12px] flex justify-between gap-[13px] text-[11px] leading-[17.05px]">
                <span>
                  £{perNightPounds} × {nights} nights
                </span>
                <span>£{cottageTotalPounds.toLocaleString()}</span>
              </div>

              {dogsCount > 0 && isDogFriendly && (
                <div className="mt-[12px] flex justify-between gap-[13px] text-[11px] font-medium leading-[17.05px] text-[#243c30]">
                  <span>
                    {dogsCount} dog × £{unitDogFee} / stay
                  </span>
                  <span>£{totalDogFee}</span>
                </div>
              )}

              {availableExtras
                .filter((ex) => selectedExtraIds.has(ex.id))
                .map((extra) => (
                  <div
                    key={extra.id}
                    className="mt-[8px] flex justify-between gap-[13px] text-[11px] font-medium leading-[17.05px] text-[#243c30]"
                  >
                    <span className="truncate pr-2">{extra.title}</span>
                    <span>£{calculateExtraAmount(extra)}</span>
                  </div>
                ))}

              <div className="mt-[18px] flex items-center justify-between gap-[13px] border-t border-[#bdc4ae] pt-[16px] text-[12px] leading-[18.6px]">
                <span>Total amount</span>
                <strong
                  data-total={grandTotal}
                  className="font-['Instrument_Serif',Georgia,serif] text-[31px] font-normal"
                >
                  £{grandTotal.toLocaleString()}
                </strong>
              </div>

              <p className="m-0 mt-[16px] text-[9px] leading-[15.3px] text-[#535b51]">
                Taxes and all charges included. Secure card payment via Stripe.
              </p>
            </aside>
          </div>
        )}

        {/* STEP 4: Confirmation */}
        {step === 4 && (
          <div className="mx-auto max-w-[650px] p-[47px_25px_55px] text-center">
            <div className="mx-auto mb-[22px] grid h-[64px] w-[64px] place-items-center rounded-full bg-[#243c30] text-[#fffdf8]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-[30px] w-[30px] shrink-0 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <span className="block text-[10px] font-semibold uppercase tracking-[2px] text-[#ac812a]">
              BOOKING CONFIRMED
            </span>
            <h2 className="m-0 mt-2 font-['Instrument_Serif',Georgia,serif] text-[48px] font-normal leading-[50px] tracking-[-1px]">
              Thank you, {firstName || "Guest"}.
            </h2>
            <p className="mx-auto mt-2 text-[14px] text-[#535b51]">
              Your stay at <strong>{selectedCottage?.name}</strong> is confirmed.
            </p>

            {bookingNumber && (
              <div className="mx-auto my-6 inline-flex items-center gap-2 rounded border border-[#d8d9cb] bg-[#fffdf8] px-4 py-2 text-xs">
                <span className="text-[#535b51]">Reference:</span>
                <strong className="font-mono text-sm tracking-wide text-[#243c30]">
                  {bookingNumber}
                </strong>
              </div>
            )}

            <div className="mx-auto my-4 max-w-[480px] rounded border border-[#d8d9cb] bg-[#fffdf8] p-4 text-left text-xs leading-relaxed text-[#535b51]">
              <div className="flex justify-between py-1 border-b border-[#eee]">
                <span>Cottage</span>
                <span className="font-medium text-[#243c30]">{selectedCottage?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eee]">
                <span>Dates</span>
                <span className="font-medium text-[#243c30]">
                  {formatDisplayDate(checkIn)} – {formatDisplayDate(checkOut)} ({nights} nights)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eee]">
                <span>Guests</span>
                <span className="font-medium text-[#243c30]">
                  {adults} adult{adults > 1 ? "s" : ""}
                  {children > 0 ? `, ${children} child${children > 1 ? "ren" : ""}` : ""}
                  {dogsCount > 0 && isDogFriendly ? `, ${dogsCount} dog` : ""}
                </span>
              </div>
              <div className="flex justify-between py-1.5 font-semibold text-[#243c30]">
                <span>Total paid</span>
                <span>£{(confirmedTotal || grandTotal).toLocaleString()}</span>
              </div>
            </div>

            <p className="mx-auto my-[20px] max-w-[480px] text-[12px] leading-[20px] text-[#535b51]">
              A confirmation email has been sent to <strong>{email}</strong>. Directions, check-in instructions, and your welcome guide will arrive prior to your stay.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {bookingId && (
                <Link
                  to={`/booking/confirmation/${bookingId}/`}
                  onClick={closeBookingJourney}
                  className="inline-flex min-h-[46px] items-center justify-center gap-[12px] border border-[#243c30] bg-transparent px-[22px] py-[12px] text-[12px] font-medium text-[#243c30] no-underline transition-colors hover:bg-[#243c30] hover:text-[#fffdf8]"
                >
                  View Full Receipt &amp; Details
                </Link>
              )}
              <button
                type="button"
                data-action="back-home"
                onClick={closeBookingJourney}
                className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-[16px] border-0 bg-[#243c30] px-[24px] py-[12px] text-[12px] font-medium text-[#fffdf8] transition-colors hover:bg-[#1b2d24] outline-offset-[5px]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {galleryRoomType && (
        <CottageGalleryDialog
          roomType={galleryRoomType}
          search={{ checkIn, checkOut, adults, children, rooms: 1 }}
          open
          onClose={() => setGalleryCottageId(null)}
          onExplore={closeBookingJourney}
        />
      )}
    </div>,
    document.body,
  );
}

export default BookingJourneyDialog;
