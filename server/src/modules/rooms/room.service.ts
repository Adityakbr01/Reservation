import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import type { Paginated } from "../../utils/pagination";
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
