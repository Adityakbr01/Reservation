import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import {
  createRatePlanRecord,
  getRatePlan,
  listRatePlanRecords,
  updateRatePlanRecord,
} from "./rate-plan.service";
import type {
  CreateRatePlanInput,
  ListRatePlansQuery,
  UpdateRatePlanInput,
} from "./rate-plan.schema";

/** POST /api/v1/admin/rate-plans — 201. */
export const createRatePlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const ratePlan = await createRatePlanRecord(req.body as CreateRatePlanInput);
  res.status(201).json({ success: true, data: ratePlan });
});

/** GET /api/v1/admin/rate-plans — standard paginated list contract. */
export const listRatePlansHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListRatePlansQuery;
  const result = await listRatePlanRecords(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/v1/admin/rate-plans/:id. */
export const getRatePlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const ratePlan = await getRatePlan(req.params.id as string);
  res.status(200).json({ success: true, data: ratePlan });
});

/** PATCH /api/v1/admin/rate-plans/:id. */
export const updateRatePlanHandler = asyncHandler(async (req: Request, res: Response) => {
  const ratePlan = await updateRatePlanRecord(
    req.params.id as string,
    req.body as UpdateRatePlanInput,
  );
  res.status(200).json({ success: true, data: ratePlan });
});
