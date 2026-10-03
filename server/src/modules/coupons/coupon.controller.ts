import type { Request, Response } from "express";
import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import {
  createCouponRecord,
  getCoupon,
  listCouponRecords,
  updateCouponRecord,
  validateCouponCode,
} from "./coupon.service";
import type {
  CreateCouponInput,
  ListCouponsQuery,
  UpdateCouponInput,
  ValidateCouponInput,
} from "./coupon.schema";

/** POST /api/v1/admin/coupons — 201. */
export const createCouponHandler = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await createCouponRecord(req.body as CreateCouponInput, requireUser(req).id);
  await recordAudit(req, "COUPON_CREATED", "coupon", {
    entityId: coupon.id,
    after: { code: coupon.code, status: coupon.status },
  });
  res.status(201).json({ success: true, data: coupon });
});

/** GET /api/v1/admin/coupons — standard paginated list contract. */
export const listCouponsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListCouponsQuery;
  const result = await listCouponRecords(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/v1/admin/coupons/:id. */
export const getCouponHandler = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await getCoupon(req.params.id as string);
  res.status(200).json({ success: true, data: coupon });
});

/** PATCH /api/v1/admin/coupons/:id. */
export const updateCouponHandler = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await updateCouponRecord(req.params.id as string, req.body as UpdateCouponInput);
  if ((req.body as UpdateCouponInput).status === "INACTIVE") {
    await recordAudit(req, "COUPON_DISABLED", "coupon", {
      entityId: coupon.id,
      after: { code: coupon.code, status: coupon.status },
    });
  }
  res.status(200).json({ success: true, data: coupon });
});

/**
 * POST /api/public/coupons/validate — always 200 with a validity flag.
 * Form-friendly by design: invalid codes are data, not errors.
 */
export const validateCouponHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await validateCouponCode(req.body as ValidateCouponInput);
  res.status(200).json({ success: true, data: result });
});
