import type { QueryFilter } from "mongoose";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { AvailabilityBlockModel } from "./availability-block.model";
import type { AvailabilityBlockDocument } from "./availability-block.model";
import type { AvailabilityBlock } from "./availability-block.types";

export function toAvailabilityBlock(doc: AvailabilityBlockDocument): AvailabilityBlock {
  return {
    id: doc._id.toString(),
    propertyId: doc.propertyId.toString(),
    roomId: doc.roomId.toString(),
    startDate: doc.startDate,
    endDate: doc.endDate,
    reason: doc.reason,
    createdBy: doc.createdBy.toString(),
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

export async function createBlock(input: CreateBlockInput): Promise<AvailabilityBlockDocument> {
  return AvailabilityBlockModel.create(input);
}

export async function findBlockById(id: string): Promise<AvailabilityBlock | null> {
  const doc = await AvailabilityBlockModel.findById(id).exec();
  return doc ? toAvailabilityBlock(doc) : null;
}

export interface ListBlocksFilter extends PaginationQuery {
  roomId?: string;
  from?: Date;
  to?: Date;
}

export async function listBlocks(filter: ListBlocksFilter): Promise<Paginated<AvailabilityBlock>> {
  const { page, limit, roomId, from, to } = filter;
  const query: QueryFilter<AvailabilityBlockDocument> = {};
  if (roomId) query.roomId = roomId;
  if (from || to) {
    query.startDate = {};
    if (from) query.startDate.$gte = from;
    if (to) query.startDate.$lte = to;
  }
  const [total, docs] = await Promise.all([
    AvailabilityBlockModel.countDocuments(query).exec(),
    AvailabilityBlockModel.find(query)
      .sort({ startDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toAvailabilityBlock(doc)),
    page,
    limit,
    total,
  );
}

export async function deleteBlockById(id: string): Promise<boolean> {
  const result = await AvailabilityBlockModel.deleteOne({ _id: id }).exec();
  return result.deletedCount === 1;
}
