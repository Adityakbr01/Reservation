import { prisma } from "../../config/database";
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
  const [bookingRows, paymentSum, refundSum, typeRows, recentDocs] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ total: number; count: bigint; currency: string }>>(
      "SELECT JSON_UNQUOTE(JSON_EXTRACT(pricing, '$.currency')) as currency, SUM(JSON_EXTRACT(pricing, '$.total')) as total, COUNT(*) as count FROM bookings WHERE createdAt >= ? AND createdAt <= ? GROUP BY currency",
      from,
      to,
    ),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: { status: "SUCCEEDED", processedAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.$queryRawUnsafe<Array<{ roomTypeId: string; bookings: bigint; gross: number }>>(
      "SELECT bi.roomTypeId, COUNT(*) as bookings, SUM(JSON_EXTRACT(bi.pricing, '$.total')) as gross FROM booking_items bi JOIN bookings b ON bi.bookingId = b.id WHERE b.createdAt >= ? AND b.createdAt <= ? AND b.status NOT IN ('CANCELLED', 'EXPIRED') GROUP BY bi.roomTypeId",
      from,
      to,
    ),
    prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const grossValue = bookingRows.reduce((sum: number, row: { total: number }) => sum + Number(row.total || 0), 0);
  const bookingsCount = bookingRows.reduce((sum: number, row: { count: bigint }) => sum + Number(row.count || 0), 0);
  const currency = bookingRows[0]?.currency ?? null;
  const collected = Number(paymentSum._sum.amount ?? 0);
  const refunded = Number(refundSum._sum.amount ?? 0);

  const buckets = emptyBuckets(range, from, to);
  const bucketIndex = new Map(buckets.map((bucket, i) => [bucket.start, i]));
  const [bucketBookings, bucketPayments, bucketRefunds] = await Promise.all([
    prisma.booking.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, pricing: true },
    }),
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: from, lte: to } },
      select: { paidAt: true, amount: true },
    }),
    prisma.refund.findMany({
      where: { status: "SUCCEEDED", processedAt: { gte: from, lte: to } },
      select: { processedAt: true, amount: true },
    }),
  ]);

  for (const row of bucketBookings) {
    const i = bucketIndex.get(bucketKey(new Date(row.createdAt), range).start);
    if (i !== undefined) {
      const p = typeof row.pricing === "string" ? JSON.parse(row.pricing) : (row.pricing as any);
      buckets[i].bookings += 1;
      buckets[i].gross += Number(p?.total ?? 0);
    }
  }
  for (const row of bucketPayments) {
    if (row.paidAt) {
      const i = bucketIndex.get(bucketKey(new Date(row.paidAt), range).start);
      if (i !== undefined) buckets[i].collected += Number(row.amount);
    }
  }
  for (const row of bucketRefunds) {
    if (row.processedAt) {
      const i = bucketIndex.get(bucketKey(new Date(row.processedAt), range).start);
      if (i !== undefined) buckets[i].refunded += Number(row.amount);
    }
  }

  const byRoomType: SalesByRoomType[] = [];
  for (const row of typeRows) {
    const roomType = row.roomTypeId ? await findRoomTypeById(String(row.roomTypeId)) : null;
    byRoomType.push({
      roomTypeId: String(row.roomTypeId),
      name: roomType?.name ?? "Unknown type",
      bookings: Number(row.bookings),
      gross: Number(row.gross || 0),
    });
  }
  byRoomType.sort((a, b) => b.gross - a.gross);

  const occupancyNights = await prisma.bookingItem.count({
    where: {
      booking: {
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        checkIn: { lte: to },
        checkOut: { gte: from },
      },
    },
  });

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
    recent: recentDocs.map((doc: any) => {
      const contact = typeof doc.contact === "string" ? JSON.parse(doc.contact) : doc.contact;
      const pricing = typeof doc.pricing === "string" ? JSON.parse(doc.pricing) : doc.pricing;
      return {
        id: doc.id,
        bookingNumber: doc.bookingNumber,
        guest: `${contact?.firstName ?? ""} ${contact?.lastName ?? ""}`.trim(),
        checkIn: doc.checkIn,
        checkOut: doc.checkOut,
        total: Number(pricing?.total ?? 0),
        currency: pricing?.currency ?? "GBP",
        status: doc.status,
        paymentStatus: doc.paymentStatus,
        createdAt: doc.createdAt,
      };
    }),
  };
}
