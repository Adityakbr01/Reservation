import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import { deleteDailyPrice, listDailyPrices, upsertDailyPrices } from "./daily-price.service";
import type { ListDailyPricesQuery, UpsertDailyPricesInput } from "./daily-price.schema";

/** GET /api/v1/admin/rate-plans/:id/prices?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const listDailyPricesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListDailyPricesQuery;
  const result = await listDailyPrices(req.params.id as string, query.from, query.to);
  res.status(200).json({ success: true, data: result });
});

/** PUT /api/v1/admin/rate-plans/:id/prices — bulk upsert ≤62 days */
export const upsertDailyPricesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await upsertDailyPrices(req.params.id as string, req.body as UpsertDailyPricesInput);
  await recordAudit(req, "RATE_PLAN_SAVED", "rate-plan-daily-price", {
    entityId: req.params.id as string,
    after: { days: (req.body as UpsertDailyPricesInput).prices?.length ?? 0 },
  });
  res.status(200).json({ success: true, data: result });
});

/** DELETE /api/v1/admin/rate-plans/:id/prices/:date — reset day to base */
export const deleteDailyPriceHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteDailyPrice(req.params.id as string, req.params.date as string);
  await recordAudit(req, "RATE_PLAN_SAVED", "rate-plan-daily-price", {
    entityId: req.params.id as string,
    after: { resetDate: req.params.date },
  });
  res.status(200).json({ success: true, data: result });
});
