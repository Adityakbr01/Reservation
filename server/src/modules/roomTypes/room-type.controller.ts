import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import {
  createRoomTypeRecord,
  getPublicRoomType,
  getRoomType,
  listPublicRoomTypes,
  listRoomTypeRecords,
  updateRoomTypeRecord,
} from "./room-type.service";
import type {
  CreateRoomTypeInput,
  ListRoomTypesQuery,
  PublicRoomTypesQuery,
  UpdateRoomTypeInput,
} from "./room-type.schema";

/** POST /api/v1/admin/room-types — 201. */
export const createRoomTypeHandler = asyncHandler(async (req: Request, res: Response) => {
  const roomType = await createRoomTypeRecord(req.body as CreateRoomTypeInput);
  await recordAudit(req, "ROOM_TYPE_SAVED", "room-type", {
    entityId: roomType.id,
    after: { name: roomType.name, status: roomType.status },
  });
  res.status(201).json({ success: true, data: roomType });
});

/** GET /api/v1/admin/room-types — standard paginated list contract. */
export const listRoomTypesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListRoomTypesQuery;
  const result = await listRoomTypeRecords(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/v1/admin/room-types/:id. */
export const getRoomTypeHandler = asyncHandler(async (req: Request, res: Response) => {
  const roomType = await getRoomType(req.params.id as string);
  res.status(200).json({ success: true, data: roomType });
});

/** PATCH /api/v1/admin/room-types/:id. */
export const updateRoomTypeHandler = asyncHandler(async (req: Request, res: Response) => {
  const roomType = await updateRoomTypeRecord(
    req.params.id as string,
    req.body as UpdateRoomTypeInput,
  );
  await recordAudit(req, "ROOM_TYPE_SAVED", "room-type", {
    entityId: roomType.id,
    after: { name: roomType.name, status: roomType.status },
  });
  res.status(200).json({ success: true, data: roomType });
});

/** GET /api/public/room-types — ACTIVE only. */
export const listPublicRoomTypesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as PublicRoomTypesQuery;
  const result = await listPublicRoomTypes(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/public/room-types/:slug — ACTIVE only. */
export const getPublicRoomTypeHandler = asyncHandler(async (req: Request, res: Response) => {
  const roomType = await getPublicRoomType(req.params.slug as string);
  res.status(200).json({ success: true, data: roomType });
});
