import { AppError } from "../../utils/app-error";
import type { Paginated } from "../../utils/pagination";
import { ensureProperty } from "../properties/property.service";
import { findRoomById } from "../rooms/room.repository";
import { createBlock, deleteBlockById, findBlockById, listBlocks } from "./availability-block.repository";
import type { CreateBlockInput, ListBlocksQuery } from "./availability.schema";
import type { AvailabilityBlock } from "./availability-block.types";

export async function createBlockRecord(
  input: CreateBlockInput,
  createdBy: string,
): Promise<AvailabilityBlock> {
  const property = await ensureProperty();
  const room = await findRoomById(input.roomId);
  if (!room || room.propertyId !== property.id) {
    throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
  }
  if (input.startDate.getTime() >= input.endDate.getTime()) {
    throw new AppError("Block end date must be after start date", 400, "INVALID_DATE_RANGE");
  }
  const doc = await createBlock({
    propertyId: property.id,
    roomId: input.roomId,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason ?? null,
    createdBy,
  });
  const created = await findBlockById(doc._id.toString());
  if (!created) {
    throw new AppError("Block could not be created", 500, "BLOCK_CREATE_FAILED");
  }
  return created;
}

export async function listBlockRecords(query: ListBlocksQuery): Promise<Paginated<AvailabilityBlock>> {
  return listBlocks(query);
}

export async function deleteBlockRecord(id: string): Promise<void> {
  const deleted = await deleteBlockById(id);
  if (!deleted) {
    throw new AppError("Block not found", 404, "BLOCK_NOT_FOUND");
  }
}
