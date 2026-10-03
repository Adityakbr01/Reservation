import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { ROOM_STATUSES } from "./room.types";

export const createRoomSchema = z.object({
  roomTypeId: objectIdSchema,
  name: z.string().trim().min(1).max(80),
  roomNumber: z.string().trim().min(1).max(20),
  floor: z.string().trim().max(20).nullable().optional(),
  status: z.enum(ROOM_STATUSES).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const listRoomsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  roomTypeId: objectIdSchema.optional(),
  status: z.enum(ROOM_STATUSES).optional(),
});

export const roomIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
