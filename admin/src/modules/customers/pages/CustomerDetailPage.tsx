import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatMoney } from "@/lib/money";
import { useCustomer, useSetCustomerStatus } from "../hooks/use-customers";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function CustomerDetailPage() {
  const { id = "" } = useParams();
  const { data, isPending, isError, refetch } = useCustomer(id);
  const statusMutation = useSetCustomerStatus(id);

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading customer">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-sm py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Not found</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button asChild className="flex-1 rounded-full">
              <Link to="/customers">Back to list</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, bookings, paymentSummary, cancellations } = data;
  const isActive = Boolean(user.isActive ?? user.is_active);
  const createdAt = user.createdAt ?? user.created_at;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/customers" className="text-sm font-medium text-brand hover:text-brand-dark">
            ← Back to customers
          </Link>
          <h1 className="mt-2 font-display text-3xl font-light tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.email} · joined {formatDate(createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={isActive ? "ACTIVE" : "DISABLED"} />
          <Button
            variant={isActive ? "destructive" : "outline"}
            className="rounded-full"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate(!isActive)}
          >
            {statusMutation.isPending ? "Saving…" : isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Paid{" "}
              {paymentSummary.currency
                ? formatMoney(paymentSummary.paid, paymentSummary.currency)
                : paymentSummary.paid}
            </p>
            <p className="text-muted-foreground">
              Refunded{" "}
              {paymentSummary.currency
                ? formatMoney(paymentSummary.refunded, paymentSummary.currency)
                : paymentSummary.refunded}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Cancellations ({cancellations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {cancellations.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {cancellations.map((entry) => (
                  <li key={entry.bookingNumber}>
                    {entry.bookingNumber} · {formatDate(entry.cancelledAt)}
                    {entry.reason ? ` — ${entry.reason}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Booking history ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Stay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Link
                        to={`/reservations/${booking.id}`}
                        className="font-medium text-brand hover:text-brand-dark"
                      >
                        {booking.bookingNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(booking.total, booking.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomerDetailPage;
