import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import { listAdminNotifications, retryAdminNotification } from "./notification.service";
import type { AdminNotificationsQuery } from "./notification.schema";

/** GET /api/v1/admin/notifications — queue monitor (docs 07 §70-72). */
export const adminListNotificationsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = (req as Request & RequestWithValidatedQuery)
      .validatedQuery as AdminNotificationsQuery;
    const result = await listAdminNotifications(query);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  },
);

/** POST /api/v1/admin/notifications/:id/retry — requeue a FAILED row. */
export const adminRetryNotificationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const notification = await retryAdminNotification(req.params.id as string);
    await recordAudit(req, "NOTIFICATION_RETRIED", "notification", {
      entityId: notification.id,
      after: { type: notification.type, recipient: notification.recipient },
    });
    res.status(200).json({ success: true, data: notification });
  },
);
