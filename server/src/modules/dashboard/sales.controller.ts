import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { getSalesReport } from "./sales.service";
import type { SalesRange } from "./sales.service";

/** GET /api/v1/admin/dashboard/sales?range=today|week|month */
export const adminSalesReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const raw = typeof req.query.range === "string" ? req.query.range : "week";
  const range: SalesRange = raw === "today" || raw === "month" ? raw : "week";
  const report = await getSalesReport(range);
  res.status(200).json({ success: true, data: report });
});
