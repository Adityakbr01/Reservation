import { AppError } from "../../utils/app-error";
import { isValidStayRange } from "../../utils/availability";
import { isDuplicateKeyError } from "../../utils/mongo";
import type { Paginated } from "../../utils/pagination";
import { prisma } from "../../config/database";
import { findOverlappingBlockedRoomIds } from "../availability/availability-block.repository";
import { findHeldRoomIds } from "../bookings/hold.store";
import { ensureProperty } from "../properties/property.service";
import { findRoomTypeById } from "../roomTypes/room-type.repository";
import { createRoom, findRoomById, listRooms, updateRoomById } from "./room.repository";
import type { CreateRoomInput, ListRoomsQuery, UpdateRoomInput } from "./room.schema";
import type { Room } from "./room.types";

async function resolveRoomType(roomTypeId: string, propertyId: string): Promise<void> {
  const roomType = await findRoomTypeById(roomTypeId);
  if (!roomType || roomType.propertyId !== propertyId) {
    throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
  }
}

export async function createRoomRecord(input: CreateRoomInput): Promise<Room> {
  const property = await ensureProperty();
  await resolveRoomType(input.roomTypeId, property.id);
  try {
    const doc = await createRoom({ ...input, propertyId: property.id });
    const created = await findRoomById(doc._id.toString());
    if (!created) {
      throw new AppError("Room could not be created", 500, "ROOM_CREATE_FAILED");
    }
    return created;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A room with this number already exists", 409, "ROOM_EXISTS");
    }
    throw error;
  }
}

export async function getRoom(id: string): Promise<Room> {
  const room = await findRoomById(id);
  if (!room) {
    throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
  }
  return room;
}

export async function updateRoomRecord(id: string, input: UpdateRoomInput): Promise<Room> {
  const current = await getRoom(id);
  if (input.roomTypeId) {
    await resolveRoomType(input.roomTypeId, current.propertyId);
  }
  try {
    const updated = await updateRoomById(id, input);
    if (!updated) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }
    return updated;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A room with this number already exists", 409, "ROOM_EXISTS");
    }
    throw error;
  }
}

export async function listRoomRecords(query: ListRoomsQuery): Promise<Paginated<Room>> {
  return listRooms(query);
}

export type RoomOccupancyStatus = "FREE" | "OCCUPIED" | "BLOCKED" | "HELD";

export interface RoomOccupancy {
  roomId: string;
  status: RoomOccupancyStatus;
  bookingNumber: string | null;
}

/**
 * Live per-room occupancy for the admin rooms list: manual blocks,
 * confirmed/checked-in stays, and live payment holds for a date range.
 */
export async function getRoomsOccupancy(checkIn: Date, checkOut: Date): Promise<RoomOccupancy[]> {
  if (!isValidStayRange(checkIn, checkOut)) {
    throw new AppError("Check-out must be after check-in", 400, "INVALID_DATE_RANGE");
  }
  const page = await listRooms({ page: 1, limit: 2000 });
  const rooms = page.data;
  const ids = rooms.map((room) => room.id);
  const [blocked, bookings] = await Promise.all([
    findOverlappingBlockedRoomIds(checkIn, checkOut),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true, bookingNumber: true },
    }),
  ]);
  const bookedByRoom = new Map<string, string>();
  if (bookings.length > 0 && ids.length > 0) {
    const items = await prisma.bookingItem.findMany({
      where: {
        bookingId: { in: bookings.map((b) => b.id) },
        roomId: { in: ids },
      },
      select: { roomId: true, bookingId: true },
    });
    const numbers = new Map(bookings.map((b) => [b.id, b.bookingNumber]));
    for (const item of items) {
      if (!item.roomId) continue;
      const key = item.roomId;
      if (!bookedByRoom.has(key)) {
        bookedByRoom.set(key, numbers.get(item.bookingId) ?? "—");
      }
    }
  }
  const held = ids.length > 0 ? findHeldRoomIds(ids, checkIn, checkOut) : new Set<string>();
  return rooms.map((room) => {
    if (blocked.has(room.id))
      return { roomId: room.id, status: "BLOCKED" as RoomOccupancyStatus, bookingNumber: null };
    const bookingNumber = bookedByRoom.get(room.id) ?? null;
    if (bookingNumber)
      return { roomId: room.id, status: "OCCUPIED" as RoomOccupancyStatus, bookingNumber };
    if (held.has(room.id))
      return { roomId: room.id, status: "HELD" as RoomOccupancyStatus, bookingNumber: null };
    return { roomId: room.id, status: "FREE" as RoomOccupancyStatus, bookingNumber: null };
  });
}
