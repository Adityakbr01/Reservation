import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CalendarDays, CheckCircle2, ChevronDown, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { normalizeApiError } from "@/lib/api-client";
import { getStripePromise } from "@/lib/stripe";
import { useAuthStore } from "@/stores/auth-store";
import {
  checkGuestEmail,
  createGuestBooking,
  fetchQuote,
  validateCouponCode,
} from "../api/booking.api";
import { fetchCottageOffers, getCottageBySlug } from "@/modules/cottages/api/cottages.api";
import { fetchSiteSettings, type CheckoutSection, type AcknowledgementItem } from "@/modules/cms/api/cms.api";
import { useAvailabilitySearch } from "@/modules/availability";
import { useMediaUrls } from "@/modules/media";
import type { CottageExtra } from "@/modules/availability/types/availability.types";
import {
  useCreateBooking,
  usePaymentIntent,
  useValidateCoupon,
} from "../hooks/use-booking";
import type { BookingSelection } from "../types/booking.types";

interface BookedRoom {
  key: string;
  roomTypeId: string;
  ratePlanId: string;
  quantity: number;
  roomName: string;
  rateName: string;
}

function roomKey(roomTypeId: string, ratePlanId: string): string {
  return `${roomTypeId}__${ratePlanId}`;
}

/** Minimal hardening for admin-authored checkout HTML. */
function sanitizeCheckoutHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(?:"|')?\s*javascript:[^"'>\s]*/gi, '$1="#"');
}

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Other"];

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function formatTimeLabel(value: string | null | undefined, fallback: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!match) return fallback;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "pm" : "am";
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

function parseSelection(params: URLSearchParams): BookingSelection | null {
  const roomTypeId = params.get("roomTypeId") ?? "";
  const ratePlanId = params.get("ratePlanId") ?? "";
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Number(params.get("adults") ?? "2");
  const children = Number(params.get("children") ?? "0");
  if (!roomTypeId || !ratePlanId || !checkIn || !checkOut) return null;
  if (!Number.isInteger(adults) || adults < 1) return null;
  if (!Number.isInteger(children) || children < 0) return null;
  return {
    roomTypeId,
    ratePlanId,
    checkIn,
    checkOut,
    adults,
    children,
    roomName: params.get("roomName") ?? "Selected room",
    rateName: params.get("rateName") ?? "Selected rate",
  };
}

function prettyDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
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

function PayButton({ bookingId, totalLabel }: { bookingId: string; totalLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [timeoutExceeded, setTimeoutExceeded] = useState(false);

  useEffect(() => {
    if (stripe && elements) return;
    const timer = setTimeout(() => {
      setTimeoutExceeded(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [stripe, elements]);

  if (!stripe || !elements) {
    if (timeoutExceeded) {
      return (
        <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-center">
          <p className="text-sm font-medium text-amber-900">
            Payment form is taking longer than expected to load.
          </p>
          <p className="text-xs text-amber-800">
            Please check your internet connection or ensure ad-blockers / shields allow Stripe to load.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
        <Loader className="size-4 animate-spin text-brand" />
        <span>Loading secure payment…</span>
      </div>
    );
  }

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setFailed(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmation/${bookingId}`,
      },
    });
    setPaying(false);
    if (result.error) {
      setFailed(result.error.message ?? "Payment failed. Try again.");
    } else {
      navigate(`/booking/confirmation/${bookingId}`);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        onLoadError={(err) => {
          setFailed(err.error?.message ?? "Unable to load card payment fields. Please try again.");
        }}
      />
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {failed}
        </p>
      )}
      <Button
        type="button"
        className="btn-shine h-12 w-full rounded-full text-base"
        disabled={paying}
        onClick={() => void handlePay()}
      >
        {paying ? "Processing…" : `Pay ${totalLabel} now`}
      </Button>
    </div>
  );
}

class PaymentErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Stripe payment element error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
          <p role="alert" className="text-sm font-medium text-destructive">
            Payment form could not be displayed ({this.state.error?.message || "Gateway error"}).
          </p>
          <p className="text-xs text-muted-foreground">
            If you are using an ad-blocker or content filter, please disable it for this page and retry.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry?.();
            }}
          >
            Retry payment setup
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function BookingPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selection = useMemo(() => parseSelection(params), [params]);
  const [dateError] = useState<string | null>(null);
  const sessionUser = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const isAuthed = !!sessionUser;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);
  const [autoCoupon, setAutoCoupon] = useState<string | null>(null);
  const autoTried = useRef(false);

  // Contact info (guest-visible account creation happens silently in the background).
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState(sessionUser?.email ?? "");
  const [postcode, setPostcode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [country, setCountry] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Book Faster (Optional).
  const [bookFasterOpen, setBookFasterOpen] = useState<boolean | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Acknowledgements.
  const newsletterOptIn = false;
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptedAckItems, setAcceptedAckItems] = useState<Record<string, boolean>>({});

  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const idempotencyKey = useRef(newIdempotencyKey());
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [holdFailed, setHoldFailed] = useState<string | null>(null);
  const [stripePromise] = useState(getStripePromise);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [bringingDog, setBringingDog] = useState(false);
  const [dogsCount, setDogsCount] = useState(1);

  // Multi-room selection. Starts with the room from the URL; guests can add more.
  const [rooms, setRooms] = useState<BookedRoom[]>(() =>
    selection
      ? [
          {
            key: roomKey(selection.roomTypeId, selection.ratePlanId),
            roomTypeId: selection.roomTypeId,
            ratePlanId: selection.ratePlanId,
            quantity: Math.max(1, Math.min(10, Number(params.get("rooms")) || 1)),
            roomName: selection.roomName,
            rateName: selection.rateName,
          },
        ]
      : [],
  );

  // Live inventory for the same dates — drives quantity caps + Add-room picker.
  const availabilityParams = useMemo(
    () =>
      selection
        ? {
            checkIn: selection.checkIn,
            checkOut: selection.checkOut,
            adults: 1,
            children: 0,
            rooms: 1,
          }
        : null,
    [selection?.checkIn, selection?.checkOut],
  );
  const availabilityQuery = useAvailabilitySearch(availabilityParams);
  const availabilityByRoom = useMemo(() => {
    const map = new Map<
      string,
      { availableCount: number; maxAdults: number; maxOccupancy: number; name: string }
    >();
    for (const item of availabilityQuery.data?.results ?? []) {
      map.set(item.roomType.id, {
        availableCount: item.availableCount,
        maxAdults: item.roomType.maxAdults,
        maxOccupancy: item.roomType.maxOccupancy,
        name: item.roomType.name,
      });
    }
    return map;
  }, [availabilityQuery.data]);

  const { data: cottageDetail } = useQuery({
    queryKey: ["cottage-detail", selection?.roomTypeId],
    queryFn: () => getCottageBySlug(selection?.roomTypeId as string),
    enabled: !!selection?.roomTypeId,
    staleTime: 300_000,
  });

  const cottageDogPolicy = useMemo(() => {
    const results = availabilityQuery.data?.results ?? [];
    const matched = results.filter((item) =>
      rooms.some((r) => r.roomTypeId === item.roomType.id || r.roomTypeId === item.roomType.slug),
    );
    if (matched.length > 0) {
      const allowsDogs = matched.some(
        (m) =>
          Boolean(
            m.roomType.dogPolicyEnabled ??
              (m.roomType.maxDogs != null && Number(m.roomType.maxDogs) > 0),
          ),
      );
      const maxDogs = matched.reduce((acc, m) => Math.max(acc, Number(m.roomType.maxDogs ?? 1)), 1);
      const dogFee = matched.find((m) => m.roomType.dogFee != null)?.roomType.dogFee ?? 70;
      const subtitle = matched.find((m) => m.roomType.dogPolicySubtitle)?.roomType.dogPolicySubtitle ?? null;
      return { allowsDogs, maxDogs: Math.max(1, maxDogs), dogFee, subtitle };
    }
    if (cottageDetail) {
      const allowsDogs = Boolean(
        cottageDetail.dogPolicyEnabled ??
          (cottageDetail.maxDogs != null && Number(cottageDetail.maxDogs) > 0),
      );
      const maxDogs = Math.max(1, Number(cottageDetail.maxDogs ?? 1));
      const dogFee = cottageDetail.dogFee != null ? Number(cottageDetail.dogFee) : 70;
      const subtitle = cottageDetail.dogPolicySubtitle ?? null;
      return { allowsDogs, maxDogs, dogFee, subtitle };
    }
    return { allowsDogs: false, maxDogs: 1, dogFee: 70, subtitle: null };
  }, [availabilityQuery.data, rooms, cottageDetail]);

  // Extras available for the cottage(s) in this booking
  const availableExtras: CottageExtra[] = useMemo(() => {
    const results = availabilityQuery.data?.results ?? [];
    const matched = results.filter((item) =>
      rooms.some((r) => r.roomTypeId === item.roomType.id || r.roomTypeId === item.roomType.slug),
    );
    if (matched.length > 0) {
      const list: CottageExtra[] = [];
      const seen = new Set<string>();
      for (const m of matched) {
        for (const ex of m.roomType.extras ?? []) {
          if (ex.id && !seen.has(ex.id)) {
            seen.add(ex.id);
            list.push(ex);
          }
        }
      }
      if (list.length > 0) return list;
    }
    if (cottageDetail?.extras && Array.isArray(cottageDetail.extras)) {
      return cottageDetail.extras;
    }
    return [];
  }, [availabilityQuery.data, rooms, cottageDetail]);

  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(new Set());

  // Dynamic media resolution for extras
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

  const toggleExtra = (id: string) => {
    setSelectedExtraIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calculateExtraAmount = (extra: CottageExtra): number => {
    const adultsCount = Math.max(1, selection?.adults ?? 2);
    if (extra.pricingType === "PER_PERSON") {
      return extra.price * adultsCount;
    }
    return extra.price;
  };

  const selectedExtraList = useMemo(() => {
    return availableExtras.filter((ex) => selectedExtraIds.has(ex.id));
  }, [availableExtras, selectedExtraIds]);

  const totalExtrasPounds = useMemo(() => {
    let sum = 0;
    for (const extra of selectedExtraList) {
      sum += calculateExtraAmount(extra);
    }
    return sum;
  }, [selectedExtraList, selection?.adults]);

  const totalExtrasPence = totalExtrasPounds * 100;

  // Authoritative pricing: one server quote per room line, summed. Never trust card prices.
  const quoteKey = useMemo(
    () =>
      selection
        ? [
            "multi-quote",
            selection.checkIn,
            selection.checkOut,
            rooms.map((r) => `${r.roomTypeId}:${r.ratePlanId}:${r.quantity}`).join("|"),
            appliedCoupon ?? "no-coupon",
            bringingDog ? `dogs-${dogsCount}` : "no-dogs",
            Array.from(selectedExtraIds).sort().join(","),
          ].join("~")
        : "no-quote",
    [selection, rooms, appliedCoupon, bringingDog, dogsCount, selectedExtraIds],
  );
  const quoteQuery = useQuery({
    queryKey: [quoteKey],
    queryFn: async () => {
      if (!selection) throw new Error("Missing selection");
      if (rooms.length === 0) throw new Error("Add at least one cottage");
      const parts = await Promise.all(
        rooms.map((r, idx) =>
          fetchQuote({
            roomTypeId: r.roomTypeId,
            ratePlanId: r.ratePlanId,
            checkIn: selection.checkIn,
            checkOut: selection.checkOut,
            quantity: r.quantity,
            adults: selection.adults,
            ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
            ...(idx === 0 && bringingDog ? { dogs: dogsCount, dogsCount } : {}),
            ...(idx === 0 && selectedExtraIds.size > 0 ? { extras: Array.from(selectedExtraIds) } : {}),
          }),
        ),
      );
      const currency = parts[0]?.pricing.currency ?? "GBP";
      return {
        quoteId: parts.map((p) => p.quoteId).join("+"),
        expiresAt: parts[0]?.expiresAt ?? new Date().toISOString(),
        pricing: {
          subtotal: parts.reduce((s, p) => s + p.pricing.subtotal, 0),
          discount: parts.reduce((s, p) => s + p.pricing.discount, 0),
          tax: parts.reduce((s, p) => s + (p.pricing.tax ?? 0), 0),
          dogFee: parts.reduce(
            (s, p) => s + (p.pricing.dogFee ?? (p.pricing as { dog_fee?: number }).dog_fee ?? 0),
            0,
          ),
          extrasFee: parts.reduce(
            (s, p) => s + (p.pricing.extrasFee ?? (p.pricing as { extras_fee?: number }).extras_fee ?? 0),
            0,
          ),
          total: parts.reduce((s, p) => s + p.pricing.total, 0),
          currency,
        },
        nightly: parts[0]?.nightly,
        nights: parts[0]?.nights,
        parts,
      };
    },
    enabled: !!selection && rooms.length > 0,
    staleTime: 30_000,
    retry: false,
  });
  const validateCoupon = useValidateCoupon();
  const createBooking = useCreateBooking();
  const paymentIntent = usePaymentIntent();
  const guestBooking = useMutation({
    mutationFn: (vars: Parameters<typeof createGuestBooking>[0]) =>
      createGuestBooking(vars, idempotencyKey.current),
  });
  const { data: roomOffers } = useQuery({
    queryKey: ["room-offers", selection?.roomTypeId],
    queryFn: () => fetchCottageOffers(selection?.roomTypeId as string),
    enabled: !!selection,
    staleTime: 300_000,
  });
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: fetchSiteSettings,
    staleTime: 300_000,
  });

  const bjSettings = siteSettings?.bookingPage?.bookingJourney;

  function setRoomQuantity(key: string, quantity: number) {
    setRoomError(null);
    setRooms((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const cap = Math.min(10, availabilityByRoom.get(r.roomTypeId)?.availableCount ?? 10);
        const next = Math.max(1, Math.min(cap, Math.floor(quantity) || 1));
        return { ...r, quantity: next };
      }),
    );
  }

  function removeRoom(key: string) {
    setRoomError(null);
    setRooms((prev) => {
      if (prev.length <= 1) {
        setRoomError("At least one cottage is required.");
        return prev;
      }
      return prev.filter((r) => r.key !== key);
    });
  }

  function addRoom(roomTypeId: string, ratePlanId: string, roomName: string, rateName: string) {
    setRoomError(null);
    const key = roomKey(roomTypeId, ratePlanId);
    const info = availabilityByRoom.get(roomTypeId);
    const cap = Math.min(10, info?.availableCount ?? 1);
    if (rooms.length >= 5) {
      setRoomError("Maximum 5 cottage lines per booking. Increase quantity instead.");
      return;
    }
    const existingQty = rooms.find((r) => r.key === key)?.quantity ?? 0;
    // Per-cottage inventory cap across all lines.
    const typeTotal = rooms.filter((r) => r.roomTypeId === roomTypeId).reduce((s, r) => s + r.quantity, 0);
    if (typeTotal >= cap) {
      setRoomError(`Only ${cap} ${info?.name ?? "cottage"} left for these dates.`);
      return;
    }
    setRooms((prev) => {
      const found = prev.find((r) => r.key === key);
      if (found) return prev.map((r) => (r.key === key ? { ...r, quantity: Math.min(cap, r.quantity + 1) } : r));
      void existingQty;
      return [...prev, { key, roomTypeId, ratePlanId, quantity: 1, roomName, rateName }];
    });
    setShowAddRoom(false);
    toast.success(`${roomName} added`);
  }

  const missingSelection = !selection;
  useEffect(() => {
    if (missingSelection) {
      toast.error("Choose a cottage and dates first");
    }
  }, [missingSelection]);

  // Scroll to payment once the hold is created and the card appears.
  useEffect(() => {
    if (bookingId) {
      document.getElementById("checkout-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bookingId]);

  // Auto-apply the cottage's offer (e.g. AUTUMN20) so guests never type codes.
  // Runs once: validates against this stay, then applies silently.
  useEffect(() => {
    if (!selection || !roomOffers || roomOffers.length === 0) return;
    if (autoTried.current || appliedCoupon !== undefined || couponInput.trim() !== "") return;
    const offer = roomOffers[0];
    if (!offer) return;
    const from = offer.validFrom?.slice(0, 10) ?? null;
    const until = offer.validUntil?.slice(0, 10) ?? null;
    if (from && selection.checkOut <= from) return;
    if (until && selection.checkIn > until) return;
    autoTried.current = true;
    void (async () => {
      try {
        const check = await validateCouponCode({
          code: offer.couponCode,
          roomTypeId: selection.roomTypeId,
          subtotal: quoteQuery.data?.pricing.subtotal,
        });
        if (check.valid) {
          setCouponInput(offer.couponCode);
          setAppliedCoupon(offer.couponCode);
          setAutoCoupon(offer.couponCode);
          toast.success(`${offer.couponCode} applied automatically`);
        }
      } catch {
        // Advisory only — checkout works fine without the offer.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomOffers, selection]);

  // Self-heal: a coupon the server rejects must never block pricing.
  useEffect(() => {
    if (quoteQuery.isError && appliedCoupon !== undefined) {
      setAppliedCoupon(undefined);
      setAutoCoupon(null);
    }
  }, [quoteQuery.isError, appliedCoupon]);

  if (!selection) {
    return <Navigate to="/" replace />;
  }

  const quote = quoteQuery.data ?? null;
  const nights = quote?.nights ?? quote?.nightly?.length ?? 0;
  const busy = createBooking.isPending || paymentIntent.isPending || guestBooking.isPending;

  const displayGrandTotalPence = useMemo(() => {
    if (!quote) return 0;
    const serverExtrasFee = (quote.pricing.extrasFee ?? (quote.pricing as { extras_fee?: number }).extras_fee ?? 0);
    if (serverExtrasFee > 0 || selectedExtraIds.size === 0) {
      return quote.pricing.total;
    }
    return quote.pricing.total + totalExtrasPence;
  }, [quote, selectedExtraIds.size, totalExtrasPence]);

  function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    validateCoupon.mutate(code, {
      onSuccess: (data) => {
        if (data.valid) setAppliedCoupon(code);
      },
    });
  }

  async function handleEmailBlur() {
    if (isAuthed || emailExists) return;
    if (!/.+@.+\..+/.test(email)) return;
    setCheckingEmail(true);
    try {
      const result = await checkGuestEmail(email.trim());
      setEmailExists(result.exists);
    } catch {
      // Probe is advisory only — the server re-checks authoritatively.
    } finally {
      setCheckingEmail(false);
    }
  }

  function contactValid(): boolean {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      /.+@.+\..+/.test(email) &&
      mobile.trim().length >= 4
    );
  }

  function passwordValid(): boolean {
    if (!bookFasterEnabled || !createAccount) return true;
    return password.length >= 8 && password === confirmPassword;
  }

  // Guests can proceed freely even if their email is already registered
  const emailBlocked = false;

  /** Multi-cottage validation: positive ints, combined capacity, dates, inventory, no stale lines. */
  function roomsValid(): string | null {
    if (rooms.length === 0) return "Add at least one cottage.";
    if (rooms.length > 5) return "Maximum 5 cottage lines per booking.";
    if (!selection) return "Choose a cottage and dates first.";
    if (selection.checkOut <= selection.checkIn) return "Check-out must be after check-in.";
    if (!Number.isInteger(selection.adults) || selection.adults < 1) return "Adults must be at least 1.";
    if (!Number.isInteger(selection.children) || selection.children < 0) return "Children cannot be negative.";
    let totalMaxAdults = 0;
    let totalMaxOccupancy = 0;
    for (const r of rooms) {
      if (!Number.isInteger(r.quantity) || r.quantity < 1) return `Quantity for ${r.roomName} must be a positive integer.`;
      if (r.quantity > 10) return `Maximum 10 per cottage line (${r.roomName}).`;
      const info = availabilityByRoom.get(r.roomTypeId);
      if (info) {
        totalMaxAdults += (info.maxAdults || 2) * r.quantity;
        totalMaxOccupancy += (info.maxOccupancy || 2) * r.quantity;
        const typeTotal = rooms.filter((x) => x.roomTypeId === r.roomTypeId).reduce((s, x) => s + x.quantity, 0);
        if (typeTotal > info.availableCount) {
          if (info.availableCount <= 0) {
            return `${info.name} is fully booked for these dates.`;
          }
          return `Only ${info.availableCount} ${info.name} available for these dates (you selected ${typeTotal}).`;
        }
      }
    }
    if (totalMaxAdults > 0 && selection.adults > totalMaxAdults) {
      return `Selected cottages accommodate up to ${totalMaxAdults} adults. Please add another cottage or reduce adults.`;
    }
    if (totalMaxOccupancy > 0 && selection.adults + selection.children > totalMaxOccupancy) {
      return `Selected cottages sleep up to ${totalMaxOccupancy} guests total. Please add another cottage or reduce guests.`;
    }
    return null;
  }

  const roomsError = roomsValid();
  let isDatesAvailable = !roomsError && !quoteQuery.isError && !dateError;
  if (isDatesAvailable) {
    for (const r of rooms) {
      const info = availabilityByRoom.get(r.roomTypeId);
      if (info && info.availableCount < r.quantity) {
        isDatesAvailable = false;
        break;
      }
    }
  }

  const ack = siteSettings?.bookingAcknowledgement;

  const bookingPage = siteSettings?.bookingPage;
  const reservationConfig = bookingPage?.reservationDetails;
  const showReservationDetails = reservationConfig?.isEnabled !== false;
  const reservationTitle =
    reservationConfig?.title?.trim() || "Reservation details";
  const specialRequestsLabel =
    reservationConfig?.specialRequestsLabel?.trim() || "Special Requests";
  const specialRequestsPlaceholder =
    reservationConfig?.specialRequestsPlaceholder?.trim() || "Special Requests";
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

  const bookFaster = ack?.bookFaster;
  const bookFasterEnabled = bookFaster?.isEnabled !== false;
  const bookFasterTitle = bookFaster?.title?.trim() || "Book Faster (Optional)";
  const bookFasterCheckboxText =
    bookFaster?.checkboxText?.trim() || "I would like to create an account.";
  const bookFasterPasswordHint =
    bookFaster?.passwordHint?.trim() ||
    "At least 8 characters long, case sensitive, can contain !$#%, no spaces, not the same as previous password or login";
  const bookFasterIsOpen = bookFasterOpen ?? bookFaster?.expandedByDefault === true;

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
    if (activeCheckoutSections.length === 0) return true;
    return allRequiredItems.every((it) => !!acceptedAckItems[it.id]);
  }, [activeCheckoutSections, allRequiredItems, acceptedAckItems]);

  function toggleAckItem(id: string, checked: boolean) {
    setAcceptedAckItems((prev) => {
      const next = { ...prev, [id]: checked };
      const allDone = allRequiredItems.every((it) => !!next[it.id]);
      setAcceptPrivacy(!!next["ack-privacy"] || allDone);
      setAcceptTerms(!!next["ack-terms"] || allDone);
      return next;
    });
  }

  const canContinue =
    !!quote &&
    !busy &&
    !roomsError &&
    !dateError &&
    isDatesAvailable &&
    contactValid() &&
    passwordValid() &&
    allRequiredAcksAccepted &&
    !emailBlocked;

  /** First missing item, shown as a hint under the disabled buttons. */
  function continueHint(): string | null {
    if (dateError) return dateError;
    if (!isDatesAvailable) return "Selected dates are not available. Please choose different dates.";
    if (roomsError) return roomsError;
    if (!quote) return "Loading price…";
    if (busy) return "Working…";
    if (!contactValid())
      return (
        ack?.incompleteContactHint || "Complete contact info above to continue."
      );
    if (emailBlocked)
      return "This email has an account — sign in or use a different email.";
    if (!passwordValid())
      return password.length < 8
        ? "Password must be at least 8 characters."
        : "Passwords do not match.";
    if (!allRequiredAcksAccepted)
      return (
        ack?.incompleteTermsHint ||
        "Accept the required terms and booking conditions to continue."
      );
    return null;
  }

  async function handleContinueToPayment() {
    if (!selection || !quote) return;
    const roomsProblem = roomsValid();
    if (roomsProblem) {
      toast.error(roomsProblem);
      return;
    }
    if (!contactValid()) {
      toast.error("Please complete contact info with a valid email and phone");
      return;
    }
    if (!passwordValid()) {
      toast.error(
        password.length < 8
          ? "Password must be at least 8 characters long"
          : "Passwords do not match",
      );
      return;
    }
    if (!allRequiredAcksAccepted) {
      toast.error(
        ack?.incompleteTermsHint ||
          "Please accept the required terms and booking conditions to continue",
      );
      return;
    }
    setHoldFailed(null);
    const contactPhone = mobile.trim();
    const contact = {
      ...(title ? { title } : {}),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: contactPhone,
      mobile: contactPhone,
      ...(postcode.trim() ? { postcode: postcode.trim() } : {}),
      ...(address1.trim() ? { address1: address1.trim() } : {}),
      ...(address2.trim() ? { address2: address2.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(county.trim() ? { county: county.trim() } : {}),
      ...(country.trim() ? { country: country.trim() } : {}),
    };
    const extrasNote =
      selectedExtraIds.size > 0
        ? `Selected Extras: ${availableExtras
            .filter((x) => selectedExtraIds.has(x.id))
            .map(
              (x) =>
                `${x.title}${x.pricingType === "PER_PERSON" ? ` (${selection.adults} adults)` : ""} (+£${calculateExtraAmount(x)})`,
            )
            .join(", ")}`
        : "";

    const combinedNotes = [specialRequests.trim(), extrasNote]
      .filter(Boolean)
      .join("\n");

    try {
      if (isAuthed) {
        const created = await createBooking.mutateAsync({
          input: {
            rooms: rooms.map((r) => ({ roomTypeId: r.roomTypeId, ratePlanId: r.ratePlanId, quantity: r.quantity })),
            checkIn: selection.checkIn,
            checkOut: selection.checkOut,
            guests: {
              adults: selection.adults,
              children: selection.children,
              ...(bringingDog ? { dogs: dogsCount, dogsCount } : {}),
            },
            contact,
            extras: Array.from(selectedExtraIds),
            ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
            ...(combinedNotes ? { notes: combinedNotes } : {}),
          },
          idempotencyKey: idempotencyKey.current,
        });
        const intent = await paymentIntent.mutateAsync(created.booking.id);
        setBookingId(created.booking.id);
        setClientSecret(intent.clientSecret);
        if (newsletterOptIn && email) {
          try {
            const { publicApiClient } = await import("@/lib/api-client");
            await publicApiClient.post("/public/newsletter/subscribe", {
              email: email.trim(),
              name: `${firstName.trim()} ${lastName.trim()}`.trim() || null,
              source: "checkout",
            });
          } catch {
            // Newsletter must never block booking.
          }
        }
      } else {
        const result = await guestBooking.mutateAsync({
          rooms: rooms.map((r) => ({ roomTypeId: r.roomTypeId, ratePlanId: r.ratePlanId, quantity: r.quantity })),
          checkIn: selection.checkIn,
          checkOut: selection.checkOut,
          guests: {
            adults: selection.adults,
            children: selection.children,
            ...(bringingDog ? { dogs: dogsCount, dogsCount } : {}),
          },
          contact,
          extras: Array.from(selectedExtraIds),
          ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
          ...(combinedNotes ? { notes: combinedNotes } : {}),
          createAccount: bookFasterEnabled && createAccount,
          ...(bookFasterEnabled && createAccount && password ? { password, confirmPassword } : {}),
          newsletter: newsletterOptIn,
          acceptPrivacy,
          acceptTerms,
        });
        // Sign-in only if guest explicitly chose to create an account
        if (bookFasterEnabled && createAccount && result.token) {
          setSession(
            {
              id: result.user.id,
              name: result.user.name,
              email: result.user.email,
              role: result.user.role === "admin" ? "admin" : "user",
              avatarUrl: null,
            },
            result.token,
          );
        }
        setBookingId(result.booking.id);
        const secret = result.payment?.clientSecret ?? (result.payment as any)?.client_secret;
        if (secret) {
          setClientSecret(secret);
          setHoldFailed(null);
        } else {
          setHoldFailed(
            result.paymentError || "Your cottage is held but payment setup failed. Retry below — your hold is safe.",
          );
        }
      }
    } catch (error) {
      const normalized = normalizeApiError(error);
      toast.error(normalized.message);
    }
  }

  async function handleRetryIntent() {
    if (!bookingId) return;
    try {
      const intent = await paymentIntent.mutateAsync(bookingId);
      const secret = intent.clientSecret ?? (intent as any)?.client_secret;
      if (secret) {
        setClientSecret(secret);
        setHoldFailed(null);
      } else {
        setHoldFailed("Unable to initialize payment. Please try again.");
      }
    } catch {
      // Toasts are shown by the mutation hook.
    }
  }

  const totalLabel = quote ? formatMoney(displayGrandTotalPence, quote.pricing.currency) : "";
  const signInTarget = `${location.pathname}${location.search}`;

  const roomSlug = params.get("roomSlug") || (location.state as { roomSlug?: string } | null)?.roomSlug;
  const stateFrom = (location.state as { from?: string } | null)?.from;
  const backTarget = stateFrom || (roomSlug ? `/cottages/${roomSlug}` : "/");
  const backLabel = selection?.roomName && selection.roomName !== "Selected room"
    ? `← Back to ${selection.roomName}`
    : roomSlug
      ? "← Back to cottage details"
      : "← Back to search";

  function handleBack(e: React.MouseEvent) {
    e.preventDefault();
    if (backTarget && backTarget !== "/") {
      navigate(backTarget);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {backLabel}
        </button>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight sm:text-4xl">Checkout</h1>
      </div>

      {!isAuthed && (
        <Card>
          <CardContent className="p-4">
            <Button asChild variant="outline" className="rounded-none px-8">
              <Link to="/login" state={{ from: signInTarget }}>
                Sign in
              </Link>
            </Button>
            <span className="ml-3 text-xs text-muted-foreground">Have an account? Signing in is optional — guest check out below.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Contact info</CardTitle>
              <span className="text-xs text-muted-foreground">* Required</span>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="co-title">Title</Label>
                <select
                  id="co-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Title</option>
                  {TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="hidden sm:block" />
              <div className="space-y-2">
                <Label htmlFor="co-first">First name *</Label>
                <Input id="co-first" required maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-last">Last name *</Label>
                <Input id="co-last" required maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-mobile">Mobile phone *</Label>
                <Input id="co-mobile" required maxLength={40} value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile phone" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-email">Email address *</Label>
                <Input
                  id="co-email"
                  type="email"
                  required
                  maxLength={160}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailExists(false); }}
                  onBlur={() => void handleEmailBlur()}
                  placeholder="Email Address"
                  className="sm:max-w-xs"
                />
                <p className="text-xs text-muted-foreground">This is the email we will send your confirmation to.</p>
                {checkingEmail && <p className="text-xs text-muted-foreground">Checking…</p>}
                {emailExists && !isAuthed && (
                  <p className="rounded-md border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-900" role="status">
                    An account with this email already exists. You can{" "}
                    <Link to="/login" state={{ from: signInTarget }} className="font-semibold underline text-amber-950">
                      Sign in
                    </Link>{" "}
                    or continue below to complete your booking as a guest.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-postcode">Post code</Label>
                <Input id="co-postcode" maxLength={20} value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Post Code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-country">Country</Label>
                <Input id="co-country" maxLength={80} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-addr1">Address 1</Label>
                <Input id="co-addr1" maxLength={200} value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Address 1" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-addr2">Address 2</Label>
                <Input id="co-addr2" maxLength={200} value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Address 2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-city">City / Town</Label>
                <Input id="co-city" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / Town" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-county">County / Region / State</Label>
                <Input id="co-county" maxLength={80} value={county} onChange={(e) => setCounty(e.target.value)} placeholder="County / Region / State" />
              </div>
            </CardContent>
          </Card>

          {bookFasterEnabled && (
          <Card>
            <button
              type="button"
              onClick={() => setBookFasterOpen(!bookFasterIsOpen)}
              aria-expanded={bookFasterIsOpen}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-medium">{bookFasterTitle}</span>
              <ChevronDown className={`size-4 transition-transform ${bookFasterIsOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {bookFasterIsOpen && (
              <CardContent className="space-y-4 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="size-4 shrink-0 accent-brand"
                  />
                  {bookFasterCheckboxText}
                </label>
                {createAccount && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="co-password">Password *</Label>
                      <Input
                        id="co-password"
                        type="password"
                        autoComplete="new-password"
                        maxLength={128}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="sm:max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        {bookFasterPasswordHint}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="co-confirm">Confirm Password *</Label>
                      <Input
                        id="co-confirm"
                        type="password"
                        autoComplete="new-password"
                        maxLength={128}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="sm:max-w-xs"
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            )}
          </Card>
          )}

          {cottageDogPolicy.allowsDogs && (
            <Card className="border-[#d8d9cb] bg-[#fffdf8]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-wide flex items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5 stroke-[#243c30] fill-none stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
                  >
                    <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
                  </svg>
                  Dogs &amp; Pets
                </CardTitle>
                <CardDescription>
                  {cottageDogPolicy.subtitle || `Up to ${cottageDogPolicy.maxDogs} dog${cottageDogPolicy.maxDogs === 1 ? "" : "s"} · added only if you bring a dog`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bringingDog}
                    onChange={(e) => setBringingDog(e.target.checked)}
                    className="mt-1 size-4 shrink-0 accent-[#243c30]"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-[#243c30]">
                      I am bringing a dog (+£{cottageDogPolicy.dogFee} per stay)
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dogs are warmly welcomed. Dog fee includes dog bed, towel and welcome treats.
                    </p>
                  </div>
                </label>
                {bringingDog && cottageDogPolicy.maxDogs > 1 && (
                  <div className="pt-2 pl-7 flex items-center gap-3">
                    <Label htmlFor="co-dogs-count" className="text-xs">Number of dogs:</Label>
                    <select
                      id="co-dogs-count"
                      value={dogsCount}
                      onChange={(e) => setDogsCount(Number(e.target.value))}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {Array.from({ length: cottageDogPolicy.maxDogs }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} dog{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {availableExtras.length > 0 && (
            <Card className="border-[#d8d9cb] bg-[#fffdf8] shadow-sm">
              <CardHeader className="pb-3 border-b border-[#d8d9cb]/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base tracking-wide flex items-center gap-2 text-[#243c30]">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5 stroke-[#243c30] fill-none stroke-[1.5] stroke-linecap-round stroke-linejoin-round shrink-0"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span
                      className="[&_p]:m-0"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeCheckoutHtml(
                          bjSettings?.extrasHeading || "Optional Extras & Activities",
                        ),
                      }}
                    />
                  </CardTitle>
                  {selectedExtraIds.size > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#243c30] text-[#fffdf8]">
                      {selectedExtraIds.size} selected (+£{totalExtrasPounds})
                    </span>
                  )}
                </div>
                <div
                  className="text-xs text-[#535b51] mt-1 [&_p]:m-0 [&_a]:underline"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeCheckoutHtml(
                      bjSettings?.extrasDescription ||
                        "A little more time outdoors, or something lovely around the table. Everything here is optional.",
                    ),
                  }}
                />
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableExtras.map((extra) => {
                    const isChecked = selectedExtraIds.has(extra.id);
                    const extraPrice = calculateExtraAmount(extra);
                    const imgSrc = getExtraImageUrl(extra);

                    return (
                      <label
                        key={extra.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                          isChecked
                            ? "border-[#243c30] bg-[#f4f6f0] ring-1 ring-[#243c30]"
                            : "border-[#d8d9cb] bg-white hover:border-[#243c30]/50 hover:bg-[#fafaf7]"
                        }`}
                      >
                        <SafeImage
                          src={imgSrc}
                          alt={extra.title}
                          className="h-16 w-16 shrink-0 rounded-md object-cover border border-[#d8d9cb]/50"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-[#243c30] truncate">
                            {extra.title}
                          </span>
                          {extra.description ? (
                            <span
                              className="mt-0.5 block text-[11px] leading-snug text-[#535b51] [&_p]:m-0 [&_a]:underline"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeCheckoutHtml(extra.description),
                              }}
                            />
                          ) : (
                            <span className="mt-0.5 block text-[11px] leading-snug text-[#535b51]">
                              {extra.pricingType === "PER_PERSON"
                                ? `£${extra.price} per adult`
                                : `£${extra.price} per stay`}
                            </span>
                          )}
                          <span className="mt-1 block font-['Instrument_Serif',Georgia,serif] text-lg font-medium text-[#243c30]">
                            + £{extraPrice}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleExtra(extra.id)}
                          className="ml-auto h-4 w-4 shrink-0 rounded border-[#243c30] accent-[#243c30] cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>

                <div
                  className="pt-2 text-[10px] leading-relaxed text-[#757c72] border-t border-[#d8d9cb]/50 [&_p]:m-0 [&_a]:underline"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeCheckoutHtml(
                      bjSettings?.extrasDisclaimer ||
                        "These prices demonstrate the booking flow. Final prices, times, availability and package inclusions must be confirmed before your arrival.",
                    ),
                  }}
                />
              </CardContent>
            </Card>
          )}

          {showReservationDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base tracking-wide">{reservationTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="co-requests">{specialRequestsLabel}</Label>
              <textarea
                id="co-requests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
                maxLength={specialRequestsMaxLength}
                placeholder={specialRequestsPlaceholder}
                className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>
          )}

          {bookingId && (clientSecret || holdFailed) && (
            <Card id="checkout-payment" className="scroll-mt-24 border-brand/50">
              <CardHeader>
                <CardTitle className="text-base tracking-wide">Payment</CardTitle>
                <CardDescription>
                  Your room is held{quote ? ` — pay ${totalLabel} securely to confirm.` : "."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!stripePromise ? (
                  <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-4">
                    <p role="alert" className="text-sm text-destructive">
                      Payments are not configured (missing publishable key). Please try again later.
                    </p>
                  </div>
                ) : clientSecret ? (
                  <PaymentErrorBoundary onRetry={() => void handleRetryIntent()}>
                    <Elements
                      key={clientSecret}
                      stripe={stripePromise}
                      options={{ clientSecret, appearance: { theme: "stripe" } }}
                    >
                      <PayButton bookingId={bookingId} totalLabel={totalLabel} />
                    </Elements>
                  </PaymentErrorBoundary>
                ) : !holdFailed ? (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                    <Loader className="size-4 animate-spin text-brand" />
                    <span>Preparing payment gateway…</span>
                  </div>
                ) : null}
                {holdFailed && (
                  <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                    <p role="alert" className="text-sm">{holdFailed}</p>
                    <Button type="button" variant="outline" className="rounded-full" disabled={paymentIntent.isPending} onClick={() => void handleRetryIntent()}>
                      {paymentIntent.isPending ? "Retrying…" : "Retry payment setup"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showPolicies && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base tracking-wide">{policiesTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 rounded-md bg-muted/50 p-4 text-sm">
                <div className="flex gap-8">
                  <p><span className="font-semibold">{checkInLabel}</span><br />{policiesCheckInText}</p>
                  <p><span className="font-semibold">{checkOutLabel}</span><br />{policiesCheckOutText}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Checkout Sections (e.g. Acknowledgement, House Rules, Custom Agreements) */}
          {activeCheckoutSections.map((sec) => (
            <Card key={sec.id}>
              <CardHeader>
                <CardTitle className="text-base tracking-wide">
                  {sec.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {sec.introText && (
                  <div
                    className="pb-1 text-xs text-muted-foreground [&_a]:font-medium [&_a]:underline [&_a]:hover:text-brand [&_p]:m-0"
                    onClick={(e) => e.stopPropagation()}
                    dangerouslySetInnerHTML={{ __html: sanitizeCheckoutHtml(sec.introText) }}
                  />
                )}
                {(sec.items ?? [])
                  .filter((item) => item.isEnabled !== false)
                  .map((item) => (
                    <label key={item.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!acceptedAckItems[item.id]}
                        onChange={(e) => toggleAckItem(item.id, e.target.checked)}
                        className="mt-1 size-4 shrink-0 accent-brand cursor-pointer"
                      />
                      <span className="text-sm select-none">
                        <span
                          className="[&_a]:font-medium [&_a]:underline [&_a]:hover:text-brand [&_p]:m-0 [&_p]:inline"
                          dangerouslySetInnerHTML={{ __html: sanitizeCheckoutHtml(item.text) }}
                        />{" "}
                        {!/<a\s/i.test(item.text) && item.linkUrl && item.linkLabel && (
                          <Link
                            to={item.linkUrl}
                            target={item.openInNewTab !== false ? "_blank" : undefined}
                            rel={item.openInNewTab !== false ? "noopener noreferrer" : undefined}
                            className="font-medium underline hover:text-brand"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.linkLabel}
                          </Link>
                        )}
                      </span>
                    </label>
                  ))}
              </CardContent>
            </Card>
          ))}

          {/* Checkout Action CTA Button */}
          {!bookingId && (
            <div className="pt-2 space-y-2">
              <Button
                type="button"
                className="h-12 w-full rounded-full text-base disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canContinue}
                onClick={() => void handleContinueToPayment()}
              >
                {busy ? (ack?.busyButtonText || "Holding your cottage…") : (ack?.buttonText || "Confirm booking")}
              </Button>
              {!canContinue && continueHint() && (
                <p className="text-center text-xs text-muted-foreground">
                  {continueHint()}
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <Card className="shadow-card lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Price details</CardTitle>
              <CardDescription>
                {nights} night{nights === 1 ? "" : "s"} · {rooms.reduce((s, r) => s + r.quantity, 0)} cottage{rooms.reduce((s, r) => s + r.quantity, 0) === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Stay dates - locked summary during checkout to prevent accidental date change errors */}
              {selection && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-brand" />
                      Stay Dates
                    </span>
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      ← Change dates
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-border/60 bg-background/80 p-2">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Check-in</span>
                      <span className="font-medium text-foreground">{prettyDate(selection.checkIn)}</span>
                    </div>
                    <div className="rounded border border-border/60 bg-background/80 p-2">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Check-out</span>
                      <span className="font-medium text-foreground">{prettyDate(selection.checkOut)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span>{nights} night{nights === 1 ? "" : "s"} stay confirmed</span>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {rooms.map((r) => {
                  const info = availabilityByRoom.get(r.roomTypeId);
                  const cap = Math.min(10, info?.availableCount ?? 10);
                  const isSoldOut = cap <= 0;
                  return (
                    <div key={r.key} className="rounded-lg border border-border bg-card p-3 text-sm space-y-2.5">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate text-foreground">{r.roomName}</p>
                          <p className="text-xs text-muted-foreground">{r.rateName}</p>
                        </div>
                        {rooms.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => removeRoom(r.key)}
                            aria-label={`Remove ${r.roomName}`}
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      {isSoldOut ? (
                        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive font-medium flex items-center justify-between">
                          <span>Sold out for these dates</span>
                          <span className="text-[11px] opacity-80">0 available</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                          <div>
                            <span className="text-xs font-medium text-foreground">Cottages to book</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {cap} {cap === 1 ? "cottage" : "cottages"} available for your dates
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5" role="group" aria-label={`Quantity for ${r.roomName}`}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-full p-0"
                              disabled={r.quantity <= 1}
                              onClick={() => setRoomQuantity(r.key, r.quantity - 1)}
                              aria-label={`Decrease quantity for ${r.roomName}`}
                            >
                              −
                            </Button>
                            <span className="w-8 text-center text-xs font-semibold tabular-nums text-foreground">
                              {r.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-full p-0"
                              disabled={r.quantity >= cap}
                              onClick={() => setRoomQuantity(r.key, r.quantity + 1)}
                              aria-label={`Increase quantity for ${r.roomName}`}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {roomError && (
                <p role="alert" className="text-xs text-destructive">
                  {roomError}
                </p>
              )}
              {roomsError && (
                <p role="alert" className="text-xs text-destructive">
                  {roomsError}
                </p>
              )}
              <div className="rounded-md border border-border p-4 text-sm">
                {quoteQuery.isPending ? (
                  <div className="space-y-2" aria-busy="true" aria-label="Loading price">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                ) : quoteQuery.isError || !quote ? (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">Could not price this selection.</p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => void quoteQuery.refetch()}>Retry pricing</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({nights} nights)</span>
                      <span className="font-semibold">{formatMoney(quote.pricing.subtotal, quote.pricing.currency)}</span>
                    </div>
                    {quote.pricing.discount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Coupon {appliedCoupon}</span>
                        <span>−{formatMoney(quote.pricing.discount, quote.pricing.currency)}</span>
                      </div>
                    )}
                    {Boolean(quote.pricing.dogFee && quote.pricing.dogFee > 0) && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Dog fee ({dogsCount} dog{dogsCount > 1 ? "s" : ""})</span>
                        <span>{formatMoney(quote.pricing.dogFee, quote.pricing.currency)}</span>
                      </div>
                    )}
                    {(quote.pricing.tax ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxes and fees</span>
                        <span>{formatMoney(quote.pricing.tax ?? 0, quote.pricing.currency)}</span>
                      </div>
                    )}
                    {selectedExtraList.length > 0 && (
                      <div className="space-y-1.5 border-t border-border/60 pt-2 pb-1">
                        <div className="flex items-center justify-between font-semibold text-[#243c30]">
                          <span>Optional Extras ({selectedExtraList.length})</span>
                          <span>+£{totalExtrasPounds}</span>
                        </div>
                        {selectedExtraList.map((extra) => (
                          <div key={extra.id} className="flex justify-between text-xs text-muted-foreground pl-1">
                            <span className="truncate pr-2">
                              • {extra.title}
                              {extra.pricingType === "PER_PERSON" ? ` (${selection.adults} adults)` : ""}
                            </span>
                            <span className="font-medium text-[#243c30]">
                              +£{calculateExtraAmount(extra)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {prettyDate(selection.checkIn)} - {prettyDate(selection.checkOut)}<br />
                      {selection.adults + selection.children} Adult{selection.adults + selection.children === 1 ? "" : "s"}
                    </p>
                    {quote.nightly && quote.nightly.length > 0 && (
                      <details className="pt-1 text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Nightly breakdown</summary>
                        <ul className="mt-1 divide-y divide-border">
                          {quote.nightly.map((n) => (
                            <li key={n.date} className="flex justify-between py-0.5">
                              <span className="text-muted-foreground">{n.date}</span>
                              <span>{formatMoney(n.price, quote.pricing.currency)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
              {quote && (
                <div
                  className={`rounded-xl border p-3.5 transition-colors ${
                    !isDatesAvailable
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/80 bg-muted/30"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Total</p>
                      <span className="text-xs text-muted-foreground">
                        {!isDatesAvailable
                          ? "Dates unavailable for selected cottage"
                          : "Including taxes and fees"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-display text-2xl font-medium ${
                          !isDatesAvailable
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {formatMoney(displayGrandTotalPence, quote.pricing.currency)}
                      </p>
                      {!isDatesAvailable && (
                        <span className="text-[11px] font-semibold text-destructive block">
                          Dates not available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={validateCoupon.isPending || !couponInput.trim()}
                  onClick={applyCoupon}
                >
                  Apply
                </Button>
              </div>
              {autoCoupon && appliedCoupon === autoCoupon && (
                <p className="text-xs text-success">{autoCoupon} auto-applied from this cottage&apos;s offer.</p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-dashed hover:border-brand hover:text-brand transition-colors"
                onClick={() => setShowAddRoom((v) => !v)}
                aria-expanded={showAddRoom}
              >
                {showAddRoom ? "Close cottage selector" : "+ Add another cottage to your stay"}
              </Button>
              {showAddRoom && (
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-2.5 shadow-sm">
                  <div className="flex items-center justify-between px-2 pt-1 pb-1 border-b border-border/50">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Available cottages for your dates:
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {(availabilityQuery.data?.results ?? []).filter((r) => r.availableCount > 0).length} available
                    </span>
                  </div>
                  {availabilityQuery.isPending ? (
                    <p className="p-3 text-xs text-muted-foreground animate-pulse">Checking live availability…</p>
                  ) : (availabilityQuery.data?.results ?? []).length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">No other cottages available for these dates.</p>
                  ) : (
                    (availabilityQuery.data?.results ?? []).flatMap((item) =>
                      item.rates.map((rate) => {
                        const key = roomKey(item.roomType.id, rate.ratePlanId);
                        const added = rooms.some((r) => r.key === key);
                        const typeTotal = rooms
                          .filter((r) => r.roomTypeId === item.roomType.id)
                          .reduce((s, r) => s + r.quantity, 0);
                        const full = typeTotal >= Math.min(10, item.availableCount);
                        const isSoldOut = item.availableCount <= 0;
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between gap-2 rounded-lg p-2.5 text-xs transition-colors ${
                              full || isSoldOut ? "bg-muted/30 opacity-70" : "bg-muted/40 hover:bg-muted/70"
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="block truncate font-medium text-foreground">{item.roomType.name}</span>
                              <span className="block truncate text-muted-foreground">
                                {rate.name} · {item.availableCount > 0 ? `${item.availableCount} ${item.availableCount === 1 ? "cottage" : "cottages"} left` : "Sold out"}
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={full || isSoldOut ? "outline" : "default"}
                              className="shrink-0 rounded-full h-7 px-3 text-xs font-medium"
                              disabled={full || isSoldOut || rooms.length >= 5}
                              onClick={() => addRoom(item.roomType.id, rate.ratePlanId, item.roomType.name, rate.name)}
                            >
                              {isSoldOut || full ? "Sold out" : added ? "+1 more" : "Add"}
                            </Button>
                          </div>
                        );
                      }),
                    )
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Availability and price are confirmed again at booking.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default BookingPage;
