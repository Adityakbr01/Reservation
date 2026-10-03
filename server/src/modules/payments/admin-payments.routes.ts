import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { adminGetPaymentHandler, adminListPaymentsHandler } from "./admin-payments.controller";
import { adminPaymentsQuerySchema, paymentIdParamsSchema } from "./payment.schema";

export const adminPaymentsRouter = Router();

adminPaymentsRouter.use(authenticate, authorize("admin"));
adminPaymentsRouter.get("/", validate({ query: adminPaymentsQuerySchema }), adminListPaymentsHandler);
adminPaymentsRouter.get(
  "/:id",
  validate({ params: paymentIdParamsSchema }),
  adminGetPaymentHandler,
);
