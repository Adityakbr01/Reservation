import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { adminListRefundsHandler } from "./refund.controller";
import { adminRefundsQuerySchema } from "./refund.schema";

export const adminRefundsRouter = Router();

adminRefundsRouter.use(authenticate, authorize("admin"));
adminRefundsRouter.get("/", validate({ query: adminRefundsQuerySchema }), adminListRefundsHandler);
