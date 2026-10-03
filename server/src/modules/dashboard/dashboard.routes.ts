import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { adminDashboardSummaryHandler } from "./dashboard.controller";

export const adminDashboardRouter = Router();

adminDashboardRouter.use(authenticate, authorize("admin"));
adminDashboardRouter.get("/summary", adminDashboardSummaryHandler);
