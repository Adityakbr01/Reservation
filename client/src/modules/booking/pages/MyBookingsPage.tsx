import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { useMyBookings } from "../hooks/use-booking";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MyBookingsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useMyBookings(page);
  const bookings = data?.bookings ?? [];
  const meta = data?.meta;

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 pb-8 text-center" aria-busy="true">
        <Loader className="mx-auto size-8 animate-spin text-brand" aria-hidden />
        <p className="font-medium">Loading your bookings</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-sm pb-8 text-center">
        <p className="font-medium">We could not load your bookings.</p>
        <Button className="mt-4 rounded-full" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">My bookings</h1>
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p className="text-muted-foreground">No bookings yet.</p>
            <Button asChild className="rounded-full">
              <Link to="/">Search rooms</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{booking.bookingNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.status.toLowerCase()} ·{" "}
                      {formatMoney(booking.pricing.total, booking.pricing.currency)}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="shrink-0 rounded-full">
                    <Link to={`/booking/confirmation/${booking.id}`}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default MyBookingsPage;
