import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { idParamsSchema } from "../../utils/validators";
import {
  createRatePlanHandler,
  getRatePlanHandler,
  listRatePlansHandler,
  updateRatePlanHandler,
} from "./rate-plan.controller";
import {
  createRatePlanSchema,
  listRatePlansQuerySchema,
  updateRatePlanSchema,
} from "./rate-plan.schema";

export const adminRatePlansRouter = Router();

adminRatePlansRouter.use(authenticate, authorize("admin"));
adminRatePlansRouter.get("/", validate({ query: listRatePlansQuerySchema }), listRatePlansHandler);
adminRatePlansRouter.post("/", validate({ body: createRatePlanSchema }), createRatePlanHandler);
adminRatePlansRouter.get("/:id", validate({ params: idParamsSchema }), getRatePlanHandler);
adminRatePlansRouter.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateRatePlanSchema }),
  updateRatePlanHandler,
);
