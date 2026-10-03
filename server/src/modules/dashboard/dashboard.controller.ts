import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { getDashboardSummary } from "./dashboard.service";

/** GET /api/v1/admin/dashboard/summary — ops cards (docs 07 §10-13). */
export const adminDashboardSummaryHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const summary = await getDashboardSummary();
    res.status(200).json({ success: true, data: summary });
  },
);
