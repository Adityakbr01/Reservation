import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import { createRoomRecord, getRoom, listRoomRecords, updateRoomRecord } from "./room.service";
import type { CreateRoomInput, ListRoomsQuery, UpdateRoomInput } from "./room.schema";

/** POST /api/v1/admin/rooms — 201. */
export const createRoomHandler = asyncHandler(async (req: Request, res: Response) => {
  const room = await createRoomRecord(req.body as CreateRoomInput);
  await recordAudit(req, "ROOM_SAVED", "room", {
    entityId: room.id,
    after: { roomNumber: room.roomNumber, status: room.status },
  });
  res.status(201).json({ success: true, data: room });
});

/** GET /api/v1/admin/rooms — standard paginated list contract. */
export const listRoomsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListRoomsQuery;
  const result = await listRoomRecords(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/v1/admin/rooms/:id. */
export const getRoomHandler = asyncHandler(async (req: Request, res: Response) => {
  const room = await getRoom(req.params.id as string);
  res.status(200).json({ success: true, data: room });
});

/** PATCH /api/v1/admin/rooms/:id. */
export const updateRoomHandler = asyncHandler(async (req: Request, res: Response) => {
  const room = await updateRoomRecord(req.params.id as string, req.body as UpdateRoomInput);
  await recordAudit(req, "ROOM_SAVED", "room", {
    entityId: room.id,
    after: { roomNumber: room.roomNumber, status: room.status },
  });
  res.status(200).json({ success: true, data: room });
});
