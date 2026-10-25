import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { Room, RoomStatus } from "./room.types";

export interface RoomDocLike {
  id: string;
  _id: { toString(): string };
  propertyId: string;
  roomTypeId: string;
  name: string;
  roomNumber: string;
  floor: string | null;
  status: RoomStatus;
  condition: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toRoom(doc: any): Room {
  const id = doc.id ?? doc._id?.toString();
  const propertyId = typeof doc.propertyId === "object" ? doc.propertyId.toString() : doc.propertyId;
  const roomTypeId = typeof doc.roomTypeId === "object" ? doc.roomTypeId.toString() : doc.roomTypeId;
  return {
    id,
    propertyId,
    roomTypeId,
    name: doc.name,
    roomNumber: doc.roomNumber,
    floor: doc.floor ?? null,
    status: doc.status as RoomStatus,
    condition: doc.condition ?? null,
    notes: doc.notes ?? null,
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
  condition?: string | null;
  notes?: string | null;
}

export async function createRoom(input: CreateRoomInput): Promise<RoomDocLike> {
  const id = newId();
  const room = await prisma.room.create({
    data: {
      id,
      propertyId: input.propertyId,
      roomTypeId: input.roomTypeId,
      name: input.name,
      roomNumber: input.roomNumber,
      floor: input.floor ?? null,
      status: input.status ?? "ACTIVE",
      condition: input.condition ?? null,
      notes: input.notes ?? null,
    },
  });
  return {
    ...room,
    status: room.status as RoomStatus,
    _id: { toString: () => room.id },
  };
}

export async function findRoomById(id: string): Promise<Room | null> {
  const doc = await prisma.room.findUnique({ where: { id } });
  return doc ? toRoom(doc) : null;
}

export interface ListRoomsFilter extends PaginationQuery {
  q?: string;
  roomTypeId?: string;
  status?: RoomStatus;
}

export async function listRooms(filter: ListRoomsFilter): Promise<Paginated<Room>> {
  const { page, limit, q, roomTypeId, status } = filter;
  const where: any = {};
  if (roomTypeId) where.roomTypeId = roomTypeId;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { roomNumber: { contains: q } },
    ];
  }
  const [total, docs] = await Promise.all([
    prisma.room.count({ where }),
    prisma.room.findMany({
      where,
      orderBy: { roomNumber: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toRoom),
    page,
    limit,
    total,
  );
}

export type UpdateRoomInput = Partial<
  Pick<CreateRoomInput, "name" | "roomNumber" | "roomTypeId" | "floor" | "status" | "condition" | "notes">
>;

export async function updateRoomById(id: string, input: UpdateRoomInput): Promise<Room | null> {
  try {
    const doc = await prisma.room.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.roomNumber !== undefined ? { roomNumber: input.roomNumber } : {}),
        ...(input.roomTypeId !== undefined ? { roomTypeId: input.roomTypeId } : {}),
        ...(input.floor !== undefined ? { floor: input.floor } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.condition !== undefined ? { condition: input.condition } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
    return toRoom(doc);
  } catch {
    return null;
  }
}

export async function countActiveRoomsByRoomTypeId(roomTypeId: string): Promise<number> {
  return prisma.room.count({
    where: { roomTypeId, status: "ACTIVE" },
  });
}
