import { prisma } from "../../config/database";

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
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        checkIn: { gte: start, lt: end },
      },
    }),
    prisma.booking.count({
      where: {
        status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
        checkOut: { gte: start, lt: end },
      },
    }),
    prisma.booking.count({ where: { status: "CHECKED_IN" } }),
    prisma.booking.count({ where: { status: "CONFIRMED", checkIn: { gte: end } } }),
    prisma.booking.count({ where: { status: { in: ["HELD", "PAYMENT_PENDING"] } } }),
    prisma.payment.count({ where: { status: "FAILED", updatedAt: { gte: last24h } } }),
    prisma.booking.count({ where: { status: "REFUND_PENDING" } }),
    prisma.notification.count({ where: { status: "FAILED" } }),
    prisma.$queryRawUnsafe<Array<{ total: number; currency: string }>>(
      "SELECT JSON_UNQUOTE(JSON_EXTRACT(pricing, '$.currency')) as currency, SUM(JSON_EXTRACT(pricing, '$.total')) as total FROM bookings WHERE createdAt >= ? AND createdAt < ? GROUP BY currency",
      start,
      end,
    ),
  ]);
  const first = todayBookings[0];
  return {
    todayArrivals,
    todayDepartures,
    currentGuests,
    upcomingReservations,
    pendingPayments,
    paymentFailures24h,
    todayBookingValue: Number(first?.total ?? 0),
    todayBookingCurrency: first?.currency ?? null,
    pendingRefunds,
    failedNotifications,
  };
}
