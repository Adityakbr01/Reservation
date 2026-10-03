import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { adminListPaymentsHandler } from "./admin-payments.controller";
import { adminPaymentsQuerySchema } from "./payment.schema";

export const adminPaymentsRouter = Router();

adminPaymentsRouter.use(authenticate, authorize("admin"));
adminPaymentsRouter.get("/", validate({ query: adminPaymentsQuerySchema }), adminListPaymentsHandler);
