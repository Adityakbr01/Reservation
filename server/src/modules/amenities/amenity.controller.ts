import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import {
  createAmenityRecord,
  deleteAmenityRecord,
  getAmenity,
  listAmenityRecords,
  listPublicAmenities,
} from "./amenity.service";
import { updateAmenityRecord } from "./amenity.service";
import type { CreateAmenityInput, ListAmenitiesQuery, UpdateAmenityInput } from "./amenity.schema";

export const createAmenityHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await createAmenityRecord(req.body as CreateAmenityInput);
  await recordAudit(req, "AMENITY_SAVED", "amenity", { entityId: result.id, after: { name: result.name } });
  res.status(201).json({ success: true, data: result });
});

export const listAmenitiesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListAmenitiesQuery;
  const result = await listAmenityRecords(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const getAmenityHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getAmenity(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});

export const updateAmenityHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await updateAmenityRecord(req.params.id as string, req.body as UpdateAmenityInput);
  await recordAudit(req, "AMENITY_SAVED", "amenity", { entityId: result.id, after: { name: result.name } });
  res.status(200).json({ success: true, data: result });
});

export const deleteAmenityHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteAmenityRecord(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});

export const publicListAmenitiesHandler = asyncHandler(async (req: Request, res: Response) => {
  const group = typeof req.query.group === "string" ? req.query.group : undefined;
  const result = await listPublicAmenities(group as "HIGHLIGHT" | "FACILITY" | undefined);
  res.status(200).json({ success: true, data: result });
});
