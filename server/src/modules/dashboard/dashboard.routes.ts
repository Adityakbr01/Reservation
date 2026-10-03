import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { adminDashboardSummaryHandler } from "./dashboard.controller";
import { adminSalesReportHandler } from "./sales.controller";

export const adminDashboardRouter = Router();

adminDashboardRouter.use(authenticate, authorize("admin"));
adminDashboardRouter.get("/summary", adminDashboardSummaryHandler);
adminDashboardRouter.get("/sales", adminSalesReportHandler);
