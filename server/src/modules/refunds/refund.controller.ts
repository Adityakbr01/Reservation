import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { listAllRefunds } from "./refund.service";
import type { AdminRefundsQuery } from "./refund.schema";

/** GET /api/v1/admin/refunds — standard paginated list contract. */
export const adminListRefundsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as AdminRefundsQuery;
  const result = await listAllRefunds(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});
