import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import {
  useCancelPreview,
  useCancelReservation,
  useCheckInReservation,
  useCheckOutReservation,
  useDeleteReservation,
  useReassignReservation,
  useReservation,
} from "../hooks/use-reservations";
import { useCottages } from "@/modules/cottages";
import { useRefundBooking } from "../../payments/hooks/use-payments";
import type { Reservation, ReservationItem } from "../types/reservation.types";

const CANCELLABLE = ["HELD", "PAYMENT_PENDING", "CONFIRMED"];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return formatDateTime(value);
}

export function ReservationDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const { data, isPending, isError, refetch } = useReservation(id);
  const previewQuery = useCancelPreview(id, showCancel);
  const cancelMutation = useCancelReservation(id);
  const deleteMutation = useDeleteReservation(id);
  const refundMutation = useRefundBooking(id);
  const checkInMutation = useCheckInReservation(id);
  const checkOutMutation = useCheckOutReservation(id);
  const reassignMutation = useReassignReservation(id);
  const [showReassign, setShowReassign] = useState(false);
  const [targetCottageId, setTargetCottageId] = useState("");
  const { data: cottagesData, isPending: cottagesPending, isError: cottagesError } = useCottages({ page: 1, limit: 100 });

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

  const rawData = data as any;
  const rawBooking = rawData?.booking ?? rawData;
  const booking: Reservation = {
    ...rawBooking,
    id: rawBooking?.id ?? "",
    bookingNumber: rawBooking?.bookingNumber ?? rawBooking?.booking_number ?? "",
    propertyId: rawBooking?.propertyId ?? rawBooking?.property_id ?? "",
    userId: rawBooking?.userId ?? rawBooking?.user_id ?? null,
    status: rawBooking?.status ?? "HELD",
    paymentStatus: rawBooking?.paymentStatus ?? rawBooking?.payment_status ?? "PENDING",
    checkIn: rawBooking?.checkIn ?? rawBooking?.check_in ?? "",
    checkOut: rawBooking?.checkOut ?? rawBooking?.check_out ?? "",
    guests: {
      adults: Number(rawBooking?.guests?.adults ?? 1),
      children: Number(rawBooking?.guests?.children ?? 0),
      dogs: Number(rawBooking?.guests?.dogs ?? 0),
    },
    contact: {
      title: rawBooking?.contact?.title ?? null,
      firstName: rawBooking?.contact?.firstName ?? rawBooking?.contact?.first_name ?? "",
      lastName: rawBooking?.contact?.lastName ?? rawBooking?.contact?.last_name ?? "",
      email: rawBooking?.contact?.email ?? "",
      phone: rawBooking?.contact?.phone ?? "",
      mobile: rawBooking?.contact?.mobile ?? null,
      address1: rawBooking?.contact?.address1 ?? null,
      address2: rawBooking?.contact?.address2 ?? null,
      city: rawBooking?.contact?.city ?? null,
      county: rawBooking?.contact?.county ?? null,
      postcode: rawBooking?.contact?.postcode ?? null,
      country: rawBooking?.contact?.country ?? null,
    },
    pricing: {
      currency: rawBooking?.pricing?.currency ?? "GBP",
      subtotal: Number(rawBooking?.pricing?.subtotal ?? 0),
      discount: Number(rawBooking?.pricing?.discount ?? 0),
      taxes: Number(rawBooking?.pricing?.taxes ?? 0),
      fees: Number(rawBooking?.pricing?.fees ?? 0),
      dogFee: Number(rawBooking?.pricing?.dogFee ?? rawBooking?.pricing?.dog_fee ?? rawBooking?.pricing?.fees ?? 0),
      total: Number(rawBooking?.pricing?.total ?? 0),
      couponCode: rawBooking?.pricing?.couponCode ?? rawBooking?.pricing?.coupon_code ?? null,
    },
    cancellation: {
      cancelledAt: rawBooking?.cancellation?.cancelledAt ?? rawBooking?.cancellation?.cancelled_at ?? null,
      cancelledBy: rawBooking?.cancellation?.cancelledBy ?? rawBooking?.cancellation?.cancelled_by ?? null,
      reason: rawBooking?.cancellation?.reason ?? null,
    },
    hold: {
      holdId: rawBooking?.hold?.holdId ?? rawBooking?.hold?.hold_id ?? null,
      expiresAt: rawBooking?.hold?.expiresAt ?? rawBooking?.hold?.expires_at ?? null,
    },
    stay: {
      checkedInAt: rawBooking?.stay?.checkedInAt ?? rawBooking?.stay?.checked_in_at ?? null,
      checkedInBy: rawBooking?.stay?.checkedInBy ?? rawBooking?.stay?.checked_in_by ?? null,
      checkedOutAt: rawBooking?.stay?.checkedOutAt ?? rawBooking?.stay?.checked_out_at ?? null,
      checkedOutBy: rawBooking?.stay?.checkedOutBy ?? rawBooking?.stay?.checked_out_by ?? null,
    },
    source: rawBooking?.source ?? "DIRECT",
    notes: rawBooking?.notes ?? null,
    createdAt: rawBooking?.createdAt ?? rawBooking?.created_at ?? "",
    updatedAt: rawBooking?.updatedAt ?? rawBooking?.updated_at ?? "",
  };
  const items: ReservationItem[] = Array.isArray(rawData?.items)
    ? rawData.items
    : Array.isArray(rawBooking?.items)
      ? rawBooking.items
      : [];
  const payments: any[] = Array.isArray(rawData?.payments)
    ? rawData.payments
    : Array.isArray(rawBooking?.payments)
      ? rawBooking.payments
      : [];
  const canCancel = CANCELLABLE.includes(booking.status);
  const preview = previewQuery.data ?? null;
  const canReassign =
    (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && items.length === 1;
  const firstItem = items[0];

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
          {booking.status === "CONFIRMED" && (
            <ConfirmButton
              title={`Check in ${booking.bookingNumber}?`}
              description="The guest is marked as arrived and the stay starts."
              confirmLabel="Check in"
              triggerLabel={checkInMutation.isPending ? "Checking in…" : "Check in"}
              triggerVariant="default"
              triggerClassName="rounded-full"
              pending={checkInMutation.isPending}
              onConfirm={() => checkInMutation.mutate()}
            />
          )}
          {booking.status === "CHECKED_IN" && (
            <ConfirmButton
              title={`Check out ${booking.bookingNumber}?`}
              description="The stay is closed. Make sure dues are settled first."
              confirmLabel="Check out"
              triggerLabel={checkOutMutation.isPending ? "Checking out…" : "Check out"}
              triggerVariant="default"
              triggerClassName="rounded-full"
              pending={checkOutMutation.isPending}
              onConfirm={() => checkOutMutation.mutate()}
            />
          )}
          {canReassign && (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setTargetCottageId("");
                setShowReassign(true);
              }}
            >
              Move cottage
            </Button>
          )}
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
          {booking.status === "REFUND_PENDING" && (
            <ConfirmButton
              title="Retry the refund?"
              description="A new refund attempt is sent to Stripe for this booking."
              confirmLabel="Retry refund"
              triggerLabel={refundMutation.isPending ? "Retrying…" : "Retry refund"}
              triggerVariant="outline"
              triggerClassName="rounded-full"
              pending={refundMutation.isPending}
              onConfirm={() => refundMutation.mutate(null)}
            />
          )}
          {(booking.status === "CANCELLED" || booking.status === "HELD" || booking.status === "EXPIRED") && (
            <ConfirmButton
              title="Delete this reservation record?"
              description="Permanently delete this reservation and all its items. This cannot be undone."
              confirmLabel="Delete permanently"
              triggerLabel={deleteMutation.isPending ? "Deleting…" : "Delete reservation"}
              triggerVariant="outline"
              triggerClassName="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10"
              pending={deleteMutation.isPending}
              onConfirm={() => {
                deleteMutation.mutate(undefined, {
                  onSuccess: () => navigate("/reservations"),
                });
              }}
            />
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
              {[booking.contact.title, booking.contact.firstName, booking.contact.lastName]
                .filter(Boolean)
                .join(" ")}{" "}
              · {booking.contact.email} · {booking.contact.phone}
              {booking.contact.mobile ? ` · ${booking.contact.mobile}` : ""}
            </p>
            {[booking.contact.address1, booking.contact.address2, booking.contact.city, booking.contact.county, booking.contact.postcode, booking.contact.country]
              .filter(Boolean).length > 0 && (
              <p className="text-muted-foreground">
                {[
                  booking.contact.address1,
                  booking.contact.address2,
                  booking.contact.city,
                  booking.contact.county,
                  booking.contact.postcode,
                  booking.contact.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <p className="text-muted-foreground">
              {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ·{" "}
              {booking.guests.adults + booking.guests.children} guest
              {booking.guests.adults + booking.guests.children === 1 ? "" : "s"}
              {Number(booking.guests.dogs ?? 0) > 0 &&
                ` · ${Number(booking.guests.dogs)} dog${Number(booking.guests.dogs) === 1 ? "" : "s"}`}
            </p>
            <p className="text-muted-foreground">
              Total {formatMoney(booking.pricing.total, booking.pricing.currency)}
              {booking.pricing.discount > 0 &&
                ` (incl. ${formatMoney(booking.pricing.discount, booking.pricing.currency)} coupon)`}
              {Number(booking.pricing.dogFee ?? 0) > 0 &&
                ` (incl. ${formatMoney(Number(booking.pricing.dogFee), booking.pricing.currency)} dog fee)`}
            </p>
            {booking.cancellation.cancelledAt && (
              <p className="text-muted-foreground">
                Cancelled {formatDate(booking.cancellation.cancelledAt)}
                {booking.cancellation.reason ? ` — ${booking.cancellation.reason}` : ""}
              </p>
            )}
            {booking.stay.checkedInAt && (
              <p className="text-muted-foreground">
                Checked in {formatDate(booking.stay.checkedInAt)}
                {booking.stay.checkedOutAt ? ` · out ${formatDate(booking.stay.checkedOutAt)}` : ""}
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

      {showReassign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Move to another room"
          onClick={() => setShowReassign(false)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-xl">Move {booking.bookingNumber}?</CardTitle>
              <CardDescription>
                Select target cottage · must be free for the whole stay.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target cottage</Label>
                <Select value={targetCottageId} onValueChange={setTargetCottageId} disabled={cottagesPending}>
                  <SelectTrigger aria-label="Target cottage">
                    <SelectValue
                      placeholder={
                        cottagesPending
                          ? "Loading cottages…"
                          : cottagesError
                            ? "Could not load cottages"
                            : "Choose a cottage"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(cottagesData?.items ?? [])
                      .filter((c) => c.id !== firstItem?.roomTypeId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.roomId || c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {cottagesError && (
                  <p className="text-xs text-destructive">
                    Cottage list failed to load — close and reopen to retry.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setShowReassign(false)}
                >
                  Keep cottage
                </Button>
                <Button
                  className="flex-1 rounded-full"
                  disabled={!targetCottageId || reassignMutation.isPending}
                  onClick={() =>
                    reassignMutation.mutate(targetCottageId, {
                      onSuccess: () => setShowReassign(false),
                    })
                  }
                >
                  {reassignMutation.isPending ? "Moving…" : "Confirm move"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
