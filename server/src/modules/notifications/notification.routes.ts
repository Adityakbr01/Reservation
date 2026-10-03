import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminListNotificationsHandler,
  adminRetryNotificationHandler,
} from "./notification.controller";
import {
  adminNotificationsQuerySchema,
  notificationIdParamsSchema,
} from "./notification.schema";

export const adminNotificationsRouter = Router();

adminNotificationsRouter.use(authenticate, authorize("admin"));
adminNotificationsRouter.get(
  "/",
  validate({ query: adminNotificationsQuerySchema }),
  adminListNotificationsHandler,
);
adminNotificationsRouter.post(
  "/:id/retry",
  validate({ params: notificationIdParamsSchema }),
  adminRetryNotificationHandler,
);
