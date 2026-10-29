import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Loader, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { useBookingReceipt, useBookingStatus, useCancelBooking } from "../hooks/use-booking";
import type { BookingReceipt } from "../types/booking.types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function providerLabel(provider: string): string {
  if (provider === "STRIPE") return "Online payment · Stripe";
  return provider || "Online payment";
}

export function BookingConfirmationPage() {
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
    return <ConfirmedTicket bookingId={booking.id} bookingNumber={booking.bookingNumber} />;
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

function ConfirmedTicket({ bookingId, bookingNumber }: { bookingId: string; bookingNumber: string }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancelMutation = useCancelBooking();
  const { data: receipt, isPending: isReceiptPending } = useBookingReceipt(bookingId, true);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 py-8">
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

        {/* Receipt body */}
        <div className="p-6">
          {isReceiptPending || !receipt ? (
            <ReceiptSkeleton />
          ) : (
            <ReceiptBody receipt={receipt} />
          )}
        </div>

        {/* Scalloped bottom edge */}
        <div className="ticket-scallop" aria-hidden="true" />
      </div>

      {/* Actions — outside the ticket so the printed receipt stays clean */}
      <div className="no-print space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Button asChild className="h-11 w-full rounded-full">
          <Link to="/">Book another stay</Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-10 flex-1 rounded-full"
            onClick={() => window.print()}
          >
            <Printer className="size-4" aria-hidden />
            Print receipt
          </Button>
          {confirmingCancel ? (
            <>
              <Button
                variant="outline"
                className="h-10 flex-1 rounded-full"
                onClick={() => setConfirmingCancel(false)}
              >
                Keep it
              </Button>
              <Button
                variant="destructive"
                className="h-10 flex-1 rounded-full"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(bookingId)}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="h-10 flex-1 rounded-full text-destructive hover:text-destructive"
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

function ReceiptSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading receipt">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-full" />
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
    formatMoney(minor, currency ?? receipt.pricing.currency);
  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Guest details</h2>
        <dl className="space-y-2">
          <ReceiptRow label="Name" value={receipt.guestName} />
          <ReceiptRow
            label="Email"
            value={<span className="break-all">{receipt.guestEmail}</span>}
          />
          <ReceiptRow label="Phone" value={receipt.guestPhone} />
          <ReceiptRow
            label="Guests"
            value={`${receipt.guests.adults} adult${receipt.guests.adults === 1 ? "" : "s"}${receipt.guests.children > 0 ? ` · ${receipt.guests.children} child${receipt.guests.children === 1 ? "" : "ren"}` : ""}`}
          />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Stay details</h2>
        {receipt.items.map((item, i) => (
          <div key={i} className="space-y-1 rounded-xl bg-muted/50 p-3">
            <p className="font-medium">
              {item.roomName}
              {item.roomNumber ? ` · Room ${item.roomNumber}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.ratePlanName} · {formatDate(item.checkIn)} → {formatDate(item.checkOut)}
            </p>
            {item.nightlyRates.length > 0 && (
              <details className="pt-1 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Nightly breakup ({item.nightlyRates.length} night{item.nightlyRates.length === 1 ? "" : "s"})
                </summary>
                <dl className="mt-1 space-y-0.5">
                  {item.nightlyRates.map((night) => (
                    <div key={night.date} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{formatDate(night.date)}</dt>
                      <dd>{money(night.amount, item.currency)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Price details</h2>
        <dl className="space-y-2">
          <ReceiptRow label="Subtotal" value={money(receipt.pricing.subtotal)} />
          {receipt.pricing.discount > 0 && (
            <ReceiptRow
              label={`Discount${receipt.pricing.couponCode ? ` (${receipt.pricing.couponCode})` : ""}`}
              value={
                <span className="text-success">
                  −{money(receipt.pricing.discount)}
                </span>
              }
            />
          )}
          {receipt.pricing.taxes > 0 && (
            <ReceiptRow label="Taxes" value={money(receipt.pricing.taxes)} />
          )}
          {receipt.pricing.fees > 0 && (
            <ReceiptRow label="Fees" value={money(receipt.pricing.fees)} />
          )}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <dt className="font-semibold">Total paid</dt>
            <dd className="font-display text-2xl font-light">
              {money(receipt.pricing.total)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Payment details</h2>
        <dl className="space-y-2">
          {receipt.payments.length === 0 ? (
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
        Booked on {formatDateTime(receipt.bookedAt)} · {receipt.bookingNumber}
      </p>
    </div>
  );
}

export default BookingConfirmationPage;
