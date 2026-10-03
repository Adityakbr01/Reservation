import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { idParamsSchema } from "../../utils/validators";
import {
  createCouponHandler,
  getCouponHandler,
  listCouponsHandler,
  updateCouponHandler,
  validateCouponHandler,
} from "./coupon.controller";
import {
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupon.schema";

export const adminCouponsRouter = Router();

adminCouponsRouter.use(authenticate, authorize("admin"));
adminCouponsRouter.get("/", validate({ query: listCouponsQuerySchema }), listCouponsHandler);
adminCouponsRouter.post("/", validate({ body: createCouponSchema }), createCouponHandler);
adminCouponsRouter.get("/:id", validate({ params: idParamsSchema }), getCouponHandler);
adminCouponsRouter.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateCouponSchema }),
  updateCouponHandler,
);

export const publicCouponsRouter = Router();

publicCouponsRouter.post(
  "/validate",
  validate({ body: validateCouponSchema }),
  validateCouponHandler,
);
