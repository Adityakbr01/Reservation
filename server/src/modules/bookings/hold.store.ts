import { cacheStore } from "../../config/cache";

const HOLD_TTL_SECONDS = 15 * 60;

export interface HoldRange {
  checkIn: string;
  checkOut: string;
  holdId: string;
}

export function roomHoldKey(roomId: string): string {
  return `hold:room:${roomId}`;
}

export function readRoomHolds(roomId: string): HoldRange[] {
  const stored = cacheStore.get<unknown>(roomHoldKey(roomId));
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (entry): entry is HoldRange =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as HoldRange).checkIn === "string" &&
      typeof (entry as HoldRange).checkOut === "string" &&
      typeof (entry as HoldRange).holdId === "string",
  );
}

function rangesOverlap(aIn: number, aOut: number, bIn: number, bOut: number): boolean {
  return aIn < bOut && aOut > bIn;
}

export function writeRoomHold(roomId: string, range: HoldRange): void {
  const existing = readRoomHolds(roomId).filter((hold) => hold.holdId !== range.holdId);
  existing.push(range);
  cacheStore.set(roomHoldKey(roomId), existing, HOLD_TTL_SECONDS);
}

export function releaseBookingHolds(roomIds: string[], holdId: string): void {
  for (const roomId of roomIds) {
    const remaining = readRoomHolds(roomId).filter((hold) => hold.holdId !== holdId);
    if (remaining.length === 0) {
      cacheStore.del(roomHoldKey(roomId));
    } else {
      cacheStore.set(roomHoldKey(roomId), remaining, HOLD_TTL_SECONDS);
    }
  }
}

/** Rooms with a live cache hold overlapping the requested range. */
export function findHeldRoomIds(roomIds: string[], checkIn: Date, checkOut: Date): Set<string> {
  const blocked = new Set<string>();
  const reqIn = checkIn.getTime();
  const reqOut = checkOut.getTime();
  for (const roomId of roomIds) {
    const hit = readRoomHolds(roomId).some((hold) =>
      rangesOverlap(
        new Date(hold.checkIn).getTime(),
        new Date(hold.checkOut).getTime(),
        reqIn,
        reqOut,
      ),
    );
    if (hit) blocked.add(roomId);
  }
  return blocked;
}
