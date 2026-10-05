import mongoose from "mongoose";
import { AppError } from "../../utils/app-error";
import { AvailabilityBlockModel } from "./availability-block.model";
import { BookingItemModel } from "../bookings/booking-item.model";
import { BookingModel } from "../bookings/booking.model";
import { HOLD_STATUSES, INVENTORY_BLOCKING_STATUSES } from "../bookings/booking.types";
import { readRoomHolds } from "../bookings/hold.store";
import { listRooms } from "../rooms/room.repository";
import { listRoomTypes } from "../roomTypes/room-type.repository";

export interface CalendarDay {
  date: string;
  total: number;
  available: number;
  booked: number;
  blocked: number;
  /** Cheapest nightly price (minor units) for the day, null when no ACTIVE plan. */
  price?: number | null;
  currency?: string;
  /**
   * Smallest minimum-stay among ACTIVE plans valid that day, for the
   * "N-night minimum stay" tooltip. Null when no plan enforces one.
   */
  minNights?: number | null;
}

export interface CalendarRoomType {
  roomTypeId: string;
  name: string;
  days: CalendarDay[];
}

export interface AvailabilityCalendar {
  from: string;
  to: string;
  types: CalendarRoomType[];
}

const DAY_MS = 86_400_000;
const MAX_DAYS = 62;

function toDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Nights a [checkIn, checkOut) stay occupies, as day keys. Pure — unit-tested. */
export function occupiedDayKeys(checkIn: Date, checkOut: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(checkIn);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() < end.getTime()) {
    keys.push(toDayKey(cursor));
    cursor.setTime(cursor.getTime() + DAY_MS);
    if (keys.length > 366) break;
  }
  return keys;
}

function parseDay(value: string, name: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`Invalid ${name}, expected YYYY-MM-DD`, 400, "INVALID_DATE");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${name}, expected YYYY-MM-DD`, 400, "INVALID_DATE");
  }
  return date;
}

/**
 * Per-day availability grid (powers the client calendar + admin calendar).
 * One batched read per source, then pure in-memory math — no N+1 queries.
 */
export async function getAvailabilityCalendar(
  fromInput: string,
  toInput: string,
  roomTypeId?: string,
): Promise<AvailabilityCalendar> {
  const from = parseDay(fromInput, "from");
  const to = parseDay(toInput, "to");
  const spanDays = Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
  if (spanDays < 1 || spanDays > MAX_DAYS) {
    throw new AppError(`Calendar span must be 1–${MAX_DAYS} days`, 400, "INVALID_RANGE");
  }
  if (roomTypeId && !mongoose.Types.ObjectId.isValid(roomTypeId)) {
    throw new AppError("Unknown room type", 404, "ROOM_TYPE_NOT_FOUND");
  }

  const [typesPage, roomsPage] = await Promise.all([
    listRoomTypes({ page: 1, limit: 500, onlyActive: true }),
    listRooms({ page: 1, limit: 2000, status: "ACTIVE" }),
  ]);
  const types = roomTypeId ? typesPage.data.filter((type) => type.id === roomTypeId) : typesPage.data;
  if (roomTypeId && types.length === 0) {
    throw new AppError("Unknown room type", 404, "ROOM_TYPE_NOT_FOUND");
  }
  const rooms = roomsPage.data.filter((room) =>
    types.some((type) => type.id === room.roomTypeId),
  );
  const roomIds = rooms.map((room) => room.id);
  const rangeEnd = new Date(to.getTime() + DAY_MS);

  const [blocks, items] = await Promise.all([
    roomIds.length > 0
      ? AvailabilityBlockModel.find({
          roomId: { $in: roomIds },
          startDate: { $lt: rangeEnd },
          endDate: { $gt: from },
        })
          .select("roomId startDate endDate")
          .exec()
      : [],
    roomIds.length > 0
      ? BookingItemModel.find({
          roomId: { $in: roomIds },
          checkIn: { $lt: rangeEnd },
          checkOut: { $gt: from },
        })
          .select("bookingId roomId checkIn checkOut")
          .exec()
      : [],
  ]);

  const now = new Date();
  const blockerIds = new Set<string>();
  if (items.length > 0) {
    const bookingIds = [...new Set(items.map((item) => item.bookingId.toString()))];
    const blockers = await BookingModel.find({
      _id: { $in: bookingIds },
      $or: [
        { status: { $in: INVENTORY_BLOCKING_STATUSES } },
        { status: { $in: HOLD_STATUSES }, "hold.expiresAt": { $gt: now } },
      ],
    })
      .select("_id")
      .exec();
    for (const booking of blockers) blockerIds.add(booking._id.toString());
  }

  // roomId -> set of occupied day keys (bookings).
  const bookedDays = new Map<string, Set<string>>();
  for (const item of items) {
    if (!blockerIds.has(item.bookingId.toString()) || !item.roomId) continue;
    const key = item.roomId.toString();
    let set = bookedDays.get(key);
    if (!set) {
      set = new Set();
      bookedDays.set(key, set);
    }
    for (const day of occupiedDayKeys(item.checkIn, item.checkOut)) set.add(day);
  }
  // roomId -> set of blocked day keys (manual blocks).
  const blockedDays = new Map<string, Set<string>>();
  for (const block of blocks) {
    const key = block.roomId.toString();
    let set = blockedDays.get(key);
    if (!set) {
      set = new Set();
      blockedDays.set(key, set);
    }
    for (const day of occupiedDayKeys(block.startDate, block.endDate)) set.add(day);
  }
  // Holds live in cache — overlay per day.
  const heldDays = new Map<string, Set<string>>();
  for (const room of rooms) {
    for (const hold of readRoomHolds(room.id)) {
      let set = heldDays.get(room.id);
      if (!set) {
        set = new Set();
        heldDays.set(room.id, set);
      }
      for (const day of occupiedDayKeys(new Date(hold.checkIn), new Date(hold.checkOut))) {
        set.add(day);
      }
    }
  }

  const dayKeys: string[] = [];
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    dayKeys.push(toDayKey(cursor));
    cursor.setTime(cursor.getTime() + DAY_MS);
  }

  const roomsByType = new Map<string, typeof rooms>();
  for (const room of rooms) {
    const list = roomsByType.get(room.roomTypeId) ?? [];
    list.push(room);
    roomsByType.set(room.roomTypeId, list);
  }

  // Cheapest nightly price + minimum stay per room-type per day
  // (ACTIVE plans + daily overrides). Best-effort overlay only.
  const priceByTypeDay = new Map<
    string,
    Map<string, { price: number; currency: string; minNights: number | null }>
  >();
  try {
    const { DailyPriceModel } = await import("../ratePlans/daily-price.model");
    const { listRatePlans } = await import("../ratePlans/rate-plan.repository");
    for (const type of types) {
      const plansPage = await listRatePlans({ page: 1, limit: 50, roomTypeId: type.id, status: "ACTIVE" });
      const active = plansPage.data.filter((p) => p.pricing.type === "PER_NIGHT");
      const perDay = new Map<string, { price: number; currency: string; minNights: number | null }>();
      if (active.length > 0) {
        const rangeEnd = new Date(to.getTime() + DAY_MS);
        const overrides = await DailyPriceModel.find({
          ratePlanId: { $in: active.map((p) => p.id) },
          date: { $gte: from, $lt: rangeEnd },
        })
          .select("ratePlanId date price")
          .exec();
        const overrideByPlanDay = new Map<string, number>();
        for (const o of overrides) {
          overrideByPlanDay.set(`${o.ratePlanId.toString()}|${o.date.toISOString().slice(0, 10)}`, o.price);
        }
        const inWindow = (day: string, validFrom: Date | null, validUntil: Date | null): boolean => {
          if (validFrom && day < validFrom.toISOString().slice(0, 10)) return false;
          if (validUntil && day > validUntil.toISOString().slice(0, 10)) return false;
          return true;
        };
        for (const day of dayKeys) {
          let best: { price: number; currency: string } | null = null;
          let minNights: number | null = null;
          for (const plan of active) {
            const price = overrideByPlanDay.get(`${plan.id}|${day}`) ?? plan.pricing.amount;
            if (!best || price < best.price) best = { price, currency: plan.pricing.currency };
            const rule = plan.restrictions.minNights;
            if (rule != null && inWindow(day, plan.restrictions.validFrom, plan.restrictions.validUntil)) {
              minNights = minNights == null ? rule : Math.min(minNights, rule);
            }
          }
          if (best) perDay.set(day, { ...best, minNights });
        }
      }
      priceByTypeDay.set(type.id, perDay);
    }
  } catch {
    // Pricing overlay is best-effort; availability counts stay authoritative.
  }

  return {
    from: toDayKey(from),
    to: toDayKey(to),
    types: types.map((type) => {
      const typeRooms = roomsByType.get(type.id) ?? [];
      const perDay = priceByTypeDay.get(type.id);
      return {
        roomTypeId: type.id,
        name: type.name,
        days: dayKeys.map((day) => {
          let booked = 0;
          let blocked = 0;
          for (const room of typeRooms) {
            if (bookedDays.get(room.id)?.has(day) || heldDays.get(room.id)?.has(day)) {
              booked += 1;
            } else if (blockedDays.get(room.id)?.has(day)) {
              blocked += 1;
            }
          }
          const total = typeRooms.length;
          const priced = perDay?.get(day);
          return {
            date: day,
            total,
            available: total - booked - blocked,
            booked,
            blocked,
            price: priced?.price ?? null,
            currency: priced?.currency,
            minNights: priced?.minNights ?? null,
          };
        }),
      };
    }),
  };
}
