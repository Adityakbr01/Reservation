import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BadgeCheck, Download, Loader, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDateTime as fmtDate, formatDateTimeWithTime as fmtDateTime } from "@/lib/date";
import { useBookingReceipt, useBookingStatus, useCancelBooking } from "../hooks/use-booking";
import { useSiteSettings } from "@/modules/cms/hooks/use-cms";
import type { BookingReceipt } from "../types/booking.types";

class ConfirmationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Booking confirmation render error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto w-full max-w-md space-y-4 py-12 text-center">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Receipt Display Error</CardTitle>
              <CardDescription>
                Your booking and payment are confirmed, but the receipt preview encountered an issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                className="w-full rounded-full"
                onClick={() => window.location.reload()}
              >
                Reload confirmation
              </Button>
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link to="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatDate(value: string): string {
  return fmtDate(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return fmtDateTime(value);
}

function providerLabel(provider: string): string {
  if (provider === "STRIPE") return "Online payment · Stripe";
  return provider || "Online payment";
}

export function BookingConfirmationPage() {
  return (
    <ConfirmationErrorBoundary>
      <BookingConfirmationContent />
    </ConfirmationErrorBoundary>
  );
}

function BookingConfirmationContent() {
  const { id = "" } = useParams();
  const { data: booking, isPending, isError, refetch } = useBookingStatus(id === "" ? null : id);

  useEffect(() => {
    const previous = document.title;
    if (booking?.bookingNumber) document.title = `Receipt ${booking.bookingNumber}`;
    return () => {
      document.title = previous;
    };
  }, [booking?.bookingNumber]);

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 pb-8 text-center" aria-busy="true">
        <Loader className="mx-auto size-8 animate-spin text-brand" aria-hidden />
        <p className="font-medium">Confirming your payment</p>
        <p className="text-sm text-muted-foreground">
          Do not close this page — we are verifying with the bank.
        </p>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto w-full max-w-sm pb-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Booking not found</CardTitle>
            <CardDescription>We could not load this booking.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button asChild variant="outline" className="flex-1 rounded-full">
              <Link to="/">Back to search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (booking.status === "HELD" || booking.status === "PAYMENT_PENDING") {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 pb-8 text-center" aria-busy="true">
        <Loader className="mx-auto size-8 animate-spin text-brand" aria-hidden />
        <p className="font-medium text-lg">Confirming your payment</p>
        <p className="text-sm text-muted-foreground">
          Booking {booking.bookingNumber} — do not close this page.
        </p>
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => void refetch()}
          >
            Refresh status
          </Button>
        </div>
      </div>
    );
  }

  if (booking.status === "CONFIRMED") {
    return <ConfirmedTicket booking={booking} />;
  }

  return (
    <div className="mx-auto w-full max-w-sm pb-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Booking not active</CardTitle>
          <CardDescription>
            This booking is {(booking.status ?? "unknown").toLowerCase()}. No payment was
            captured for an inactive booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full rounded-full">
            <Link to="/">Search again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfirmedTicket({ booking }: { booking: any }) {
  const bookingId = booking.id;
  const bookingNumber = booking.bookingNumber ?? booking.booking_number ?? "";
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancelMutation = useCancelBooking();
  const { data: receipt } = useBookingReceipt(bookingId, true);
  const { data: siteSettings } = useSiteSettings();
  const [searchParams] = useSearchParams();

  const propertyName =
    receipt?.propertyName ||
    receipt?.property?.name ||
    siteSettings?.propertyName ||
    booking.property?.name ||
    "Hamptworth Stays";
  const propertyAddress =
    receipt?.propertyAddress ||
    siteSettings?.address ||
    booking.property?.address ||
    "";
  const checkInTime =
    receipt?.property?.checkInTime ||
    siteSettings?.checkInTime ||
    booking.property?.checkInTime ||
    "16:00";
  const checkOutTime =
    receipt?.property?.checkOutTime ||
    siteSettings?.checkOutTime ||
    booking.property?.checkOutTime ||
    "10:00";
  const currency =
    receipt?.pricing?.currency ||
    siteSettings?.currency ||
    booking.pricing?.currency ||
    "GBP";

  const effectiveReceipt: BookingReceipt = receipt ?? {
    bookingNumber,
    status: booking.status,
    paymentStatus: booking.paymentStatus ?? booking.payment_status ?? "PAID",
    checkIn: booking.checkIn ?? booking.check_in,
    checkOut: booking.checkOut ?? booking.check_out,
    guests: booking.guests ?? { adults: 2, children: 0 },
    guestName: `${booking.contact?.firstName ?? ''} ${booking.contact?.lastName ?? ''}`.trim() || (booking.user?.name ?? 'Guest'),
    guestEmail: booking.contact?.email ?? booking.user?.email ?? '',
    guestPhone: booking.contact?.phone ?? booking.contact?.mobile ?? '',
    pricing: booking.pricing ?? { currency, subtotal: 0, discount: 0, taxes: 0, fees: 0, total: 0, couponCode: null },
    items: booking.items?.map((it: any) => ({
      id: it.id,
      roomName: it.roomNameSnapshot || it.roomName || it.room?.name || "Cottage",
      roomNumber: it.roomNumberSnapshot || it.room?.room_number || null,
      ratePlanName: it.ratePlanNameSnapshot || it.ratePlan?.name || "Standard Rate",
      checkIn: it.checkIn ?? it.check_in ?? booking.checkIn ?? booking.check_in,
      checkOut: it.checkOut ?? it.check_out ?? booking.checkOut ?? booking.check_out,
      guests: it.guests ?? booking.guests ?? { adults: 2, children: 0 },
      nightlyRates: it.nightlyRates ?? [],
      subtotal: it.subtotal ?? 0,
      discount: 0,
      taxes: 0,
      fees: 0,
      total: it.total ?? 0,
      currency: it.currency ?? currency,
    })) ?? [],
    payments: booking.payments?.map((p: any) => ({
      provider: p.provider ?? "STRIPE",
      amount: p.amount ?? 0,
      currency: p.currency ?? currency,
      status: p.status ?? "PAID",
      paidAt: p.paidAt ?? p.paid_at ?? p.createdAt ?? p.created_at,
    })) ?? [],
    property: {
      name: propertyName,
      currency,
      checkInTime,
      checkOutTime,
    },
    propertyName,
    propertyAddress,
    bookedAt: booking.createdAt ?? booking.created_at ?? new Date().toISOString(),
  };

  useEffect(() => {
    if ((receipt || booking) && (searchParams.get("download") === "true" || searchParams.get("print") === "true")) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receipt, booking, searchParams]);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 py-8">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, header, footer, .no-print, [role="navigation"] {
            display: none !important;
          }
          .ticket-print {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="ticket-print relative overflow-hidden rounded-2xl rounded-b-none border border-b-0 border-border bg-card shadow-card">
        {/* Header */}
        <div className="space-y-2 p-6 pb-5 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand/10">
            <BadgeCheck className="size-7 text-brand" aria-hidden />
          </span>
          <h1 className="font-display text-3xl font-light tracking-tight">
            Booking confirmed
          </h1>
          <p className="text-sm text-muted-foreground">
            Show this reference at check-in
          </p>
          <p className="pt-1 font-display text-3xl font-light tracking-tight">
            {bookingNumber}
          </p>
        </div>

        {/* Perforation with side notches */}
        <div className="relative px-6" aria-hidden="true">
          <div className="border-t-2 border-dashed border-border" />
          <span className="absolute -left-4 top-1/2 size-8 -translate-y-1/2 rounded-full border border-border bg-background" />
          <span className="absolute -right-4 top-1/2 size-8 -translate-y-1/2 rounded-full border border-border bg-background" />
        </div>

        {/* Receipt body - always renders instantly with effectiveReceipt */}
        <div className="p-6">
          <ReceiptBody receipt={effectiveReceipt} />
        </div>

        {/* Scalloped bottom edge */}
        <div className="ticket-scallop" aria-hidden="true" />
      </div>

      {/* Actions — outside the ticket so the printed receipt stays clean */}
      <div className="no-print space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Button asChild className="h-11 w-full rounded-full">
          <Link to="/">Book another stay</Link>
        </Button>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            className="h-10 flex-1 rounded-full gap-2 bg-brand text-white hover:bg-brand/90"
            onClick={() => window.print()}
          >
            <Download className="size-4" aria-hidden />
            Download receipt (PDF)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 rounded-full gap-2"
            onClick={() => window.print()}
          >
            <Printer className="size-4" aria-hidden />
            Print receipt
          </Button>
        </div>
        <div className="pt-1">
          {confirmingCancel ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-9 flex-1 rounded-full text-xs"
                onClick={() => setConfirmingCancel(false)}
              >
                Keep it
              </Button>
              <Button
                variant="destructive"
                className="h-9 flex-1 rounded-full text-xs"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(bookingId)}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="h-8 w-full rounded-full text-xs text-destructive hover:text-destructive"
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel booking
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function ReceiptBody({ receipt }: { receipt: BookingReceipt }) {
  const money = (minor: number, currency?: string) =>
    formatMoney(minor, currency ?? receipt.pricing?.currency ?? receipt.property?.currency ?? "GBP");

  const dogDetails = receipt.dogDetails ?? receipt.pricing?.dogDetails ?? [];
  const extrasList = receipt.extras ?? receipt.pricing?.extras ?? [];
  const totalDogFee = receipt.pricing?.dogFee ?? 0;
  const totalExtrasFee = receipt.pricing?.extrasFee ?? 0;

  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Property details</h2>
        <dl className="space-y-2">
          <ReceiptRow label="Property" value={receipt.propertyName || receipt.property?.name || "Hamptworth Stays"} />
          {receipt.propertyAddress && (
            <ReceiptRow label="Address" value={<span className="text-right text-xs sm:text-sm">{receipt.propertyAddress}</span>} />
          )}
          <ReceiptRow
            label="Check-in / Check-out"
            value={`${receipt.property?.checkInTime ?? "16:00"} / ${receipt.property?.checkOutTime ?? "10:00"}`}
          />
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Guest details</h2>
        <dl className="space-y-2">
          <ReceiptRow label="Name" value={receipt.guestName || "Guest"} />
          <ReceiptRow
            label="Email"
            value={<span className="break-all">{receipt.guestEmail || "—"}</span>}
          />
          <ReceiptRow label="Phone" value={receipt.guestPhone || "—"} />
          <ReceiptRow
            label="Guests"
            value={`${receipt.guests?.adults ?? 2} adult${(receipt.guests?.adults ?? 2) === 1 ? "" : "s"}${(receipt.guests?.children ?? 0) > 0 ? ` · ${receipt.guests?.children} child${(receipt.guests?.children ?? 0) === 1 ? "" : "ren"}` : ""}${(receipt.guests?.dogs ?? 0) > 0 ? ` · ${receipt.guests?.dogs} dog${(receipt.guests?.dogs ?? 0) === 1 ? "" : "s"}` : ""}`}
          />
        </dl>
      </section>

      {/* Cottages / Accommodation details */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {receipt.items && receipt.items.length > 1 ? `Cottages (${receipt.items.length})` : "Cottage stay"}
          </h2>
          {receipt.items && receipt.items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {formatDate(receipt.items[0].checkIn)} → {formatDate(receipt.items[0].checkOut)}
            </span>
          )}
        </div>
        {receipt.items && receipt.items.length > 0 ? (
          receipt.items.map((item, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">
                    {item.roomName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.ratePlanName} · {formatDate(item.checkIn)} → {formatDate(item.checkOut)}
                  </p>
                </div>
                <span className="font-semibold text-right">
                  {money(item.total, item.currency)}
                </span>
              </div>
              {item.nightlyRates && item.nightlyRates.length > 0 && (
                <details className="pt-1 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Nightly rate breakup ({item.nightlyRates.length} night{item.nightlyRates.length === 1 ? "" : "s"})
                  </summary>
                  <dl className="mt-1.5 space-y-1 pl-2 border-l border-border/60">
                    {item.nightlyRates.map((night) => (
                      <div key={night.date} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{formatDate(night.date)}</dt>
                        <dd className="font-mono text-xs">{money(night.amount, item.currency)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </div>
          ))
        ) : (
          <div className="space-y-1 rounded-xl bg-muted/50 p-3">
            <p className="font-medium">Reserved Stay</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(receipt.checkIn)} → {formatDate(receipt.checkOut)}
            </p>
          </div>
        )}
      </section>

      {/* Dogs & Pets Breakdown */}
      {dogDetails.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 stroke-current fill-none stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
            >
              <path d="M6 12 3 5l6 3m9 4 3-7-6 3M5 14a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm4 0h.01M15 14h.01m-5 4 2 1 2-1" />
            </svg>
            Dogs &amp; Pets
          </h2>
          <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/40 p-3">
            {dogDetails.map((dog, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-foreground">
                  <strong>{dog.cottageName}</strong>: {dog.dogsCount} dog{dog.dogsCount === 1 ? "" : "s"}
                </span>
                <span className="font-medium">{money(dog.fee)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : totalDogFee > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Dogs &amp; Pets</h2>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-3 text-xs">
            <span>Dog charge included</span>
            <span className="font-medium">{money(totalDogFee)}</span>
          </div>
        </section>
      ) : null}

      {/* Nice Extras Breakdown */}
      {extrasList.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Optional extras</h2>
          <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/40 p-3">
            {extrasList.map((extra, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 text-xs py-0.5">
                <div>
                  <span className="font-medium text-foreground">
                    {extra.title.replace(/<[^>]*>/g, "").trim()}
                  </span>
                  <span className="text-muted-foreground ml-1.5">
                    ×{extra.qty}
                    {extra.cottageName ? ` (${extra.cottageName})` : ""}
                  </span>
                </div>
                <span className="font-medium shrink-0">{money(extra.lineAmount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Price Details */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Price details</h2>
        <dl className="space-y-2">
          <ReceiptRow label="Cottage accommodation" value={money(receipt.pricing?.subtotal ?? 0)} />
          {totalDogFee > 0 && (
            <ReceiptRow label="Pet charges" value={money(totalDogFee)} />
          )}
          {totalExtrasFee > 0 && (
            <ReceiptRow label="Optional extras" value={money(totalExtrasFee)} />
          )}
          {(receipt.pricing?.discount ?? 0) > 0 && (
            <ReceiptRow
              label={`Discount${receipt.pricing?.couponCode ? ` (${receipt.pricing.couponCode})` : ""}`}
              value={
                <span className="text-success">
                  −{money(receipt.pricing?.discount ?? 0)}
                </span>
              }
            />
          )}
          {(receipt.pricing?.taxes ?? 0) > 0 && (
            <ReceiptRow label="Taxes" value={money(receipt.pricing?.taxes ?? 0)} />
          )}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <dt className="font-semibold text-base">Total paid</dt>
            <dd className="font-display text-2xl font-light">
              {money(receipt.pricing?.total ?? 0)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Payment details</h2>
        <dl className="space-y-2">
          {(!receipt.payments || receipt.payments.length === 0) ? (
            <ReceiptRow label="Status" value={receipt.paymentStatus} />
          ) : (
            receipt.payments.map((payment, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-muted/50 p-3">
                <ReceiptRow label="Method" value={providerLabel(payment.provider)} />
                <ReceiptRow label="Amount" value={money(payment.amount, payment.currency)} />
                <ReceiptRow label="Paid on" value={formatDateTime(payment.paidAt)} />
                <ReceiptRow
                  label="Status"
                  value={
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                      <span className="size-1.5 rounded-full bg-success" aria-hidden />
                      {payment.status}
                    </span>
                  }
                />
              </div>
            ))
          )}
        </dl>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Booked on {formatDateTime(receipt.bookedAt ?? null)} · {receipt.bookingNumber}
      </p>
    </div>
  );
}

export default BookingConfirmationPage;
