import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { AUDIT_ACTIONS } from "./audit.model";

export const adminAuditLogsQuerySchema = paginationQuerySchema.extend({
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(80).optional(),
});

export type AdminAuditLogsQuery = z.infer<typeof adminAuditLogsQuerySchema>;
