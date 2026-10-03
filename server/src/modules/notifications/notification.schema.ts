import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES } from "./notification.types";

export const adminNotificationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export type AdminNotificationsQuery = z.infer<typeof adminNotificationsQuerySchema>;

export const notificationIdParamsSchema = z.object({
  id: objectIdSchema,
});

export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
