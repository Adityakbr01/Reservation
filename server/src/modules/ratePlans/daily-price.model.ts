import mongoose from "mongoose";

export interface DailyPriceDocument extends mongoose.Document {
  ratePlanId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  /** Day the price applies to (00:00:00Z). Stay nights are [checkIn, checkOut). */
  date: Date;
  /** Minor units (pence/cents). Per-night price for that date. */
  price: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const dailyPriceSchema = new mongoose.Schema<DailyPriceDocument>(
  {
    ratePlanId: { type: mongoose.Schema.Types.ObjectId, ref: "RatePlan", required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, maxlength: 3, default: "GBP" },
  },
  { timestamps: true },
);

dailyPriceSchema.index({ ratePlanId: 1, date: 1 }, { unique: true });
dailyPriceSchema.index({ propertyId: 1, date: 1 });

export const DailyPriceModel =
  mongoose.models.DailyPrice ?? mongoose.model<DailyPriceDocument>("DailyPrice", dailyPriceSchema);

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
  const docs = await DailyPriceModel.find({
    ratePlanId,
    date: { $gte: start, $lt: endExclusive },
  })
    .select("date price")
    .exec();
  const map = new Map<string, number>();
  for (const doc of docs) {
    map.set(doc.date.toISOString().slice(0, 10), doc.price);
  }
  return map;
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
