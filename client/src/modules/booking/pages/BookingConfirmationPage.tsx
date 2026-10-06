import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Loader, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { useBookingStatus, useCancelBooking } from "../hooks/use-booking";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BookingConfirmationPage() {
  const { id = "" } = useParams();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const { data: booking, isPending, isError, refetch } = useBookingStatus(id === "" ? null : id);
  const cancelMutation = useCancelBooking();

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
        <p className="font-medium">Confirming your payment</p>
        <p className="text-sm text-muted-foreground">
          Booking {booking.bookingNumber} — do not close this page.
        </p>
      </div>
    );
  }

  if (booking.status === "CONFIRMED") {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 py-8">
        <div className="ticket-print relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
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
              {booking.bookingNumber}
            </p>
          </div>

          {/* Perforation with side notches */}
          <div className="relative px-6" aria-hidden="true">
            <div className="border-t-2 border-dashed border-border" />
            <span className="absolute -left-4 top-1/2 size-8 -translate-y-1/2 rounded-full border border-border bg-background" />
            <span className="absolute -right-4 top-1/2 size-8 -translate-y-1/2 rounded-full border border-border bg-background" />
          </div>

          {/* Details stub */}
          <div className="space-y-3 p-6">
            <h2 className="text-sm font-semibold">Booking details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Check-in</dt>
                <dd className="font-medium">{formatDate(booking.checkIn)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Check-out</dt>
                <dd className="font-medium">{formatDate(booking.checkOut)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Payment status</dt>
                <dd>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                    <span className="size-1.5 rounded-full bg-success" aria-hidden />
                    {booking.paymentStatus || "Paid"}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <dt className="font-semibold">Total paid</dt>
                <dd className="font-display text-2xl font-light">
                  {formatMoney(booking.pricing.total, booking.pricing.currency)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="no-print space-y-2 px-6 pb-6">
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/">Book another stay</Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-full text-muted-foreground"
              onClick={() => window.print()}
            >
              <Printer className="size-4" aria-hidden />
              Print receipt
            </Button>
            {confirmingCancel ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep it
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-full"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(booking.id)}
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full rounded-full text-muted-foreground"
                onClick={() => setConfirmingCancel(true)}
              >
                Cancel this booking
              </Button>
            )}
          </div>
        </div>
      </div>
    );
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

export default BookingConfirmationPage;
