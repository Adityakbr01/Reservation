import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useCancelPreview,
  useCancelReservation,
  useReservation,
} from "../hooks/use-reservations";

const CANCELLABLE = ["HELD", "PAYMENT_PENDING", "CONFIRMED"];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ReservationDetailPage() {
  const { id = "" } = useParams();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const { data, isPending, isError, refetch } = useReservation(id);
  const previewQuery = useCancelPreview(id, showCancel);
  const cancelMutation = useCancelReservation(id);

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading reservation">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-sm py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Not found</CardTitle>
            <CardDescription>This reservation does not exist or failed to load.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button asChild className="flex-1 rounded-full">
              <Link to="/reservations">Back to list</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { booking, items, payments } = data;
  const canCancel = CANCELLABLE.includes(booking.status);
  const preview = previewQuery.data ?? null;

  function confirmCancel() {
    cancelMutation.mutate(reason.trim() || null, {
      onSuccess: () => setShowCancel(false),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/reservations"
            className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            ← Back to reservations
          </Link>
          <h1 className="mt-2 font-display text-3xl font-light tracking-tight">
            {booking.bookingNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          {canCancel && (
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => {
                setReason("");
                setShowCancel(true);
              }}
            >
              Cancel booking
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Stay &amp; guest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {booking.contact.firstName} {booking.contact.lastName} · {booking.contact.email} ·{" "}
              {booking.contact.phone}
            </p>
            <p className="text-muted-foreground">
              {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ·{" "}
              {booking.guests.adults + booking.guests.children} guest
              {booking.guests.adults + booking.guests.children === 1 ? "" : "s"}
            </p>
            <p className="text-muted-foreground">
              Total {formatMoney(booking.pricing.total, booking.pricing.currency)}
              {booking.pricing.discount > 0 &&
                ` (incl. ${formatMoney(booking.pricing.discount, booking.pricing.currency)} coupon)`}
            </p>
            {booking.cancellation.cancelledAt && (
              <p className="text-muted-foreground">
                Cancelled {formatDate(booking.cancellation.cancelledAt)}
                {booking.cancellation.reason ? ` — ${booking.cancellation.reason}` : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="space-y-2">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {formatMoney(payment.amount, payment.currency)}
                    </span>
                    <StatusBadge status={payment.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Rate plan</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">
                      {item.roomNameSnapshot}
                      {item.roomNumberSnapshot ? ` · ${item.roomNumberSnapshot}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>{item.ratePlanNameSnapshot}</TableCell>
                  <TableCell>
                    {formatDate(item.checkIn)} → {formatDate(item.checkOut)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.pricing?.total ?? 0, booking.pricing.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cancel booking"
          onClick={() => setShowCancel(false)}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <CardHeader>
              <CardTitle className="text-xl">Cancel {booking.bookingNumber}?</CardTitle>
              <CardDescription>This follows the cancellation policy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewQuery.isPending ? (
                <p className="text-sm text-muted-foreground">Calculating refund…</p>
              ) : previewQuery.isError || !preview ? (
                <p className="text-sm text-destructive">
                  Could not load the cancellation preview.{" "}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => void previewQuery.refetch()}
                  >
                    Retry
                  </button>
                </p>
              ) : (
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Policy</dt>
                    <dd>{preview.evaluation.policyName ?? "Standard"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Paid total</dt>
                    <dd>{formatMoney(preview.paidTotal, booking.pricing.currency)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <dt>Expected refund</dt>
                    <dd>
                      {formatMoney(preview.evaluation.refundAmount, booking.pricing.currency)}
                    </dd>
                  </div>
                  <p className="text-xs text-muted-foreground">{preview.evaluation.reason}</p>
                </dl>
              )}
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason (optional)</Label>
                <Input
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Guest requested…"
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setShowCancel(false)}
                >
                  Keep booking
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-full"
                  disabled={cancelMutation.isPending || (preview ? !preview.evaluation.isCancellable : false)}
                  onClick={confirmCancel}
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Confirm cancel"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ReservationDetailPage;
