import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ChevronDown } from "lucide-react";
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
} from "../api/booking.api";
import {
  useCreateBooking,
  usePaymentIntent,
  useQuote,
  useValidateCoupon,
} from "../hooks/use-booking";
import type { BookingSelection } from "../types/booking.types";

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Other"];

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
        className="btn-shine h-12 w-full rounded-full text-base"
        disabled={paying}
        onClick={() => void handlePay()}
      >
        {paying ? "Processing…" : `Confirm booking — pay ${totalLabel}`}
      </Button>
    </div>
  );
}

export function BookingPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const selection = useMemo(() => parseSelection(params), [params]);
  const sessionUser = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const isAuthed = !!sessionUser;

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);

  // Contact info (guest-visible account creation happens silently in the background).
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
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
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const idempotencyKey = useRef(newIdempotencyKey());
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [holdFailed, setHoldFailed] = useState<string | null>(null);
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
  const guestBooking = useMutation({
    mutationFn: (vars: Parameters<typeof createGuestBooking>[0]) =>
      createGuestBooking(vars, idempotencyKey.current),
  });
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
      phone.trim().length >= 4
    );
  }

  function passwordValid(): boolean {
    if (!createAccount) return true;
    return password.length >= 8 && password === confirmPassword;
  }

  async function handleContinueToPayment() {
    if (!selection || !quote) return;
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
    const contact = {
      ...(title ? { title } : {}),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
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
            rooms: [{ roomTypeId: selection.roomTypeId, ratePlanId: selection.ratePlanId, quantity: 1 }],
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
          rooms: [{ roomTypeId: selection.roomTypeId, ratePlanId: selection.ratePlanId, quantity: 1 }],
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
        // Silent sign-in: the guest never sees a login screen.
        if (result.token) {
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
        if (result.payment) {
          setClientSecret(result.payment.clientSecret);
        } else {
          setHoldFailed(
            result.paymentError === "PAYMENT_INTENT_FAILED"
              ? "Your room is held but payment setup failed. Retry below — your hold is safe."
              : "Your room is held but payment setup failed. Retry below — your hold is safe.",
          );
        }
      }
      document.getElementById("checkout-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (normalized.code === "EMAIL_HAS_ACCOUNT") {
        setEmailExists(true);
        toast.error("This email already has an account — sign in to continue");
        return;
      }
      toast.error(normalized.message);
    }
  }

  async function handleRetryIntent() {
    if (!bookingId) return;
    try {
      const intent = await paymentIntent.mutateAsync(bookingId);
      setClientSecret(intent.clientSecret);
      setHoldFailed(null);
    } catch {
      // Toasts are shown by the mutation hook.
    }
  }

  const totalLabel = quote ? formatMoney(quote.pricing.total, quote.pricing.currency) : "";
  const signInTarget = `${location.pathname}${location.search}`;
  const addRoomTarget = `/?checkIn=${encodeURIComponent(selection.checkIn)}&checkOut=${encodeURIComponent(selection.checkOut)}&adults=${selection.adults}&children=${selection.children}&rooms=1`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <div>
        <Link
          to="/"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to search
        </Link>
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
            <span className="ml-3 text-xs text-muted-foreground">Have an account? Signing in is optional — guests check out below.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
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
              <div className="space-y-2">
                <Label htmlFor="co-phone">Phone *</Label>
                <Input id="co-phone" required maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-mobile">Mobile phone</Label>
                <Input id="co-mobile" maxLength={40} value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile phone" />
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
                  <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm" role="alert">
                    This email already has an account.{" "}
                    <Link to="/login" state={{ from: signInTarget }} className="font-medium underline">
                      Sign in
                    </Link>{" "}
                    to continue — or use a different email for a guest booking.
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
                    className="size-4"
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

          <Card id="checkout-payment" className="scroll-mt-24">
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Payment</CardTitle>
              <CardDescription>We use secure transmission and encrypted storage to protect your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote && (
                <p className="text-sm font-semibold">{totalLabel} deposit due now.</p>
              )}
              <div className="flex flex-wrap gap-1.5" aria-label="Accepted cards">
                {["VISA", "MC", "AMEX", "DISC", "JCB", "UNION"].map((brand) => (
                  <span key={brand} className="rounded border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground">
                    {brand}
                  </span>
                ))}
              </div>
              {!stripePromise ? (
                <p role="alert" className="text-sm text-destructive">
                  Payments are not configured (missing publishable key). Please try again later.
                </p>
              ) : !clientSecret || !bookingId ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Complete contact info above, then continue — your room is held before any payment is taken.
                  </p>
                  <Button
                    type="button"
                    className="btn-shine h-11 w-full rounded-full"
                    disabled={busy || !quote}
                    onClick={() => void handleContinueToPayment()}
                  >
                    {busy ? "Holding your room…" : "Continue to payment"}
                  </Button>
                </div>
              ) : (
                <Elements
                  key={clientSecret}
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: { theme: "stripe" } }}
                >
                  <PayButton bookingId={bookingId} totalLabel={totalLabel} />
                </Elements>
              )}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 rounded-md bg-muted/50 p-4 text-sm">
              <div className="flex gap-8">
                <p><span className="font-semibold">Check-in</span><br />after 4:00 pm</p>
                <p><span className="font-semibold">Check-out</span><br />before 11:00 am</p>
              </div>
              <p className="font-semibold uppercase">Room | {selection.roomName}</p>
              <p className="text-muted-foreground">
                {selection.rateName}. {totalLabel && `${totalLabel} due at booking (hotel local time).`} Cancellations and amendments are per the rate conditions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Acknowledgement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={newsletterOptIn} onChange={(e) => setNewsletterOptIn(e.target.checked)} className="mt-1 size-4" />
                Yes, I would like to receive newsletters and special offers by email.
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-1 size-4" />
                <span>* I agree with the Privacy Terms. <Link to="/policies/PRIVACY" target="_blank" className="underline">Privacy Notice</Link></span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 size-4" />
                I agree with the Booking Conditions.
              </label>
              {!bookingId && (
                <Button
                  type="button"
                  className="h-12 w-full rounded-full text-base"
                  disabled={busy || !quote}
                  onClick={() => void handleContinueToPayment()}
                >
                  {busy ? "Holding your room…" : "Confirm booking"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0">
          <Card className="shadow-card lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base tracking-wide">Price details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-border p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{selection.roomName}<br /><span className="font-normal text-muted-foreground">{selection.rateName}</span><br /><span className="text-muted-foreground underline">{nights} Nights stay</span></p>
                  {quote && <p className="font-semibold">{formatMoney(quote.pricing.subtotal, quote.pricing.currency)}</p>}
                </div>
                {quoteQuery.isPending ? (
                  <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading price">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                ) : quoteQuery.isError || !quote ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-destructive">Could not price this selection.</p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => void quoteQuery.refetch()}>Retry pricing</Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-1">
                    {quote.pricing.discount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Coupon {appliedCoupon}</span>
                        <span>−{formatMoney(quote.pricing.discount, quote.pricing.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxes and fees</span>
                      <span>{formatMoney(quote.pricing.tax ?? 0, quote.pricing.currency)}</span>
                    </div>
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
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">Total<br /><span className="text-xs font-normal text-muted-foreground">Including taxes and fees</span></p>
                  <p className="font-display text-xl">{formatMoney(quote.pricing.total, quote.pricing.currency)}</p>
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
              <Button asChild variant="outline" className="w-full rounded-none">
                <Link to={addRoomTarget}>Add a room</Link>
              </Button>
              <p className="text-[11px] text-muted-foreground">Availability and price are confirmed again at booking.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default BookingPage;
