import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { getPaymentAdmin, listAllPayments } from "./payment.service";
import type { AdminPaymentsQuery } from "./payment.schema";

/** GET /api/v1/admin/payments — standard paginated list contract. */
export const adminListPaymentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as AdminPaymentsQuery;
  const result = await listAllPayments(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/v1/admin/payments/:id — deep view (docs 07 §48). */
export const adminGetPaymentHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getPaymentAdmin(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});
