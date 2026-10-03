import type { QueryFilter } from "mongoose";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { RoomModel } from "./room.model";
import type { RoomDocument } from "./room.model";
import type { Room, RoomStatus } from "./room.types";

export function toRoom(doc: RoomDocument): Room {
  return {
    id: doc._id.toString(),
    propertyId: doc.propertyId.toString(),
    roomTypeId: doc.roomTypeId.toString(),
    name: doc.name,
    roomNumber: doc.roomNumber,
    floor: doc.floor,
    status: doc.status,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateRoomInput {
  propertyId: string;
  roomTypeId: string;
  name: string;
  roomNumber: string;
  floor?: string | null;
  status?: RoomStatus;
  notes?: string | null;
}

export async function createRoom(input: CreateRoomInput): Promise<RoomDocument> {
  return RoomModel.create(input);
}

export async function findRoomById(id: string): Promise<Room | null> {
  const doc = await RoomModel.findById(id).exec();
  return doc ? toRoom(doc) : null;
}

export interface ListRoomsFilter extends PaginationQuery {
  q?: string;
  roomTypeId?: string;
  status?: RoomStatus;
}

export async function listRooms(filter: ListRoomsFilter): Promise<Paginated<Room>> {
  const { page, limit, q, roomTypeId, status } = filter;
  const query: QueryFilter<RoomDocument> = {};
  if (roomTypeId) query.roomTypeId = roomTypeId;
  if (status) query.status = status;
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { roomNumber: pattern }];
  }
  const [total, docs] = await Promise.all([
    RoomModel.countDocuments(query).exec(),
    RoomModel.find(query)
      .sort({ roomNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toRoom(doc)),
    page,
    limit,
    total,
  );
}

export type UpdateRoomInput = Partial<
  Pick<CreateRoomInput, "name" | "roomNumber" | "roomTypeId" | "floor" | "status" | "notes">
>;

export async function updateRoomById(id: string, input: UpdateRoomInput): Promise<Room | null> {
  const doc = await RoomModel.findByIdAndUpdate(id, input, { new: true }).exec();
  return doc ? toRoom(doc) : null;
}
