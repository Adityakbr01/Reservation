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
import { fetchCottageOffers } from "@/modules/cottages/api/cottages.api";
import { fetchSiteSettings } from "@/modules/cms/api/cms.api";
import { useAvailabilitySearch } from "@/modules/availability";
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
  const [bookFasterOpen, setBookFasterOpen] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Acknowledgements.
  const newsletterOptIn = false;
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const idempotencyKey = useRef(newIdempotencyKey());
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [holdFailed, setHoldFailed] = useState<string | null>(null);
  const [stripePromise] = useState(getStripePromise);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

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
          ].join("~")
        : "no-quote",
    [selection, rooms, appliedCoupon],
  );
  const quoteQuery = useQuery({
    queryKey: [quoteKey],
    queryFn: async () => {
      if (!selection) throw new Error("Missing selection");
      if (rooms.length === 0) throw new Error("Add at least one cottage");
      const parts = await Promise.all(
        rooms.map((r) =>
          fetchQuote({
            roomTypeId: r.roomTypeId,
            ratePlanId: r.ratePlanId,
            checkIn: selection.checkIn,
            checkOut: selection.checkOut,
            quantity: r.quantity,
            ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
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
    if (!createAccount) return true;
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

  const canContinue =
    !!quote &&
    !busy &&
    !roomsError &&
    !dateError &&
    isDatesAvailable &&
    contactValid() &&
    passwordValid() &&
    acceptPrivacy &&
    acceptTerms &&
    !emailBlocked;

  /** First missing item, shown as a hint under the disabled buttons. */
  function continueHint(): string | null {
    if (dateError) return dateError;
    if (!isDatesAvailable) return "Selected dates are not available. Please choose different dates.";
    if (roomsError) return roomsError;
    if (!quote) return "Loading price…";
    if (busy) return "Working…";
    if (!contactValid()) return "Complete contact info above to continue.";
    if (emailBlocked) return "This email has an account — sign in or use a different email.";
    if (!passwordValid())
      return password.length < 8 ? "Password must be at least 8 characters." : "Passwords do not match.";
    if (!acceptPrivacy || !acceptTerms) return "Accept the Privacy Terms and Booking Conditions to continue.";
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
    if (!acceptPrivacy || !acceptTerms) {
      toast.error("Please accept the Privacy Terms and Booking Conditions to continue");
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
    try {
      if (isAuthed) {
        const created = await createBooking.mutateAsync({
          input: {
            rooms: rooms.map((r) => ({ roomTypeId: r.roomTypeId, ratePlanId: r.ratePlanId, quantity: r.quantity })),
            checkIn: selection.checkIn,
            checkOut: selection.checkOut,
            guests: { adults: selection.adults, children: selection.children },
            contact,
            ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
            ...(specialRequests.trim() ? { notes: specialRequests.trim() } : {}),
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
          guests: { adults: selection.adults, children: selection.children },
          contact,
          ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
          ...(specialRequests.trim() ? { notes: specialRequests.trim() } : {}),
          createAccount,
          ...(createAccount && password ? { password, confirmPassword } : {}),
          newsletter: newsletterOptIn,
          acceptPrivacy,
          acceptTerms,
        });
        // Sign-in only if guest explicitly chose to create an account
        if (createAccount && result.token) {
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

  const totalLabel = quote ? formatMoney(quote.pricing.total, quote.pricing.currency) : "";
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

          <Card>
            <button
              type="button"
              onClick={() => setBookFasterOpen((o) => !o)}
              aria-expanded={bookFasterOpen}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-medium">Book Faster (Optional)</span>
              <ChevronDown className={`size-4 transition-transform ${bookFasterOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {bookFasterOpen && (
              <CardContent className="space-y-4 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="size-4 shrink-0 accent-brand"
                  />
                  I would like to create an account.
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
                        At least 8 characters long, case sensitive, can contain !$#%, no spaces, not the same as previous password or login
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Reservation details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="co-requests">Special Requests</Label>
              <textarea
                id="co-requests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Special Requests"
                className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 rounded-md bg-muted/50 p-4 text-sm">
              <div className="flex gap-8">
                <p><span className="font-semibold">Check-in</span><br />after {formatTimeLabel(siteSettings?.checkInTime, "4:00 pm")}</p>
                <p><span className="font-semibold">Check-out</span><br />before {formatTimeLabel(siteSettings?.checkOutTime, "11:00 am")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Acknowledgement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-1 size-4 shrink-0 accent-brand" />
                <span>* I agree with the Privacy Terms. <Link to="/policies/PRIVACY" target="_blank" className="underline">Privacy Notice</Link></span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 size-4 shrink-0 accent-brand" />
                I agree with the Booking Conditions.
              </label>
              {!bookingId && (
                <>
                  <Button
                    type="button"
                    className="h-12 w-full rounded-full text-base disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canContinue}
                    onClick={() => void handleContinueToPayment()}
                  >
                    {busy ? "Holding your cottage…" : "Confirm booking"}
                  </Button>
                  {!canContinue && continueHint() && (
                    <p className="text-center text-xs text-muted-foreground">{continueHint()}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
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
                    {(quote.pricing.tax ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxes and fees</span>
                        <span>{formatMoney(quote.pricing.tax ?? 0, quote.pricing.currency)}</span>
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
                        {formatMoney(quote.pricing.total, quote.pricing.currency)}
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
