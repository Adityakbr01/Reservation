import { BookingModel } from "../bookings/booking.model";
import { BookingItemModel } from "../bookings/booking-item.model";
import { PaymentModel } from "../payments/payment.model";
import { RefundModel } from "../refunds/refund.model";
import { findRoomTypeById } from "../roomTypes/room-type.repository";

export type SalesRange = "today" | "week" | "month";

export interface SalesBucket {
  label: string;
  start: string;
  bookings: number;
  gross: number;
  collected: number;
  refunded: number;
}

export interface SalesByRoomType {
  roomTypeId: string;
  name: string;
  bookings: number;
  gross: number;
}

export interface RecentPurchase {
  id: string;
  bookingNumber: string;
  guest: string;
  checkIn: Date;
  checkOut: Date;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: Date;
}

export interface SalesReport {
  range: SalesRange;
  from: Date;
  to: Date;
  currency: string | null;
  bookingsCount: number;
  grossValue: number;
  collected: number;
  refunded: number;
  netCollected: number;
  occupancyNights: number;
  buckets: SalesBucket[];
  byRoomType: SalesByRoomType[];
  recent: RecentPurchase[];
}

/** Range bounds in UTC. Pure — unit-tested. */
export function salesRangeBounds(range: SalesRange, now: Date = new Date()): { from: Date; to: Date } {
  const to = new Date(now);
  const from = new Date(now);
  if (range === "today") {
    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(23, 59, 59, 999);
  } else if (range === "week") {
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - 6);
  } else {
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - 29);
  }
  return { from, to };
}

function bucketKey(date: Date, range: SalesRange): { label: string; start: string } {
  if (range === "today") {
    const hour = date.getUTCHours();
    const start = new Date(date);
    start.setUTCMinutes(0, 0, 0);
    const suffix = hour < 12 ? "am" : "pm";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return { label: `${h12}${suffix}`, start: start.toISOString() };
  }
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const label = start.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  return { label, start: start.toISOString() };
}

function emptyBuckets(range: SalesRange, from: Date, to: Date): SalesBucket[] {
  const buckets: SalesBucket[] = [];
  const cursor = new Date(from);
  if (range === "today") cursor.setUTCMinutes(0, 0, 0);
  else cursor.setUTCHours(0, 0, 0, 0);
  const stepMs = range === "today" ? 3_600_000 : 86_400_000;
  while (cursor.getTime() <= to.getTime()) {
    const key = bucketKey(cursor, range);
    buckets.push({ label: key.label, start: key.start, bookings: 0, gross: 0, collected: 0, refunded: 0 });
    cursor.setTime(cursor.getTime() + stepMs);
    if (buckets.length > 32) break;
  }
  return buckets;
}

export async function getSalesReport(range: SalesRange, now: Date = new Date()): Promise<SalesReport> {
  const { from, to } = salesRangeBounds(range, now);
  const [bookingRows, paymentRows, refundRows, typeRows, recentDocs] = await Promise.all([
    BookingModel.aggregate<{ total: number; count: number; currency: string }>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$pricing.currency", total: { $sum: "$pricing.total" }, count: { $sum: 1 } } },
      { $project: { _id: 0, total: 1, count: 1, currency: "$_id" } },
    ]).exec(),
    PaymentModel.aggregate<{ total: number }>([
      { $match: { status: "PAID", paidAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).exec(),
    RefundModel.aggregate<{ total: number }>([
      { $match: { status: "SUCCEEDED", processedAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).exec(),
    BookingItemModel.aggregate<{ roomTypeId: string; bookings: number; gross: number }>([
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },
      {
        $match: {
          "booking.createdAt": { $gte: from, $lte: to },
          "booking.status": { $nin: ["CANCELLED", "EXPIRED"] },
        },
      },
      {
        $group: {
          _id: "$roomTypeId",
          bookings: { $sum: 1 },
          gross: { $sum: "$pricing.total" },
        },
      },
    ]).exec(),
    BookingModel.find({ status: { $in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] } })
      .sort({ createdAt: -1 })
      .limit(8)
      .exec(),
  ]);

  const grossValue = bookingRows.reduce((sum, row) => sum + row.total, 0);
  const bookingsCount = bookingRows.reduce((sum, row) => sum + row.count, 0);
  const currency = bookingRows[0]?.currency ?? null;
  const collected = paymentRows[0]?.total ?? 0;
  const refunded = refundRows[0]?.total ?? 0;

  const buckets = emptyBuckets(range, from, to);
  const bucketIndex = new Map(buckets.map((bucket, i) => [bucket.start, i]));
  const [bucketBookings, bucketPayments, bucketRefunds] = await Promise.all([
    BookingModel.aggregate<{ at: Date; gross: number }>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $project: { at: "$createdAt", gross: "$pricing.total" } },
    ]).exec(),
    PaymentModel.aggregate<{ at: Date; amount: number }>([
      { $match: { status: "PAID", paidAt: { $gte: from, $lte: to } } },
      { $project: { at: "$paidAt", amount: 1 } },
    ]).exec(),
    RefundModel.aggregate<{ at: Date; amount: number }>([
      { $match: { status: "SUCCEEDED", processedAt: { $gte: from, $lte: to } } },
      { $project: { at: "$processedAt", amount: 1 } },
    ]).exec(),
  ]);
  for (const row of bucketBookings) {
    const i = bucketIndex.get(bucketKey(new Date(row.at), range).start);
    if (i !== undefined) {
      buckets[i].bookings += 1;
      buckets[i].gross += row.gross;
    }
  }
  for (const row of bucketPayments) {
    const i = bucketIndex.get(bucketKey(new Date(row.at), range).start);
    if (i !== undefined) buckets[i].collected += row.amount;
  }
  for (const row of bucketRefunds) {
    const i = bucketIndex.get(bucketKey(new Date(row.at), range).start);
    if (i !== undefined) buckets[i].refunded += row.amount;
  }

  const byRoomType: SalesByRoomType[] = [];
  for (const row of typeRows) {
    const roomType = row.roomTypeId ? await findRoomTypeById(String(row.roomTypeId)) : null;
    byRoomType.push({
      roomTypeId: String(row.roomTypeId),
      name: roomType?.name ?? "Unknown type",
      bookings: row.bookings,
      gross: row.gross,
    });
  }
  byRoomType.sort((a, b) => b.gross - a.gross);

  const occupancyNights = await BookingItemModel.countDocuments({
    bookingId: {
      $in: await BookingModel.find({
        status: { $in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        checkIn: { $lte: to },
        checkOut: { $gte: from },
      })
        .select("_id")
        .exec(),
    },
  }).exec();

  return {
    range,
    from,
    to,
    currency,
    bookingsCount,
    grossValue,
    collected,
    refunded,
    netCollected: collected - refunded,
    occupancyNights,
    buckets,
    byRoomType,
    recent: recentDocs.map((doc) => ({
      id: doc._id.toString(),
      bookingNumber: doc.bookingNumber,
      guest: `${doc.contact.firstName} ${doc.contact.lastName}`.trim(),
      checkIn: doc.checkIn,
      checkOut: doc.checkOut,
      total: doc.pricing.total,
      currency: doc.pricing.currency,
      status: doc.status,
      paymentStatus: doc.paymentStatus,
      createdAt: doc.createdAt,
    })),
  };
}
