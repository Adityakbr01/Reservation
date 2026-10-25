import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { AvailabilityBlock } from "./availability-block.types";

export interface AvailabilityBlockDocLike extends AvailabilityBlock {
  _id: { toString(): string };
}

export function toAvailabilityBlock(doc: any): AvailabilityBlock {
  return {
    id: doc.id ?? doc._id?.toString(),
    propertyId: typeof doc.propertyId === "object" ? doc.propertyId.toString() : doc.propertyId,
    roomId: typeof doc.roomId === "object" ? doc.roomId.toString() : doc.roomId,
    startDate: doc.startDate,
    endDate: doc.endDate,
    reason: doc.reason ?? null,
    createdBy: typeof doc.createdBy === "object" ? doc.createdBy?.toString() : (doc.createdBy ?? ""),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateBlockInput {
  propertyId: string;
  roomId: string;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
  createdBy: string;
}

export async function createBlock(input: CreateBlockInput): Promise<AvailabilityBlockDocLike> {
  const id = newId();
  const block = await prisma.availabilityBlock.create({
    data: {
      id,
      propertyId: input.propertyId,
      roomId: input.roomId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason ?? null,
      createdBy: input.createdBy || null,
    },
  });
  return {
    ...toAvailabilityBlock(block),
    _id: { toString: () => block.id },
  };
}

export async function findBlockById(id: string): Promise<AvailabilityBlock | null> {
  const doc = await prisma.availabilityBlock.findUnique({ where: { id } });
  return doc ? toAvailabilityBlock(doc) : null;
}

/**
 * Room ids blocked for any night of [checkIn, checkOut).
 * DB-level overlap predicate: blockStart < reqOut && blockEnd > reqIn.
 */
export async function findOverlappingBlockedRoomIds(
  checkIn: Date,
  checkOut: Date,
): Promise<Set<string>> {
  const docs = await prisma.availabilityBlock.findMany({
    where: {
      startDate: { lte: checkOut },
      endDate: { gt: checkIn },
    },
    select: { roomId: true },
  });
  return new Set(docs.map((doc) => doc.roomId));
}

export async function findBlocksForRooms(
  roomIds: string[],
  startDateLt: Date,
  endDateGt: Date,
): Promise<Array<{ roomId: string; startDate: Date; endDate: Date }>> {
  if (roomIds.length === 0) return [];
  return prisma.availabilityBlock.findMany({
    where: {
      roomId: { in: roomIds },
      startDate: { lt: startDateLt },
      endDate: { gt: endDateGt },
    },
    select: { roomId: true, startDate: true, endDate: true },
  });
}

export interface ListBlocksFilter extends PaginationQuery {
  roomId?: string;
  roomIds?: string[];
  from?: Date;
  to?: Date;
}

export async function listBlocks(filter: ListBlocksFilter): Promise<Paginated<AvailabilityBlock>> {
  const { page, limit, roomId, roomIds, from, to } = filter;
  const where: any = {};
  if (roomId) where.roomId = roomId;
  else if (roomIds && roomIds.length > 0) where.roomId = { in: roomIds };
  if (from || to) {
    where.startDate = {};
    if (from) where.startDate.gte = from;
    if (to) where.startDate.lte = to;
  }
  const [total, docs] = await Promise.all([
    prisma.availabilityBlock.count({ where }),
    prisma.availabilityBlock.findMany({
      where,
      orderBy: { startDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toAvailabilityBlock),
    page,
    limit,
    total,
  );
}

export async function deleteBlockById(id: string): Promise<boolean> {
  try {
    await prisma.availabilityBlock.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
