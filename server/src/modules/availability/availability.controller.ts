import type { Request, Response } from "express";
import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import {
  createBlockRecord,
  deleteBlockRecord,
  listBlockRecords,
} from "./availability.service";
import { searchAvailability } from "./search.service";
import type { CreateBlockInput, ListBlocksQuery } from "./availability.schema";
import type { SearchAvailabilityInput } from "./search.schema";

/** GET /api/v1/admin/availability — standard paginated list contract. */
export const listBlocksHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListBlocksQuery;
  const result = await listBlockRecords(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** POST /api/v1/admin/availability/blocks — 201. */
export const createBlockHandler = asyncHandler(async (req: Request, res: Response) => {
  const block = await createBlockRecord(req.body as CreateBlockInput, requireUser(req).id);
  res.status(201).json({ success: true, data: block });
});

/** DELETE /api/v1/admin/availability/blocks/:id. */
export const deleteBlockHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteBlockRecord(req.params.id as string);
  res.status(200).json({ success: true, data: { deleted: true } });
});

/**
 * POST /api/public/availability/search — informational only, never a
 * reservation. Final availability recheck happens at booking/hold time.
 */
export const searchAvailabilityHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await searchAvailability(req.body as SearchAvailabilityInput);
  res.status(200).json({ success: true, data: result });
});
