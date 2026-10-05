import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { getStripePromise } from "@/lib/stripe";
import { useAuthStore } from "@/stores/auth-store";
import {
  useCreateBooking,
  usePaymentIntent,
  useQuote,
  useValidateCoupon,
} from "../hooks/use-booking";
import type { BookingSelection, GuestDetails } from "../types/booking.types";

const STEPS = ["Review", "Details", "Payment"] as const;

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
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

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Booking progress">
      {STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            aria-current={index === step ? "step" : undefined}
            className={
              index === step
                ? "flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                : index < step
                  ? "flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                  : "flex size-7 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted-foreground"
            }
          >
            {index + 1}
          </span>
          <span
            className={
              index === step
                ? "text-sm font-medium"
                : "hidden text-sm text-muted-foreground sm:inline"
            }
          >
            {label}
          </span>
          {index < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function CheckoutForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  if (!stripe || !elements) return null;

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
      <PaymentElement />
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {failed}
        </p>
      )}
      <Button
        type="button"
        className="btn-shine h-11 w-full rounded-full"
        disabled={paying}
        onClick={() => void handlePay()}
      >
        {paying ? "Processing…" : "Pay now"}
      </Button>
    </div>
  );
}

export function BookingPage() {
  const [params] = useSearchParams();
  const selection = useMemo(() => parseSelection(params), [params]);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);
  const userEmail = useAuthStore((s) => s.user?.email ?? "");
  const [guest, setGuest] = useState<GuestDetails>({
    firstName: "",
    lastName: "",
    email: userEmail,
    phone: "",
  });
  const idempotencyKey = useRef(newIdempotencyKey());
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise] = useState(getStripePromise);

  const quoteInput = useMemo(
    () =>
      selection
        ? {
            roomTypeId: selection.roomTypeId,
            ratePlanId: selection.ratePlanId,
            checkIn: selection.checkIn,
            checkOut: selection.checkOut,
            quantity: 1,
            ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
          }
        : null,
    [selection, appliedCoupon],
  );
  const validateCoupon = useValidateCoupon();
  const createBooking = useCreateBooking();
  const paymentIntent = usePaymentIntent();
  const quoteQuery = useQuote(quoteInput);

  const missingSelection = !selection;
  useEffect(() => {
    if (missingSelection) {
      toast.error("Choose a room and dates first");
    }
  }, [missingSelection]);

  if (!selection) {
    return <Navigate to="/" replace />;
  }

  const quote = quoteQuery.data ?? null;
  const busy = createBooking.isPending || paymentIntent.isPending;

  function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    validateCoupon.mutate(code, {
      onSuccess: (data) => {
        if (data.valid) setAppliedCoupon(code);
      },
    });
  }

  async function submitGuestDetails() {
    if (!selection) return;
    if (
      !guest.firstName.trim() ||
      !guest.lastName.trim() ||
      !/.+@.+\..+/.test(guest.email) ||
      guest.phone.trim().length < 4
    ) {
      toast.error("Please complete guest details with a valid email and phone");
      return;
    }
    try {
      const created = await createBooking.mutateAsync({
        input: {
          rooms: [
            {
              roomTypeId: selection.roomTypeId,
              ratePlanId: selection.ratePlanId,
              quantity: 1,
            },
          ],
          checkIn: selection.checkIn,
          checkOut: selection.checkOut,
          guests: { adults: selection.adults, children: selection.children },
          contact: {
            firstName: guest.firstName.trim(),
            lastName: guest.lastName.trim(),
            email: guest.email.trim(),
            phone: guest.phone.trim(),
          },
          ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
        },
        idempotencyKey: idempotencyKey.current,
      });
      const intent = await paymentIntent.mutateAsync(created.booking.id);
      setBookingId(created.booking.id);
      setClientSecret(intent.clientSecret);
      setStep(2);
      if (newsletterOptIn && guest.email) {
        try {
          const { publicApiClient } = await import("@/lib/api-client");
          await publicApiClient.post("/public/newsletter/subscribe", {
            email: guest.email.trim(),
            name: `${guest.firstName.trim()} ${guest.lastName.trim()}`.trim() || null,
            source: "checkout",
          });
        } catch {
          // Newsletter must never block booking.
        }
      }
    } catch {
      // Toasts are shown by the mutation hooks; stay on this step to retry.
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-8">
      <div>
        <Link
          to="/"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to search
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">Complete booking</h1>
      </div>

      <Stepper step={step} />

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Review selection</CardTitle>
            <CardDescription>
              {selection.roomName} · {selection.rateName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selection.checkIn} → {selection.checkOut} · {selection.adults + selection.children}{" "}
              guest{selection.adults + selection.children === 1 ? "" : "s"}
            </p>
            {quoteQuery.isPending ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading price">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ) : quoteQuery.isError || !quote ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  Could not price this selection. It may no longer be available.
                </p>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void quoteQuery.refetch()}
                >
                  Retry pricing
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal (base rent)</dt>
                    <dd>{formatMoney(quote.pricing.subtotal, quote.pricing.currency)}</dd>
                  </div>
                  {quote.pricing.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <dt>Coupon {appliedCoupon}</dt>
                      <dd>−{formatMoney(quote.pricing.discount, quote.pricing.currency)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Taxes and fees</dt>
                    <dd>{formatMoney(quote.pricing.tax ?? 0, quote.pricing.currency)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                    <dt>Total</dt>
                    <dd>{formatMoney(quote.pricing.total, quote.pricing.currency)}</dd>
                  </div>
                  <p className="text-xs text-muted-foreground">Including taxes and fees</p>
                </dl>
                {quote.nightly && quote.nightly.length > 0 && (
                  <details className="rounded-xl border border-border p-3 text-sm">
                    <summary className="cursor-pointer font-medium">Price details — {quote.nightly.length} nights</summary>
                    <ul className="mt-2 divide-y divide-border">
                      {quote.nightly.map((n) => (
                        <li key={n.date} className="flex justify-between py-1 text-sm">
                          <span className="text-muted-foreground">{n.date}</span>
                          <span>{formatMoney(n.price, quote.pricing.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Coupon code (optional)"
                aria-label="Coupon code"
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={validateCoupon.isPending || !couponInput.trim()}
                onClick={applyCoupon}
              >
                Apply
              </Button>
            </div>
            <Button
              type="button"
              className="h-11 w-full rounded-full"
              disabled={!quote || quoteQuery.isPending}
              onClick={() => setStep(1)}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Guest details</CardTitle>
            <CardDescription>Who is staying? Booking updates go here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guest-first">First name</Label>
                <Input
                  id="guest-first"
                  required
                  maxLength={80}
                  value={guest.firstName}
                  onChange={(e) => setGuest((g) => ({ ...g, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-last">Last name</Label>
                <Input
                  id="guest-last"
                  required
                  maxLength={80}
                  value={guest.lastName}
                  onChange={(e) => setGuest((g) => ({ ...g, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                required
                maxLength={160}
                value={guest.email}
                onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone</Label>
              <Input
                id="guest-phone"
                required
                maxLength={40}
                value={guest.phone}
                onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
                className="mt-1"
              />
              Yes, I would like to receive newsletters and special offers by email.
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setStep(0)}
              >
                Back
              </Button>
              <Button
                type="button"
                className="btn-shine h-11 flex-1 rounded-full"
                disabled={busy}
                onClick={() => void submitGuestDetails()}
              >
                {busy ? "Holding your room…" : "Confirm booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Payment</CardTitle>
            <CardDescription>
              {quote
                ? `Pay ${formatMoney(quote.pricing.total, quote.pricing.currency)} securely.`
                : "Secure payment."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!stripePromise ? (
              <p role="alert" className="text-sm text-destructive">
                Payments are not configured (missing publishable key). Please try again later.
              </p>
            ) : !clientSecret || !bookingId ? (
              <p className="text-sm text-muted-foreground">
                Preparing secure payment… If this persists, go back and retry.
              </p>
            ) : (
              <Elements
                key={clientSecret}
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: "stripe" } }}
              >
                <CheckoutForm bookingId={bookingId} />
              </Elements>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BookingPage;
