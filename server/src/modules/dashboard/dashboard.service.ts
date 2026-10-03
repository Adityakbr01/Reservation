import { BookingModel } from "../bookings/booking.model";
import { PaymentModel } from "../payments/payment.model";
import { NotificationModel } from "../notifications/notification.model";

export interface DashboardSummary {
  todayArrivals: number;
  todayDepartures: number;
  currentGuests: number;
  upcomingReservations: number;
  pendingPayments: number;
  paymentFailures24h: number;
  todayBookingValue: number;
  todayBookingCurrency: string | null;
  pendingRefunds: number;
  failedNotifications: number;
}

function dayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/**
 * Ops overview cards (docs 07 §10-13). Aggregations only — the API never
 * ships full collections for counting.
 */
export async function getDashboardSummary(now: Date = new Date()): Promise<DashboardSummary> {
  const { start, end } = dayBounds(now);
  const last24h = new Date(now.getTime() - 24 * 3_600_000);
  const [
    todayArrivals,
    todayDepartures,
    currentGuests,
    upcomingReservations,
    pendingPayments,
    paymentFailures24h,
    pendingRefunds,
    failedNotifications,
    todayBookings,
  ] = await Promise.all([
    BookingModel.countDocuments({
      status: "CONFIRMED",
      checkIn: { $gte: start, $lt: end },
    }).exec(),
    BookingModel.countDocuments({
      status: { $in: ["CHECKED_IN", "CHECKED_OUT"] },
      checkOut: { $gte: start, $lt: end },
    }).exec(),
    BookingModel.countDocuments({ status: "CHECKED_IN" }).exec(),
    BookingModel.countDocuments({ status: "CONFIRMED", checkIn: { $gte: end } }).exec(),
    BookingModel.countDocuments({ status: { $in: ["HELD", "PAYMENT_PENDING"] } }).exec(),
    PaymentModel.countDocuments({ status: "FAILED", updatedAt: { $gte: last24h } }).exec(),
    BookingModel.countDocuments({ status: "REFUND_PENDING" }).exec(),
    NotificationModel.countDocuments({ status: "FAILED" }).exec(),
    BookingModel.aggregate<{ total: number; currency: string }>([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$pricing.currency", total: { $sum: "$pricing.total" } } },
      { $project: { _id: 0, total: 1, currency: "$_id" } },
    ]).exec(),
  ]);
  const first = todayBookings[0];
  return {
    todayArrivals,
    todayDepartures,
    currentGuests,
    upcomingReservations,
    pendingPayments,
    paymentFailures24h,
    todayBookingValue: first?.total ?? 0,
    todayBookingCurrency: first?.currency ?? null,
    pendingRefunds,
    failedNotifications,
  };
}
