import { AppError } from "../../utils/app-error";
import type { Paginated } from "../../utils/pagination";
import { toUtcMidnight } from "../../utils/date";
import { ensureProperty } from "../properties/property.service";
import { findRoomById, listRooms } from "../rooms/room.repository";
import { createBlock, deleteBlockById, findBlockById, listBlocks } from "./availability-block.repository";
import type { CreateBlockInput, ListBlocksQuery } from "./availability.schema";
import type { AvailabilityBlock } from "./availability-block.types";

export async function createBlockRecord(
  input: CreateBlockInput,
  createdBy: string,
): Promise<AvailabilityBlock | AvailabilityBlock[]> {
  const property = await ensureProperty();
  const startDate = toUtcMidnight(input.startDate);
  const endDate = toUtcMidnight(input.endDate);
  if (startDate.getTime() >= endDate.getTime()) {
    throw new AppError("Block end date must be after start date", 400, "INVALID_DATE_RANGE");
  }

  if (input.roomTypeId) {
    const roomsPage = await listRooms({ page: 1, limit: 1000, roomTypeId: input.roomTypeId });
    if (roomsPage.data.length === 0) {
      throw new AppError("No rooms found for this cottage", 404, "ROOM_NOT_FOUND");
    }
    const createdList: AvailabilityBlock[] = [];
    for (const room of roomsPage.data) {
      const doc = await createBlock({
        propertyId: property.id,
        roomId: room.id,
        startDate,
        endDate,
        reason: input.reason ?? null,
        createdBy,
      });
      const created = await findBlockById(doc._id.toString());
      if (created) createdList.push(created);
    }
    return createdList;
  }

  if (input.roomId) {
    const room = await findRoomById(input.roomId);
    if (!room || room.propertyId !== property.id) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }
    const doc = await createBlock({
      propertyId: property.id,
      roomId: input.roomId,
      startDate,
      endDate,
      reason: input.reason ?? null,
      createdBy,
    });
    const created = await findBlockById(doc._id.toString());
    if (!created) {
      throw new AppError("Block could not be created", 500, "BLOCK_CREATE_FAILED");
    }
    return created;
  }

  throw new AppError("roomId or roomTypeId is required", 400, "INVALID_INPUT");
}

export async function listBlockRecords(query: ListBlocksQuery): Promise<Paginated<AvailabilityBlock>> {
  if (query.roomTypeId && !query.roomId) {
    const roomsPage = await listRooms({ page: 1, limit: 1000, roomTypeId: query.roomTypeId });
    const roomIds = roomsPage.data.map((r) => r.id);
    return listBlocks({ ...query, roomIds });
  }
  return listBlocks(query);
}

export async function deleteBlockRecord(id: string): Promise<void> {
  const deleted = await deleteBlockById(id);
  if (!deleted) {
    throw new AppError("Block not found", 404, "BLOCK_NOT_FOUND");
  }
}
