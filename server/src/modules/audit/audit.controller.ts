import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { listAdminAuditLogs } from "./audit.service";
import type { AdminAuditLogsQuery } from "./audit.schema";

/** GET /api/v1/admin/audit-logs — immutable history (docs 07 §73-75). */
export const adminListAuditLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery)
    .validatedQuery as AdminAuditLogsQuery;
  const result = await listAdminAuditLogs(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});
