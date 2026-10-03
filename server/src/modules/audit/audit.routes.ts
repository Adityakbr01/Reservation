import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { adminListAuditLogsHandler } from "./audit.controller";
import { adminAuditLogsQuerySchema } from "./audit.schema";

export const adminAuditRouter = Router();

adminAuditRouter.use(authenticate, authorize("admin"));
adminAuditRouter.get("/", validate({ query: adminAuditLogsQuerySchema }), adminListAuditLogsHandler);
