import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader } from "lucide-react";
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
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Booking confirmed</CardTitle>
            <CardDescription>Show this reference at check-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="font-display text-3xl font-light tracking-tight">{booking.bookingNumber}</p>
            <dl className="space-y-1 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Check-in</dt>
                <dd>{formatDate(booking.checkIn)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Check-out</dt>
                <dd>{formatDate(booking.checkOut)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <dt>Total paid</dt>
                <dd>{formatMoney(booking.pricing.total, booking.pricing.currency)}</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/">Book another stay</Link>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm pb-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Booking not active</CardTitle>
          <CardDescription>
            This booking is {booking.status.toLowerCase()}. No payment was captured for an
            inactive booking.
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
