import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { addDays } from "date-fns";
import toast from "react-hot-toast";
import { countNights, formatDisplayDate, toDayKey } from "@/lib/date";
import { getStripePromise } from "@/lib/stripe";
import { DateField } from "@/components/common/DateField";
import { getCurrencySymbol, setDefaultCurrency } from "@/lib/money";
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
import type { CheckoutSection, AcknowledgementItem } from "@/modules/cms/api/cms.api";

function formatTimeLabel(value: string | null | undefined, fallback: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!match) return fallback;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "pm" : "am";
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

function sanitizeCheckoutHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(?:"|')?\s*javascript:[^"'>\s]*/gi, '$1="#"');
}

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
  currencySymbol = "£",
  onSuccess,
  onBack,
}: {
  totalAmount: number;
  bookingId: string;
  currencySymbol?: string;
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
          {paying ? "Processing payment…" : `Pay ${currencySymbol}${totalAmount.toLocaleString()} & Confirm`}
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

  // Extract primitives so effect deps are stable (store returns whole state object,
  // so cottage/searchParams would be new references every render without selectors).
  const storeCottageId = storeCottage?.id ?? null;
  const storeCheckIn = storeSearchParams?.checkIn ?? "";
  const storeCheckOut = storeSearchParams?.checkOut ?? "";
  const storeAdults = storeSearchParams?.adults ?? "";
  const storeChildren = storeSearchParams?.children ?? undefined;

  // Load Admin Configured Site Settings
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: fetchSiteSettings,
    staleTime: 300_000,
  });

  const bjSettings = siteSettings?.bookingPage?.bookingJourney;
  const currencyCode = siteSettings?.currency || "GBP";
  const currencySymbol = getCurrencySymbol(currencyCode);
  const minStayNights = Math.max(1, siteSettings?.minimumStayNights ?? 2);

  // Resolve a single booking journey field: { isEnabled, value }
  // Disabled or missing fields yield an empty value and are not rendered.
  const bjField = (key: string) => {
    const f = (bjSettings as Record<string, { isEnabled?: boolean; value?: string }> | undefined)?.[key];
    return { isEnabled: f?.isEnabled !== false, value: f?.value ?? "" };
  };
  const bjValue = (key: string) => {
    const field = bjField(key);
    return field.isEnabled ? field.value : "";
  };

  useEffect(() => {
    if (siteSettings?.currency) {
      setDefaultCurrency(siteSettings.currency);
    }
  }, [siteSettings?.currency]);

  // Step state: 0=Dates, 1=Cottage, 2=Extras, 3=Details & payment, 4=Confirmation
  const [step, setStep] = useState<number>(0);

  // Mobile/browser back button handling: keep the user inside the journey and
  // step backwards instead of leaving the page/dialog.
  const historyGuardRef = useRef(false);
  const ignorePopUntilRef = useRef(0);

  // Dates & Guests — no default dates; filled from the home search when the
  // guest has already picked them, otherwise chosen in this step.
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [today] = useState(() => toDayKey(new Date()));

  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // Selected Cottages (multi-select supported)
  const [selectedCottageIds, setSelectedCottageIds] = useState<string[]>([]);

  // Cottage whose photo gallery is open (selection stays on the Choose button/checkbox)
  const [galleryCottageId, setGalleryCottageId] = useState<string | null>(null);

  // Selected Extras (unified stay-level: extraId -> qty; qty > 0 means selected)
  const [extraQtys, setExtraQtys] = useState<Record<string, number>>({});

  // Dogs selection (count per cottageId)
  const [dogsByCottage, setDogsByCottage] = useState<Record<string, number>>({});

  // Guest Details & Billing
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Acknowledgements & Policies state
  const [acceptedAckItems, setAcceptedAckItems] = useState<Record<string, boolean>>({});

  const ack = siteSettings?.bookingAcknowledgement;
  const bookingPage = siteSettings?.bookingPage;
  const reservationConfig = bookingPage?.reservationDetails;
  const showReservationDetails = reservationConfig?.isEnabled !== false;
  const showReservationTitle = reservationConfig?.showTitle !== false;
  const reservationTitle = reservationConfig?.title?.trim() || "Reservation details";
  const showSpecialRequestsLabel =
    reservationConfig?.showSpecialRequestsLabel !== false &&
    (reservationConfig as any)?.showLabel !== false;
  const specialRequestsLabel = reservationConfig?.specialRequestsLabel?.trim() || "Special Requests";
  const showSpecialRequestsPlaceholder =
    reservationConfig?.showSpecialRequestsPlaceholder !== false &&
    (reservationConfig as any)?.showPlaceholder !== false;
  const specialRequestsPlaceholder = showSpecialRequestsPlaceholder
    ? reservationConfig?.specialRequestsPlaceholder?.trim() || "Special Requests"
    : "";
  const specialRequestsMaxLength =
    reservationConfig?.maxLength && reservationConfig.maxLength > 0
      ? reservationConfig.maxLength
      : 1000;

  const policiesConfig = bookingPage?.policies;
  const showPolicies = ack?.showPoliciesSection !== false && policiesConfig?.isEnabled !== false;
  const policiesTitle = policiesConfig?.title?.trim() || "Policies";
  const checkInLabel = policiesConfig?.checkInLabel?.trim() || "Check-in";
  const checkOutLabel = policiesConfig?.checkOutLabel?.trim() || "Check-out";
  const policiesCheckInText =
    policiesConfig?.checkInText?.trim() ||
    `after ${formatTimeLabel(siteSettings?.checkInTime, "4:00 pm")}`;
  const policiesCheckOutText =
    policiesConfig?.checkOutText?.trim() ||
    `before ${formatTimeLabel(siteSettings?.checkOutTime, "10:00 am")}`;

  const checkoutSections: CheckoutSection[] = useMemo(() => {
    if (ack?.sections && ack.sections.length > 0) {
      return ack.sections;
    }
    return [
      {
        id: "sec-acknowledgement",
        title: ack?.title || "Acknowledgement",
        introText: ack?.introText || "",
        isEnabled: ack?.isEnabled !== false && ack?.showAcknowledgementSection !== false,
        items: (ack?.items && ack.items.length > 0)
          ? ack.items
          : [
              {
                id: "ack-privacy",
                text: ack?.privacyCheckboxText || "* I agree with the Privacy Terms.",
                linkLabel: ack?.privacyLinkLabel || "Privacy Notice",
                linkUrl: ack?.privacyLinkUrl || "/policies/PRIVACY",
                isRequired: true,
                openInNewTab: true,
                isEnabled: true,
              },
              {
                id: "ack-terms",
                text: ack?.termsCheckboxText || "I agree with the Booking Conditions.",
                linkLabel: ack?.termsLinkLabel || "Booking Conditions",
                linkUrl: ack?.termsLinkUrl || "/policies/TERMS",
                isRequired: true,
                openInNewTab: true,
                isEnabled: true,
              },
            ],
      },
    ];
  }, [ack]);

  const activeCheckoutSections = useMemo(() => {
    return checkoutSections.filter((s) => s.isEnabled !== false);
  }, [checkoutSections]);

  const allRequiredItems = useMemo(() => {
    const list: AcknowledgementItem[] = [];
    for (const sec of activeCheckoutSections) {
      for (const it of (sec.items ?? [])) {
        if (it.isEnabled !== false && it.isRequired !== false) {
          list.push(it);
        }
      }
    }
    return list;
  }, [activeCheckoutSections]);

  const allRequiredAcksAccepted = useMemo(() => {
    return allRequiredItems.every((it) => !!acceptedAckItems[it.id]);
  }, [allRequiredItems, acceptedAckItems]);

  const toggleAckItem = (id: string, checked: boolean) => {
    setAcceptedAckItems((prev) => ({ ...prev, [id]: checked }));
  };

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

  // When store triggers open - start at step 0 (Dates) unless dates are
  // already selected, in which case jump straight to step 2 (Extras)
  useEffect(() => {
    if (isOpen) {
      if (storeCottageId) {
        setSelectedCottageIds([storeCottageId]);
      } else {
        setSelectedCottageIds([]);
      }
      if (storeCheckIn) {
        setCheckIn(storeCheckIn);
      } else {
        setCheckIn("");
      }
      if (storeCheckOut) {
        setCheckOut(storeCheckOut);
      } else {
        setCheckOut("");
      }
      if (storeAdults) {
        setAdults(storeAdults);
      }
      if (storeChildren !== undefined) {
        setChildren(storeChildren);
      }
      if (storeCheckIn && storeCheckOut) {
        setStep(1); // Dates already picked — go straight to extras
      } else {
        setStep(0);
      }
      setClientSecret(null);
      setBookingId(null);
      setBookingNumber(null);
      setHoldError(null);
    } else {
      setExtraQtys({});
      setDogsByCottage({});
      setSelectedCottageIds([]);
      setClientSecret(null);
      setGalleryCottageId(null);
    }
  }, [isOpen, storeCottageId, storeCheckIn, storeCheckOut, storeAdults, storeChildren, closeBookingJourney]);

  // Push a guard history entry while the dialog is open so the hardware/browser
  // back button doesn't navigate away from the booking journey.
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    if (window.history.state?.__bookingJourney !== true) {
      window.history.pushState(
        { ...(window.history.state ?? {}), __bookingJourney: true },
        "",
      );
    }
    historyGuardRef.current = true;

    return () => {
      if (!historyGuardRef.current) return;
      historyGuardRef.current = false;
      // Remove our guard entry only when the user is still on it (not when a
      // navigation, e.g. "View Full Receipt", already replaced the entry).
      if (window.history.state?.__bookingJourney === true) {
        ignorePopUntilRef.current = Date.now() + 400;
        window.history.back();
      }
    };
  }, [isOpen]);

  // Back button: step backwards through the journey. At the first step the
  // guard is re-armed so the dialog is never dismissed by the back button.
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const handlePopState = () => {
      if (Date.now() < ignorePopUntilRef.current) return;
      if (!historyGuardRef.current) return;

      window.history.pushState(
        { ...(window.history.state ?? {}), __bookingJourney: true },
        "",
      );

      if (galleryCottageId) {
        setGalleryCottageId(null);
        return;
      }
      setStep((prev) => (prev > 0 ? prev - 1 : prev));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOpen, galleryCottageId]);

  // Find currently selected cottages (multi-select supported)
  const selectedCottageItems = useMemo(() => {
    return cottages.filter((c) => selectedCottageIds.includes(c.roomType.id));
  }, [cottages, selectedCottageIds]);

  const selectedCottages = selectedCottageItems.map((c) => c.roomType);

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

  const cottageTotalPounds = useMemo(() => {
    return selectedCottageItems.reduce((sum, item) => {
      const rates = item.rates;
      const perNight = rates && rates.length > 0 ? Math.min(...rates.map((r) => r.perNight)) : 26000;
      return sum + Math.round(perNight / 100) * nights;
    }, 0);
  }, [selectedCottageItems, nights]);

  // Dog Policy — true if any selected cottage is dog friendly
  const isDogFriendly = useMemo(() => {
    return selectedCottages.some((c) => {
      const isEnabled =
        c.dogPolicyEnabled === true || c.dog_policy_enabled === true;
      const rawDogs = c.maxDogs ?? c.max_dogs;
      const maxD = rawDogs != null ? Number(rawDogs) : 0;
      return isEnabled && maxD > 0;
    });
  }, [selectedCottages]);

  // Per-cottage dog fee: each cottage uses its own dogFees/dog_fee.
  const cottageDogFee = useMemo(() => {
    const map: Record<
      string,
      {
        custom: Record<number, number>;
        unit: number;
        maxDogs: number;
        title?: string | null;
        subtitle?: string | null;
        imageUrl?: string | null;
      }
    > = {};
    for (const c of selectedCottages) {
      if (c.dogPolicyEnabled === false || c.dog_policy_enabled === false) continue;
      const rawDogs = c.maxDogs ?? c.max_dogs;
      const configuredMax = rawDogs != null ? Number(rawDogs) : 0;
      if (configuredMax <= 0) continue;

      const cc = c as any;
      let df = cc.dogFees ?? cc.dog_fees ?? null;
      if (typeof df === "string") {
        try {
          df = JSON.parse(df);
        } catch {
          df = null;
        }
      }
      const custom: Record<number, number> = {};
      if (df && typeof df === "object") {
        for (const [k, v] of Object.entries(df)) {
          const n = Number(k);
          if (!Number.isNaN(n) && n > 0) custom[n] = Number(v) || 0;
        }
      }
      const customKeys = Object.keys(custom).map(Number);
      const effectiveMaxDogs = Math.max(configuredMax, ...customKeys, 1);

      map[c.id] = {
        custom,
        unit: c.dogFee ?? c.dog_fee ?? 70,
        maxDogs: effectiveMaxDogs,
        title: c.dogPolicyTitle ?? (c as any).dog_policy_title ?? null,
        subtitle: c.dogPolicySubtitle ?? (c as any).dog_policy_subtitle ?? null,
        imageUrl: c.dogPolicyImageUrl ?? (c as any).dog_policy_image_url ?? null,
      };
    }
    return map;
  }, [selectedCottages]);

  const totalDogFee = useMemo(() => {
    let sum = 0;
    for (const cottage of selectedCottages) {
      const feeInfo = cottageDogFee[cottage.id];
      if (!feeInfo) continue;
      const count = dogsByCottage[cottage.id] ?? 0;
      if (count <= 0) continue;
      const custom = feeInfo.custom[count];
      if (custom != null && custom >= 0) {
        sum += custom;
      } else {
        sum += feeInfo.unit * count;
      }
    }
    return sum;
  }, [selectedCottages, cottageDogFee, dogsByCottage]);

  const customDogFeeForCottage = (cottageId: string, count: number): string => {
    const feeInfo = cottageDogFee[cottageId];
    if (!feeInfo) return "";
    const custom = feeInfo.custom[count];
    const lineFee = custom != null && custom >= 0 ? custom : feeInfo.unit * count;
    return `${currencySymbol}${lineFee} per stay (${count} dog${count === 1 ? "" : "s"})`;
  };

  // Unified Stay-Level Extras
  // Priority 1: SiteSettings globalExtras
  // Priority 2: Deduplicated extras across selected cottages
  // Priority 3: Deduplicated extras from all cottages
  const availableExtras: CottageExtra[] = useMemo(() => {
    const globalList = (siteSettings?.bookingPage as any)?.globalExtras;
    if (Array.isArray(globalList) && globalList.length > 0) {
      return globalList;
    }
    const seen = new Set<string>();
    const extras: CottageExtra[] = [];
    for (const cottage of selectedCottages) {
      const raw = cottage.extras ?? [];
      if (!Array.isArray(raw)) continue;
      for (const ex of raw) {
        if (ex.id && !seen.has(ex.id)) {
          seen.add(ex.id);
          extras.push(ex);
        }
      }
    }
    if (extras.length === 0) {
      for (const item of cottages) {
        const raw = item.roomType.extras ?? [];
        if (!Array.isArray(raw)) continue;
        for (const ex of raw) {
          if (ex.id && !seen.has(ex.id)) {
            seen.add(ex.id);
            extras.push(ex);
          }
        }
      }
    }
    return extras;
  }, [siteSettings?.bookingPage, selectedCottages, cottages]);

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

  const calculateExtraAmount = useCallback(
    (extra: CottageExtra, qty?: number): number => {
      const q = qty ?? (extraQtys[extra.id] ?? 0);
      if (q <= 0) return 0;
      if (extra.pricingType === "PER_PERSON") {
        return extra.price * Math.max(1, adults) * q;
      }
      return extra.price * q;
    },
    [adults, extraQtys],
  );

  const totalExtrasPounds = useMemo(() => {
    let sum = 0;
    for (const extra of availableExtras) {
      const q = extraQtys[extra.id] ?? 0;
      if (q > 0) {
        sum += calculateExtraAmount(extra, q);
      }
    }
    return sum;
  }, [availableExtras, extraQtys, calculateExtraAmount]);

  const grandTotal = cottageTotalPounds + totalDogFee + totalExtrasPounds;

  function changeExtraQty(id: string, delta: number) {
    setExtraQtys((prev) => {
      const ex = availableExtras.find((e) => e.id === id);
      if (!ex) return prev;
      const counterOn = ex.showCounter !== false;
      const min = Math.max(0, Number(ex.min ?? 1));
      const max = ex.max == null ? Infinity : Math.max(0, Number(ex.max));
      const current = prev[id] ?? 0;
      let next: number;
      if (!counterOn) {
        next = current > 0 ? 0 : 1;
      } else {
        if (current === 0 && delta > 0) {
          next = min > 0 ? min : 1;
        } else {
          next = current + delta;
          if (next < 1) next = 0;
          else if (next < min) next = 0;
          else if (next > max) next = max;
        }
      }
      return {
        ...prev,
        [id]: next,
      };
    });
  }

  // Categorized cottages grouped by category
  const categorizedCottages = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        description?: string | null;
        allowMultiple: boolean;
        items: SearchResultItem[];
      }
    >();

    for (const item of cottages) {
      const rt = item.roomType;
      const catId =
        rt.categoryId ??
        rt.category_id ??
        (rt.homeSection === "section_2" || rt.home_section === "section_2"
          ? "cat_estate_collection"
          : "cat_farm_cottages");
      const catName =
        rt.category?.name ??
        (catId === "cat_estate_collection" ? "The Estate Collection" : "Farm Cottages");
      const catDesc =
        rt.category?.description ??
        (catId === "cat_estate_collection"
          ? "Exclusive standalone country retreats across the estate"
          : "Picturesque self-catering cottages located on Home Farm");
      const allowMulti =
        rt.category?.allowMultiple ??
        rt.category?.allow_multiple ??
        (catId !== "cat_estate_collection");

      if (!map.has(catId)) {
        map.set(catId, {
          id: catId,
          name: catName,
          description: catDesc,
          allowMultiple: allowMulti,
          items: [],
        });
      }
      map.get(catId)!.items.push(item);
    }

    return Array.from(map.values());
  }, [cottages]);

  const handleToggleCottage = (item: SearchResultItem) => {
    const rt = item.roomType;
    const isSelected = selectedCottageIds.includes(rt.id);
    const catId =
      rt.categoryId ??
      rt.category_id ??
      (rt.homeSection === "section_2" || rt.home_section === "section_2"
        ? "cat_estate_collection"
        : "cat_farm_cottages");
    const allowMultiple =
      rt.category?.allowMultiple ??
      rt.category?.allow_multiple ??
      (catId !== "cat_estate_collection");

    if (isSelected) {
      setSelectedCottageIds((prev) => prev.filter((id) => id !== rt.id));
      return;
    }

    if (!allowMultiple) {
      // Single cottage category (e.g. The Estate Collection):
      // Clears Farm Cottages and any other selection
      setSelectedCottageIds([rt.id]);
      return;
    }

    // Multi-cottage category (Farm Cottages):
    // Deselect any single-cottage (Estate Collection) cottages, then add this cottage
    setSelectedCottageIds((prev) => {
      const filtered = prev.filter((id) => {
        const other = cottages.find((c) => c.roomType.id === id);
        if (!other) return false;
        const oRt = other.roomType;
        const oCatId =
          oRt.categoryId ??
          oRt.category_id ??
          (oRt.homeSection === "section_2" || oRt.home_section === "section_2"
            ? "cat_estate_collection"
            : "cat_farm_cottages");
        const oAllowMulti =
          oRt.category?.allowMultiple ??
          oRt.category?.allow_multiple ??
          (oCatId !== "cat_estate_collection");
        return oAllowMulti;
      });
      return [...filtered, rt.id];
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
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#d8d9cb] bg-[#f7f4ec] px-4 py-3 sm:px-[30px] sm:py-[23px]">
          <div>
            <span className="mb-[6px] sm:mb-[8px] block text-[8px] sm:text-[9px] font-semibold uppercase leading-[14.4px] tracking-[1.8px]">
              {bjValue("previewNotice")}
            </span>
            <h2 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[26px] sm:text-[35px] font-normal leading-[30px] sm:leading-[35.7px] tracking-[-0.875px]">
              {bjValue("modalTitle")}
            </h2>
          </div>
          <button
            type="button"
            data-action="close"
            aria-label="Close booking preview"
            onClick={closeBookingJourney}
            className="flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#243c30] text-[#243c30] opacity-85 transition-opacity hover:opacity-100 outline-offset-[5px]"
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
          className="border-b border-[#d8d9cb] bg-[#eeeade]"
        >
          {/* Mobile View (< sm): Connected track stepper + clear active step title */}
          <div className="px-4 py-3 sm:hidden">
            <div className="relative flex items-center justify-between">
              {/* Background track line */}
              <div
                aria-hidden="true"
                className="absolute left-[16px] right-[16px] top-[14px] h-[2px] -translate-y-1/2 bg-[#d8d9cb]"
              />
              {/* Progress filled line */}
              <div
                aria-hidden="true"
                className="absolute left-[16px] top-[14px] h-[2px] -translate-y-1/2 bg-[#243c30] transition-all duration-300"
                style={{
                  width: `${(step / 4) * 100}%`,
                  maxWidth: "calc(100% - 32px)",
                }}
              />

              {[
                { index: 0, label: "Dates" },
                { index: 1, label: "Cottage" },
                { index: 2, label: "Extras" },
                { index: 3, label: "Payment" },
                { index: 4, label: "Confirmation" },
              ].map(({ index, label }) => {
                const isActive = step === index;
                const isCompleted = step > index;
                const isClickable = step >= index;

                return (
                  <button
                    key={index}
                    type="button"
                    data-step={index}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`Step ${index + 1}: ${label}`}
                    disabled={!isClickable}
                    onClick={() => setStep(index)}
                    className={`relative z-10 flex h-[34px] w-[34px] -m-[3px] items-center justify-center rounded-full transition-all ${
                      isActive
                        ? "cursor-default"
                        : isCompleted
                          ? "cursor-pointer hover:opacity-85"
                          : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <span
                      className={`flex h-[28px] w-[28px] items-center justify-center rounded-full text-[11px] font-medium transition-all ${
                        isActive
                          ? "border-2 border-[#243c30] bg-[#243c30] text-white shadow-sm ring-4 ring-[#243c30]/15"
                          : isCompleted
                            ? "border border-[#243c30] bg-[#243c30] text-white"
                            : "border border-[#a2aa94] bg-[#eeeade] text-[#7a806f]"
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="h-3.5 w-3.5 stroke-current stroke-[2.5] fill-none"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Active Step Label & Quick Back link */}
            <div className="mt-2.5 flex items-center justify-between text-[#243c30]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] uppercase tracking-[1px] text-[#7a806f] font-semibold shrink-0">
                  Step {step + 1} of 5 ·
                </span>
                <span className="text-[12px] font-semibold truncate text-[#243c30]">
                  {[
                    "Dates & Guests",
                    "Choose Cottage",
                    "Stay Extras",
                    "Details & Payment",
                    "Confirmation",
                  ][step]}
                </span>
              </div>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-[11px] font-medium text-[#243c30] underline underline-offset-2 shrink-0 ml-2 hover:opacity-75"
                >
                  ← Back
                </button>
              )}
            </div>
          </div>

          {/* Desktop View (>= sm): Spacious 5-column layout */}
          <div className="hidden sm:grid sm:grid-cols-5 sm:gap-[12px] sm:px-[30px] sm:py-[18px]">
            {[
              { index: 0, label: "Dates", shortLabel: "Dates" },
              { index: 1, label: "Cottage", shortLabel: "Cottage" },
              { index: 2, label: "Extras", shortLabel: "Extras" },
              { index: 3, label: "Details & payment", shortLabel: "Payment" },
              { index: 4, label: "Confirmation", shortLabel: "Done" },
            ].map(({ index, label, shortLabel }) => {
              const isActive = step === index;
              const isCompleted = step > index;
              return (
                <button
                  key={index}
                  type="button"
                  data-step={index}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={label}
                  disabled={step < index}
                  onClick={() => setStep(index)}
                  className={`flex min-w-0 flex-row items-center justify-start gap-[8px] text-[10px] leading-[15px] outline-offset-[5px] transition-colors ${
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
                    {isCompleted ? (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-3 w-3 stroke-current stroke-[2.5] fill-none"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="truncate text-left">
                    <span className="md:hidden">{shortLabel}</span>
                    <span className="hidden md:inline">{label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Step 0: Dates */}
        {step === 0 && (
          <div className="p-[31px_40px_27px] max-w-[650px] mx-auto">
            <span className="block text-[9px] font-semibold uppercase leading-[14.4px] tracking-[1.8px] text-[#ac812a]">
              {bjValue("step1Subtitle")}
            </span>
            <h3 className="m-0 mt-[11px] font-['Instrument_Serif',Georgia,serif] text-[38px] font-normal leading-[41.8px] tracking-[-0.95px]">
              {bjValue("step1Title")}
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
                const n = countNights(checkIn, checkOut);
                if (n < minStayNights) {
                  toast.error(`A minimum stay of ${minStayNights} night${minStayNights === 1 ? "" : "s"} is required.`);
                  return;
                }
                setStep(1);
              }}
              className="mt-[27px]"
            >
              <div className="grid grid-cols-2 gap-[20px]">
                <DateField
                  id="booking-checkIn"
                  label={bjValue("step1CheckInLabel")}
                  value={checkIn}
                  min={today}
                  contentClassName="z-[120]"
                  onChange={(value) => {
                    setCheckIn(value);
                    const inDate = new Date(`${value}T00:00:00`);
                    if (!Number.isNaN(inDate.getTime())) {
                      const minOut = toDayKey(addDays(inDate, minStayNights));
                      if (!checkOut || checkOut < minOut) {
                        setCheckOut(toDayKey(addDays(inDate, Math.max(3, minStayNights))));
                      }
                    }
                  }}
                />
                <DateField
                  id="booking-checkOut"
                  label={bjValue("step1CheckOutLabel")}
                  value={checkOut}
                  min={checkIn ? toDayKey(addDays(new Date(`${checkIn}T00:00:00`), minStayNights)) : today}
                  contentClassName="z-[120]"
                  onChange={(val) => {
                    if (checkIn) {
                      const n = countNights(checkIn, val);
                      if (n < minStayNights) {
                        toast.error(`A minimum stay of ${minStayNights} night${minStayNights === 1 ? "" : "s"} is required.`);
                        return;
                      }
                    }
                    setCheckOut(val);
                  }}
                />
                <label className="flex flex-col gap-[9px] text-[11px]">
                  <span className="text-[10px] tracking-[0.6px] text-[#535b51]">
                    {bjValue("step1AdultsLabel")}
                  </span>
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
                  <span className="text-[10px] tracking-[0.6px] text-[#535b51]">
                    {bjValue("step1ChildrenLabel")}
                  </span>
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

              <button
                type="submit"
                className="mt-[27px] inline-flex min-h-[49px] w-full cursor-pointer items-center justify-center gap-[24px] border-0 bg-[#243c30] p-[14px_23px] text-[12px] font-medium leading-[16.2px] text-[#fffdf8] transition-colors hover:bg-[#1b2d24] outline-offset-[5px]"
              >
                {bjValue("step1ButtonText")}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                >
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </button>

              <div
                className="m-0 mt-[13px] text-center text-[10px] leading-[17.5px] text-[#535b51] [&_p]:m-0 [&_a]:underline"
                dangerouslySetInnerHTML={{
                    __html: sanitizeCheckoutHtml(bjValue("step1Note")),
                }}
              />
            </form>

            <div className="mt-[25px] border-t border-[#d8d9cb] pt-[15px] text-center">
              <button
                type="button"
                onClick={closeBookingJourney}
                className="inline-flex cursor-pointer items-center justify-between gap-[25px] border-0 border-b border-[#243c30] p-[8px_0_10px] text-[11px] leading-[17.6px] text-[#243c30] outline-offset-[5px]"
              >
                {bjValue("step1ExploreLinkText")}
                {bjValue("step1ExploreArrow") === "true" && (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="pointer-events-none h-[20px] w-[20px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                  >
                    <path d="M4 12h15m-6-6 6 6-6 6" />
                  </svg>
                )}
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
                      {bjValue("step2Subtitle")}
                    </span>
                    <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[39px] font-normal leading-[39.78px] tracking-[-0.975px]">
                      {bjValue("step2Title")}
                    </h3>
                    <p className="m-0 mt-[10px] max-w-[510px] text-[13px] leading-[22.1px] text-[#535b51]">
                      {bjValue("step2Description")}
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

                  {/* Header action bar with top Continue button (avoids having to scroll on mobile/desktop) */}
                  <div className="mt-[22px] flex justify-end border-b border-[#d8d9cb] pb-4">
                    <button
                      type="button"
                      data-action="top-continue-extras"
                      onClick={() => {
                        if (selectedCottageIds.length === 0) return;
                        setStep(2);
                      }}
                      disabled={selectedCottageIds.length === 0}
                      className="flex min-h-[46px] w-full sm:w-auto cursor-pointer items-center justify-center gap-2.5 border-0 bg-[#243c30] px-6 py-3 text-[12px] font-medium leading-none text-[#fffdf8] transition-all hover:bg-[#1b2d24] disabled:cursor-not-allowed disabled:opacity-40 outline-offset-[5px] shadow-sm"
                    >
                      <span>Continue to extras</span>
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="pointer-events-none h-4 w-4 shrink-0 fill-none stroke-[#fffdf8] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                      >
                        <path d="M4 12h15m-6-6 6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-[17px] space-y-8">
                    {categorizedCottages.map((group) => (
                      <section key={group.id} className="first:mt-0">
                        {/* Collection Category Header */}
                        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#d8d9cb] pb-2.5">
                          <div>
                            <h4 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[26px] font-normal tracking-[-0.5px] text-[#243c30]">
                              {group.name}
                            </h4>
                            {group.description && (
                              <p className="m-0 mt-0.5 text-[11px] text-[#535b51]">
                                {group.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                              group.allowMultiple
                                ? "border-[#243c30] bg-[#243c30] text-[#f4f7ee] shadow-sm"
                                : "border-[#6f520f] bg-[#6f520f] text-[#fff8e7] shadow-sm"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                group.allowMultiple
                                  ? "bg-[#a9c79b]"
                                  : "bg-[#f0d48a]"
                              }`}
                            />
                            {group.allowMultiple
                              ? "Multi-cottage booking"
                              : "Single cottage only"}
                          </span>
                        </div>

                        {/* Cottages in Category */}
                        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
                          {group.items.map((item) => {
                            const rt = item.roomType;
                            const isSelected = selectedCottageIds.includes(rt.id);
                            const cover = getCottageCoverUrl(rt);
                            const photoCnt = getCottagePhotoCount(rt);
                            const rawDogs = rt.maxDogs ?? rt.max_dogs;
                            const maxD = rawDogs != null ? Number(rawDogs) : 0;
                            const petOk =
                              (rt.dogPolicyEnabled === true ||
                                rt.dog_policy_enabled === true) &&
                              maxD > 0;
                            const itemPerNightPence = item.rates[0]?.perNight ?? 26000;
                            const itemPerNightPounds = Math.round(itemPerNightPence / 100);
                            const itemTotalPounds = itemPerNightPounds * nights;

                            return (
                              <article
                                key={rt.id}
                                aria-label={`${rt.name} booking option`}
                                onClick={() => handleToggleCottage(item)}
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
                                        `Dogs welcome · ${currencySymbol}${rt.dogFee ?? 70} per dog, per stay`}
                                      <small className="mt-[6px] block pl-[24px] text-[10px] leading-[15px] text-[#535b51]">
                                        {rt.dogPolicySubtitle ||
                                          `Up to ${maxD} dog${maxD === 1 ? "" : "s"} · added only if you bring a dog`}
                                      </small>
                                    </p>
                                  )}

                                  <div className="mt-[15px] flex flex-col gap-[5px]">
                                    <strong className="font-['Instrument_Serif',Georgia,serif] text-[30px] font-normal leading-[36px]">
                                      <small className="font-['DM_Sans',Arial,sans-serif] text-[9px] text-[#535b51]">
                                        From{" "}
                                      </small>
                                      {currencySymbol}{itemPerNightPounds}
                                      <small className="font-['DM_Sans',Arial,sans-serif] text-[9px] text-[#535b51]">
                                        {" "}
                                        / night
                                      </small>
                                    </strong>
                                    <span className="text-[10px] text-[#535b51]">
                                      {currencySymbol}{itemTotalPounds.toLocaleString()} cottage total · {nights} nights
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
                                        type="checkbox"
                                        name="booking-cottage"
                                        value={rt.id}
                                        checked={isSelected}
                                        onChange={() => handleToggleCottage(item)}
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
                      </section>
                    ))}
                  </div>

                  <button
                    type="button"
                    data-action="enquire"
                    onClick={() => {
                      alert("Planning a multi-cottage booking? Contact our team directly to arrange group stays!");
                    }}
                    className="mt-[18px] block cursor-pointer border-0 text-left text-[10px] text-[#243c30] underline underline-offset-4 outline-offset-[5px]"
                  >
                    {bjValue("groupStayText")}
                  </button>

                  <div className="mt-[25px] flex items-center justify-between gap-[15px]">
                    <button
                      type="button"
                      data-action="booking-next"
                      onClick={() => {
                        if (selectedCottageIds.length === 0) return;
                        setStep(2);
                      }}
                      disabled={selectedCottageIds.length === 0}
                      className="ml-auto flex min-h-[49px] cursor-pointer items-center justify-center gap-[15px] border-0 bg-[#243c30] p-[13px_17px] text-[11px] font-medium leading-[14.85px] text-[#fffdf8] transition-colors hover:bg-[#1b2d24] disabled:opacity-50 disabled:cursor-not-allowed outline-offset-[5px]"
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
                      {(() => {
                        // Display the first dog-friendly cottage's custom dog icon, title and subtitle if available
                        const firstFriendly = selectedCottages.find((c) => !!cottageDogFee[c.id]);
                        const friendlyInfo = firstFriendly ? cottageDogFee[firstFriendly.id] : null;
                        const customIconUrl = friendlyInfo?.imageUrl;
                        const customTitle = friendlyInfo?.title;
                        const customSubtitle = friendlyInfo?.subtitle;

                        return (
                          <div className="flex items-start gap-[13px]">
                            {customIconUrl ? (
                              <img
                                src={customIconUrl}
                                alt="Dog policy"
                                className="h-[28px] w-[28px] shrink-0 object-contain"
                              />
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-[28px] w-[28px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                              >
                                <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                              </svg>
                            )}
                            <div>
                              {customTitle ? (
                                <div
                                  className="font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[35.2px] [&_p]:m-0"
                                  dangerouslySetInnerHTML={{ __html: customTitle }}
                                />
                              ) : (
                                <h4 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[35.2px]">
                                  {bjValue("step3DogsTitle")}
                                </h4>
                              )}

                              {customSubtitle ? (
                                <div
                                  className="mt-[8px] text-[12px] leading-[21.6px] [&_p]:m-0"
                                  dangerouslySetInnerHTML={{ __html: customSubtitle }}
                                />
                              ) : (
                                <p className="m-0 mt-[8px] text-[12px] leading-[21.6px]">
                                  {firstFriendly && friendlyInfo
                                    ? `${firstFriendly.name} welcomes up to ${friendlyInfo.maxDogs} dog${friendlyInfo.maxDogs === 1 ? "" : "s"}. ${currencySymbol}${friendlyInfo.unit} per dog for the whole stay.`
                                    : bjValue("step3DogsDescription")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Per-cottage dog selectors */}
                      <label className="mt-[18px] block flex-col gap-[9px] text-[11px]">
                        <span className="mb-[8px] block text-[10px] tracking-[0.8px] text-[#535b51]">
                          {bjValue("step3DogsSelectLabel")}
                        </span>
                        {selectedCottages.map((cottage) => {
                          const feeInfo = cottageDogFee[cottage.id];
                          if (!feeInfo) return null;
                          const count = dogsByCottage[cottage.id] ?? 0;
                          const maxDogsForThis = feeInfo.maxDogs;
                          return (
                            <div key={cottage.id} className="mt-[4px] space-y-1">
                              <span className="text-[10px] text-[#535b51]">
                                {cottage.name}
                              </span>
                              <select
                                name={`booking-dogs-${cottage.id}`}
                                aria-label={`Dogs for ${cottage.name}`}
                                value={count}
                                onChange={(e) => {
                                  setDogsByCottage((prev) => ({
                                    ...prev,
                                    [cottage.id]: Number(e.target.value),
                                  }));
                                }}
                                className="block h-[46px] min-h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[12px] text-[14px] text-[#243c30] outline-offset-[5px]"
                              >
                                <option value="0">{bjValue("step3DogsZeroOption")}</option>
                                {Array.from({ length: maxDogsForThis }, (_, i) => i + 1).map((n) => {
                                  const custom = feeInfo.custom[n];
                                  const lineFee = custom != null && custom >= 0 ? custom : feeInfo.unit * n;
                                  return (
                                    <option key={n} value={n}>
                                      {n} dog{n === 1 ? "" : "s"} — +{currencySymbol}{lineFee} per stay
                                    </option>
                                  );
                                })}
                              </select>
                              {count > 0 && (
                                <p className="m-0 text-[10px] text-[#243c30] font-medium">
                                  {customDogFeeForCottage(cottage.id, count)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </label>

                      <p role="status" className="m-0 mt-[12px] text-[11px] leading-[19.25px]">
                        {Object.values(dogsByCottage).some((c) => c > 0)
                          ? `${currencySymbol}${totalDogFee} total pet charge included.`
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
                      {bjValue("noPetsNotice")}{" "}
                      <button
                        type="button"
                        data-action="pet-cottages"
                        onClick={() => setStep(1)}
                        className="inline-flex cursor-pointer items-center justify-between gap-[25px] border-0 border-b border-[#243c30] p-[8px_0_10px] text-[11px] leading-[17.6px] text-[#243c30] outline-offset-[5px]"
                      >
                        {bjValue("seePetCottagesText")}
                      </button>
                    </p>
                  )}

                  {/* Make it your kind of stay */}
                  <h3
                    className="m-0 font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[32.64px] tracking-[-0.8px] [&_p]:m-0"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeCheckoutHtml(bjValue("extrasHeading")),
                    }}
                  />
                  <div
                    className="m-0 mt-[10px] text-[12px] leading-[20.4px] text-[#535b51] [&_p]:m-0 [&_a]:underline"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeCheckoutHtml(bjValue("extrasDescription")),
                    }}
                  />

                  {/* Unified Stay-Level Extras */}
                  {availableExtras.length === 0 ? (
                    <div
                      className="mt-[20px] rounded border border-dashed border-[#d8d9cb] p-6 text-center text-xs text-[#535b51] [&_p]:m-0 [&_a]:underline"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeCheckoutHtml(bjValue("extrasEmptyMessage")),
                      }}
                    />
                  ) : (
                    <div className="mt-[20px] grid gap-[12px]">
                      {availableExtras.map((extra) => {
                        const qty = extraQtys[extra.id] ?? 0;
                        const isSelected = qty > 0;
                        const imgSrc = getExtraImageUrl(extra);
                        const plainTitle = (extra.title || "").replace(/<[^>]*>/g, "").trim();
                        const counterOn = extra.showCounter !== false;
                        const max = extra.max == null ? Infinity : Math.max(0, Number(extra.max));

                        const origPrice =
                          extra.originalPrice ??
                          (extra as { original_price?: number | null }).original_price ??
                          (extra.id === "extra_golf" || /golf/i.test(plainTitle)
                            ? 70
                            : extra.id === "extra_padel" || /padel/i.test(plainTitle)
                              ? 30
                              : null);
                        const hasDiscount =
                          origPrice != null && Number(origPrice) > Number(extra.price);
                        const savings = hasDiscount
                          ? Number(origPrice) - Number(extra.price)
                          : 0;

                        const cleanDesc = (extra.description || "")
                          .replace(
                            /^(?:<p>)?(?:&pound;|£|\$|\u20ac)\d+(?:\.\d+)?\s*(?:per\s+[a-zA-Z]+)?\s*[·•-]\s*/i,
                            (match) => (match.startsWith("<p>") ? "<p>" : ""),
                          )
                          .trim();

                        return (
                          <div
                            key={extra.id}
                            className={`flex items-center gap-3 sm:gap-4 rounded-[14px] sm:rounded-[16px] border p-3.5 sm:p-4 transition-all ${
                              isSelected
                                ? "border-[#243c30] bg-[#fffdfa] ring-1 ring-[#243c30]/40 shadow-xs"
                                : "border-[#e5e4da] bg-[#fffdfa] hover:border-[#243c30]/40 shadow-2xs"
                            }`}
                          >
                            {/* Left: Image */}
                            {imgSrc ? (
                              <SafeImage
                                src={imgSrc}
                                alt={plainTitle}
                                className="h-[68px] w-[68px] sm:h-[76px] sm:w-[76px] shrink-0 rounded-[10px] sm:rounded-[12px] object-cover shadow-2xs border border-[#e5e4da]/60"
                              />
                            ) : (
                              <div className="flex h-[68px] w-[68px] sm:h-[76px] sm:w-[76px] shrink-0 items-center justify-center rounded-[10px] sm:rounded-[12px] bg-[#f2efe6] text-[#7a806f] border border-[#e5e4da]/60">
                                <span className="font-serif text-[22px] font-bold text-[#243c30]/40">
                                  {plainTitle.charAt(0) || "★"}
                                </span>
                              </div>
                            )}

                            {/* Middle: Title & Description */}
                            <div className="min-w-0 flex-1 pr-1 sm:pr-2">
                              <div
                                className="font-serif text-[18px] sm:text-[21px] font-bold text-[#1b2f24] leading-snug tracking-[-0.2px] [&_p]:m-0 [&_a]:underline"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeCheckoutHtml(extra.title),
                                }}
                              />
                              {cleanDesc ? (
                                <div
                                  className="mt-1 text-[12px] sm:text-[13px] leading-relaxed italic text-[#555d50] [&_p]:m-0 [&_a]:underline"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeCheckoutHtml(cleanDesc),
                                  }}
                                />
                              ) : (
                                <span className="mt-1 block text-[12px] sm:text-[13px] italic text-[#555d50]">
                                  {extra.pricingType === "PER_PERSON" ? "per adult" : "per stay"}
                                </span>
                              )}
                            </div>

                            {/* Right: Vertical border + Price + Subtitle / Badge + Stepper */}
                            <div className="flex flex-col items-end justify-center pl-3.5 sm:pl-4 border-l border-[#e5e4da] shrink-0 min-w-[95px] sm:min-w-[115px]">
                              <span className="font-serif text-[22px] sm:text-[24px] font-bold text-[#1b2f24] leading-none">
                                {currencySymbol}{extra.price}
                              </span>

                              {hasDiscount ? (
                                <>
                                  <span className="mt-1 text-[11px] text-[#788172] line-through italic leading-tight">
                                    {currencySymbol}{origPrice} usual price
                                  </span>
                                  <span className="mt-1 inline-flex items-center rounded-full bg-[#dbe8d2] px-2 py-0.5 text-[10.5px] font-semibold text-[#294a1d]">
                                    Save {currencySymbol}{savings}
                                  </span>
                                </>
                              ) : (
                                <span className="mt-1 text-[11px] text-[#60675a] italic leading-tight">
                                  {extra.pricingType === "PER_PERSON" ? "per adult" : "per stay"}
                                </span>
                              )}

                              {/* Stepper Counter / Checkbox */}
                              <div className="mt-2.5">
                                {counterOn ? (
                                  <div className="inline-flex items-center justify-between rounded-md sm:rounded-lg border border-[#c8cbbe] bg-[#fbfaf6] px-1 py-0.5 shadow-2xs h-[28px] sm:h-[30px] w-[78px] sm:w-[84px]">
                                    <button
                                      type="button"
                                      onClick={() => changeExtraQty(extra.id, -1)}
                                      disabled={qty <= 0}
                                      className="flex h-6 w-6 items-center justify-center rounded text-[15px] font-medium text-[#243c30] transition-colors hover:bg-[#e7ebd9] disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                      aria-label={`Decrease ${plainTitle}`}
                                    >
                                      −
                                    </button>
                                    <span
                                      aria-label={`Current quantity: ${qty}`}
                                      className="flex h-6 min-w-[20px] items-center justify-center px-1 text-[12.5px] font-semibold text-[#1a2f23] tabular-nums select-none"
                                    >
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => changeExtraQty(extra.id, 1)}
                                      disabled={max !== Infinity && qty >= max}
                                      className="flex h-6 w-6 items-center justify-center rounded text-[15px] font-medium text-[#243c30] transition-colors hover:bg-[#e7ebd9] disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                      aria-label={`Increase ${plainTitle}`}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <label
                                    htmlFor={`dialog-extra-${extra.id}`}
                                    className="flex items-center justify-center p-1 cursor-pointer"
                                    title={`Select ${plainTitle || "extra"}`}
                                  >
                                    <input
                                      id={`dialog-extra-${extra.id}`}
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => changeExtraQty(extra.id, qty > 0 ? -1 : 1)}
                                      className="h-[18px] w-[18px] rounded-[4px] accent-[#243c30] cursor-pointer"
                                      aria-label={`Select ${plainTitle || "extra"}`}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {bjValue("extrasDisclaimer") && (
                    <div
                      className="m-0 mt-[18px] bg-[#e9e2cf] p-[11px_13px] text-[10px] leading-[17px] text-[#655b3e] [&_p]:m-0 [&_a]:underline"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeCheckoutHtml(bjValue("extrasDisclaimer")),
                      }}
                    />
                  )}

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
                      {bjValue("step3NextButtonText")}
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
                        setExtraQtys({});
                        setStep(3);
                      }}
                    className="mt-[18px] block cursor-pointer border-0 text-left text-[10px] text-[#243c30] underline underline-offset-4 outline-offset-[5px]"
                  >
                    {bjValue("skipExtrasText")}
                  </button>
                </div>
              )}

              {/* STEP 3: Details & payment */}
              {step === 3 && (
                <div>
                  {Object.values(dogsByCottage).some((c) => c > 0) && isDogFriendly && (
                    <p className="mb-[25px] border border-[#d8d9cb] bg-[#e9ecdf] p-[16px] text-[12px] leading-[21.6px]">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="mr-[6px] inline-block h-[20px] w-[18px] shrink-0 fill-none stroke-[#243c30] stroke-[1.5] stroke-linecap-round stroke-linejoin-round align-middle"
                      >
                        <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                      </svg>
                      {selectedCottages
                        .map((c) => {
                          const count = dogsByCottage[c.id] ?? 0;
                          if (count <= 0) return null;
                          const feeInfo = cottageDogFee[c.id];
                          const custom = feeInfo?.custom[count];
                          const lineFee = custom != null && custom > 0 ? custom : feeInfo?.unit * count;
                          return `${count} dog${count === 1 ? "" : "s"} for ${c.name} (+${currencySymbol}${lineFee})`;
                        })
                        .filter(Boolean)
                        .join(" · ")}
                      · {currencySymbol}{totalDogFee} pet charge included.
                    </p>
                  )}

                  <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[32px] font-normal leading-[32.64px] tracking-[-0.8px]">
                    {bjValue("step4Title")}
                  </h3>
                  <p className="m-0 mt-[10px] text-[12px] leading-[20.4px] text-[#535b51]">
                    {clientSecret
                      ? bjValue("step4ReservedDescription")
                      : bjValue("step4Description")}
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
                        if (mobile.trim().length < 4) {
                          toast.error("Please enter a valid mobile phone number.");
                          return;
                        }
                        if (!/.+@.+\..+/.test(email.trim())) {
                          toast.error("Please enter a valid email address.");
                          return;
                        }

                        if (!allRequiredAcksAccepted) {
                          toast.error("Please accept all required agreements to continue.");
                          return;
                        }

                        if (selectedCottages.length === 0) {
                          toast.error("Please choose at least one cottage.");
                          setStep(1);
                          return;
                        }

                        setIsCreatingHold(true);
                        setHoldError(null);

                        try {
                          const res = await createGuestBooking(
                            {
                              rooms: selectedCottageItems.map((item) => ({
                                roomTypeId: item.roomType.id,
                                ratePlanId: item.rates[0]?.ratePlanId ?? "",
                                quantity: 1,
                              })),
                              checkIn,
                              checkOut,
                              guests: {
                                adults,
                                children,
                                ...(Object.values(dogsByCottage).some((c) => c > 0) && isDogFriendly
                                  ? { dogs: Object.values(dogsByCottage).reduce((a, b) => a + b, 0) }
                                  : {}),
                              },
                              dogsByCottage: isDogFriendly ? dogsByCottage : {},
                              contact: {
                                title: title || undefined,
                                firstName: firstName.trim(),
                                lastName: lastName.trim(),
                                email: email.trim(),
                                phone: mobile.trim(),
                                mobile: mobile.trim(),
                                ...(postcode.trim() ? { postcode: postcode.trim() } : {}),
                                ...(country.trim() ? { country: country.trim() } : {}),
                                ...(address1.trim() ? { address1: address1.trim() } : {}),
                                ...(address2.trim() ? { address2: address2.trim() } : {}),
                                ...(city.trim() ? { city: city.trim() } : {}),
                                ...(county.trim() ? { county: county.trim() } : {}),
                              },
                              extras: Object.entries(extraQtys)
                                .filter(([, q]) => q > 0)
                                .map(([id, q]) => ({ id, qty: q })),
                              notes: [
                                specialRequests.trim(),
                                Object.values(extraQtys).some((q) => q > 0)
                                  ? `Selected Stay Extras: ${Object.entries(extraQtys)
                                      .filter(([, q]) => q > 0)
                                      .map(([id, q]) => {
                                        const ex = availableExtras.find((e) => e.id === id);
                                        const cleanTitle = (ex?.title || id).replace(/<[^>]*>/g, "").trim();
                                        return `${cleanTitle} × ${q}`;
                                      })
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
                      <div className="mt-[24px] grid grid-cols-1 gap-[17px_14px] sm:grid-cols-2">
                        {/* Title */}
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
                            <option value="">Title</option>
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Miss">Miss</option>
                            <option value="Dr">Dr</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <div className="hidden sm:block" />

                        {/* First Name */}
                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            FIRST NAME *
                          </span>
                          <input
                            name="firstName"
                            aria-label="First name"
                            autoComplete="given-name"
                            required
                            maxLength={80}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* Last Name */}
                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            LAST NAME *
                          </span>
                          <input
                            name="lastName"
                            aria-label="Last name"
                            autoComplete="family-name"
                            required
                            maxLength={80}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* Mobile Phone */}
                        <label className="sm:col-span-2 flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            MOBILE PHONE *
                          </span>
                          <input
                            type="tel"
                            name="mobile"
                            aria-label="Mobile phone"
                            autoComplete="tel"
                            required
                            maxLength={40}
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="Mobile phone"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* Email Address */}
                        <label className="sm:col-span-2 flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            EMAIL ADDRESS *
                          </span>
                          <input
                            type="email"
                            name="email"
                            aria-label="Email address"
                            autoComplete="email"
                            required
                            maxLength={160}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                          <p className="m-0 text-[11px] text-[#535b51]">
                            This is the email we will send your confirmation to.
                          </p>
                        </label>

                        {/* Post Code */}
                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            POST CODE
                          </span>
                          <input
                            name="postcode"
                            aria-label="Post code"
                            autoComplete="postal-code"
                            maxLength={20}
                            value={postcode}
                            onChange={(e) => setPostcode(e.target.value)}
                            placeholder="Post Code"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* Country */}
                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            COUNTRY
                          </span>
                          <input
                            name="country"
                            aria-label="Country"
                            autoComplete="country-name"
                            maxLength={80}
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="Country"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* Address 1 */}
                        <label className="sm:col-span-2 flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            ADDRESS 1
                          </span>
                          <input
                            name="address1"
                            aria-label="Address 1"
                            autoComplete="address-line1"
                            maxLength={200}
                            value={address1}
                            onChange={(e) => setAddress1(e.target.value)}
                            placeholder="Address 1"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* Address 2 */}
                        <label className="sm:col-span-2 flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            ADDRESS 2
                          </span>
                          <input
                            name="address2"
                            aria-label="Address 2"
                            autoComplete="address-line2"
                            maxLength={200}
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            placeholder="Address 2"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* City / Town */}
                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            CITY / TOWN
                          </span>
                          <input
                            name="city"
                            aria-label="City / Town"
                            autoComplete="address-level2"
                            maxLength={80}
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City / Town"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>

                        {/* County / Region / State */}
                        <label className="flex flex-col gap-[9px] text-[11px]">
                          <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                            COUNTY / REGION / STATE
                          </span>
                          <input
                            name="county"
                            aria-label="County / Region / State"
                            autoComplete="address-level1"
                            maxLength={80}
                            value={county}
                            onChange={(e) => setCounty(e.target.value)}
                            placeholder="County / Region / State"
                            className="h-[46px] w-full rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                          />
                        </label>
                      </div>

                      {/* Reservation Details / Special Requests */}
                      {showReservationDetails && (
                        <div className="mt-6 border border-[#d8d9cb] bg-[#fffdf8] p-4 text-[12px]">
                          {showReservationTitle && reservationTitle && (
                            <span className="block text-[10px] font-semibold uppercase tracking-[1px] text-[#243c30]">
                              {reservationTitle}
                            </span>
                          )}
                          <label
                            className={`${
                              showReservationTitle && reservationTitle ? "mt-3" : ""
                            } flex flex-col gap-[9px] text-[11px]`}
                          >
                            {showSpecialRequestsLabel && specialRequestsLabel && (
                              <span className="text-[10px] tracking-[0.2px] text-[#535b51]">
                                {specialRequestsLabel.toUpperCase()}
                              </span>
                            )}
                            <textarea
                              name="specialRequests"
                              aria-label={specialRequestsLabel || "Special Requests"}
                              value={specialRequests}
                              onChange={(e) => setSpecialRequests(e.target.value)}
                              maxLength={specialRequestsMaxLength}
                              placeholder={specialRequestsPlaceholder}
                              className="h-[80px] w-full resize-y rounded-none border border-[#d8d9cb] bg-[#fffdf8] p-[10px_12px] text-[13px] text-[#243c30] outline-offset-[5px]"
                            />
                          </label>
                        </div>
                      )}

                      {/* Admin-configured Policies */}
                      {showPolicies && (
                        <div className="mt-6 border border-[#d8d9cb] bg-[#fffdf8] p-4 text-[12px]">
                          <span className="block text-[10px] font-semibold uppercase tracking-[1px] text-[#243c30]">
                            {policiesTitle}
                          </span>
                          <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-[#535b51]">
                            <p className="m-0">
                              <span className="font-semibold text-[#243c30]">{checkInLabel}:</span> {policiesCheckInText}
                            </p>
                            <p className="m-0">
                              <span className="font-semibold text-[#243c30]">{checkOutLabel}:</span> {policiesCheckOutText}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Admin-configured Acknowledgements / Checkout Sections */}
                      {activeCheckoutSections.map((sec) => (
                        <div key={sec.id} className="mt-4 border border-[#d8d9cb] bg-[#fffdf8] p-4 text-[12px]">
                          <span className="block text-[10px] font-semibold uppercase tracking-[1px] text-[#243c30]">
                            {sec.title}
                          </span>
                          {sec.introText && (
                            <div
                              className="mt-1 pb-1 text-[11px] text-[#535b51] [&_a]:font-medium [&_a]:underline [&_a]:hover:text-[#243c30] [&_p]:m-0"
                              dangerouslySetInnerHTML={{ __html: sanitizeCheckoutHtml(sec.introText) }}
                            />
                          )}
                          <div className="mt-2 space-y-2">
                            {(sec.items ?? [])
                              .filter((item) => item.isEnabled !== false)
                              .map((item) => (
                                <label key={item.id} className="flex items-start gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!acceptedAckItems[item.id]}
                                    onChange={(e) => toggleAckItem(item.id, e.target.checked)}
                                    className="mt-0.5 size-4 shrink-0 accent-[#243c30] cursor-pointer"
                                  />
                                  <span className="text-[11px] leading-[17px] text-[#243c30]">
                                    <span
                                      className="[&_a]:font-medium [&_a]:underline [&_a]:hover:text-[#243c30] [&_p]:m-0 [&_p]:inline"
                                      dangerouslySetInnerHTML={{ __html: sanitizeCheckoutHtml(item.text) }}
                                    />{" "}
                                    {!/<a\s/i.test(item.text) && item.linkUrl && item.linkLabel && (
                                      <Link
                                        to={item.linkUrl}
                                        target={item.openInNewTab !== false ? "_blank" : undefined}
                                        rel={item.openInNewTab !== false ? "noopener noreferrer" : undefined}
                                        className="font-medium underline hover:text-[#1b2d24]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {item.linkLabel}
                                      </Link>
                                    )}
                                  </span>
                                </label>
                              ))}
                          </div>
                        </div>
                      ))}

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
                            {title ? `${title} ` : ""}{firstName} {lastName}
                          </p>
                          <p className="text-[11px] text-[#535b51]">
                            {email} · {mobile}
                          </p>
                          {(address1 || city || county || postcode || country) && (
                            <p className="text-[10px] text-[#535b51]">
                              {[address1, address2, city, county, postcode, country].filter(Boolean).join(", ")}
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
                            currencySymbol={currencySymbol}
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

            {selectedCottages.length > 0 && (
              <aside
                aria-label="Booking price summary"
                className="sticky top-[90px] self-start border border-[#d0d6c3] bg-[#e9ecdf] p-[18px]"
              >
                <span className="block text-[10px] font-semibold uppercase leading-[16px] tracking-[2px]">
                  YOUR LITTLE ESCAPE
                </span>
                <h3 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[27px] font-normal leading-[27.54px] tracking-[-0.675px]">
                  {selectedCottages.length} cottage{selectedCottages.length === 1 ? "" : "s"} selected
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

                {/* Per-cottage price rows */}
                <div className="mt-[12px] space-y-6">
                  {selectedCottageItems.map((item) => {
                    const rt = item.roomType;
                    const rates = item.rates;
                    const perNight = rates && rates.length > 0 ? Math.min(...rates.map((r) => r.perNight)) : 26000;
                    const perNightPounds = Math.round(perNight / 100);
                    const cottageTotal = perNightPounds * nights;
                    return (
                      <div
                        key={rt.id}
                        className="border-b border-[#d8d9cb]/40 pb-[8px]"
                      >
                        <SafeImage
                          src={getCottageCoverUrl(rt)}
                          alt={rt.name}
                          className="mb-[8px] h-[60px] w-full object-cover"
                        />
                        <h4 className="m-0 font-['Instrument_Serif',Georgia,serif] text-[18px] font-normal leading-[21px]">
                          {rt.name}
                        </h4>
                        <div className="mt-[4px] flex justify-between gap-[13px] text-[10px] leading-[16px]">
                          <span>
                            {currencySymbol}{perNightPounds} × {nights} nights
                          </span>
                          <span>{currencySymbol}{cottageTotal.toLocaleString()}</span>
                        </div>
                        <p className="mt-[4px] text-[9px] text-[#535b51]">
                          Sleeps {rt.maxOccupancy}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {Object.values(dogsByCottage).some((c) => c > 0) && isDogFriendly && (
                  <div className="mt-[12px] flex justify-between gap-[13px] text-[11px] font-medium leading-[17.05px] text-[#243c30]">
                    <span>
                      {selectedCottages
                        .map((c) => {
                          const count = dogsByCottage[c.id] ?? 0;
                          if (count <= 0) return null;
                          const feeInfo = cottageDogFee[c.id];
                          const custom = feeInfo?.custom[count];
                          const lineFee = custom != null && custom > 0 ? custom : feeInfo?.unit * count;
                          return `${count} dog${count === 1 ? "" : "s"} × ${currencySymbol}${lineFee}`;
                        })
                        .filter(Boolean)
                        .join(" + ")}
                    </span>
                    <span>{currencySymbol}{totalDogFee}</span>
                  </div>
                )}

                {Object.entries(extraQtys).some(([, q]) => q > 0) && (
                  <div className="mt-[10px] space-y-1.5 border-t border-[#d8d9cb]/50 pt-[10px]">
                    <span className="block text-[9px] font-semibold uppercase tracking-[1px] text-[#535b51]">
                      Extras
                    </span>
                    {availableExtras
                      .filter((ex) => (extraQtys[ex.id] ?? 0) > 0)
                      .map((extra) => {
                        const qty = extraQtys[extra.id] ?? 0;
                        const lineTotal = calculateExtraAmount(extra, qty);
                        return (
                          <div
                            key={extra.id}
                            className="flex justify-between gap-[13px] text-[10px] font-medium leading-[16px] text-[#243c30]"
                          >
                            <span className="truncate pr-2">
                              {(extra.title || "").replace(/<[^>]*>/g, "").trim()} × {qty}
                            </span>
                            <span className="shrink-0 font-medium">
                              +{currencySymbol}{lineTotal}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}

                <div className="mt-[18px] flex items-center justify-between gap-[13px] border-t border-[#bdc4ae] pt-[16px] text-[12px] leading-[18.6px]">
                  <span>Total amount</span>
                  <strong
                    data-total={grandTotal}
                    className="font-['Instrument_Serif',Georgia,serif] text-[31px] font-normal"
                  >
                    {currencySymbol}{grandTotal.toLocaleString()}
                  </strong>
                </div>

                <div
                  className="m-0 mt-[16px] text-[9px] leading-[15.3px] text-[#535b51] [&_p]:m-0 [&_a]:underline"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeCheckoutHtml(bjValue("sidebarTaxesNotice")),
                  }}
                />
              </aside>
            )}
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
              {bjValue("step5Title")}
            </h2>
            <div
              className="mx-auto mt-2 text-[14px] text-[#535b51] [&_p]:m-0"
              dangerouslySetInnerHTML={{
                __html: sanitizeCheckoutHtml(bjValue("step5Subtitle")),
              }}
            />

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
                <span>
                  Cottage{selectedCottages.length > 1 ? "s" : ""}
                </span>
                <span className="font-medium text-[#243c30]">
                  {selectedCottages.map((c) => c.name).join(", ")}
                </span>
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
                  {Object.values(dogsByCottage).some((c) => c > 0) && isDogFriendly ? `, ${Object.values(dogsByCottage).reduce((a, b) => a + b, 0)} dog${Object.values(dogsByCottage).reduce((a, b) => a + b, 0) === 1 ? "" : "s"}` : ""}
                </span>
              </div>
              <div className="flex justify-between py-1.5 font-semibold text-[#243c30]">
                <span>Total paid</span>
                <span>{currencySymbol}{(confirmedTotal || grandTotal).toLocaleString()}</span>
              </div>
            </div>

            <div
              className="mx-auto my-[20px] max-w-[480px] text-[12px] leading-[20px] text-[#535b51] [&_p]:m-0 [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html: sanitizeCheckoutHtml(
                  bjValue("step5Note")
                    ? bjValue("step5Note").replace("{email}", email)
                    : `A confirmation email has been sent to <strong>${email}</strong>. Directions, check-in instructions, and your welcome guide will arrive prior to your stay.`,
                ),
              }}
            />

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
