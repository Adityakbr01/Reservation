import { prisma } from "../../config/database";

export interface DailyPriceDocLike {
  id: string;
  ratePlanId: string;
  propertyId: string;
  date: Date;
  price: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const DAY_MS = 86_400_000;

export function stayDayKeys(checkIn: Date, checkOut: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(checkIn);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() < end.getTime()) {
    days.push(new Date(cursor));
    cursor.setTime(cursor.getTime() + DAY_MS);
    if (days.length > 366) break;
  }
  return days;
}

export async function getDailyPriceMap(
  ratePlanId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<Map<string, number>> {
  const days = stayDayKeys(checkIn, checkOut);
  if (days.length === 0) return new Map();
  const start = days[0] as Date;
  const endExclusive = new Date((days[days.length - 1] as Date).getTime() + DAY_MS);
  const docs = await prisma.dailyPrice.findMany({
    where: {
      ratePlanId,
      date: { gte: start, lt: endExclusive },
    },
    select: { date: true, price: true },
  });
  const map = new Map<string, number>();
  for (const doc of docs) {
    map.set(doc.date.toISOString().slice(0, 10), doc.price);
  }
  return map;
}

export async function findDailyPricesByRatePlanIds(
  ratePlanIds: string[],
  from: Date,
  toExclusive: Date,
): Promise<Array<{ ratePlanId: string; date: Date; price: number }>> {
  if (ratePlanIds.length === 0) return [];
  return prisma.dailyPrice.findMany({
    where: {
      ratePlanId: { in: ratePlanIds },
      date: { gte: from, lt: toExclusive },
    },
    select: { ratePlanId: true, date: true, price: true },
  });
}

/** Sum nightly prices with fallback to base per-night amount. Pure helper for tests. */
export function sumNightlyTotal(
  days: Date[],
  overrides: Map<string, number>,
  basePerNight: number,
  pricingType: "PER_NIGHT" | "PER_STAY",
  baseStayAmount: number,
): { total: number; nightly: Array<{ date: string; price: number }> } {
  if (pricingType === "PER_STAY") {
    return {
      total: baseStayAmount,
      nightly: days.map((d) => ({
        date: d.toISOString().slice(0, 10),
        price: Math.round(baseStayAmount / Math.max(1, days.length)),
      })),
    };
  }
  const nightly = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return { date: key, price: overrides.get(key) ?? basePerNight };
  });
  return { total: nightly.reduce((s, n) => s + n.price, 0), nightly };
}
