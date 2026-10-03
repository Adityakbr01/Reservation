import type { Request, Response } from "express";
import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { createPaymentIntent, getPayment } from "./payment.service";
import type { CreateIntentInput } from "./payment.schema";

/** POST /api/v1/payments/create-intent — 201 + clientSecret (or reused 200). */
export const createIntentHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateIntentInput;
  const result = await createPaymentIntent(requireUser(req).id, body.bookingId);
  res.status(result.reused ? 200 : 201).json({
    success: true,
    data: {
      paymentId: result.payment.id,
      clientSecret: result.clientSecret,
      reused: result.reused,
    },
  });
});

/** GET /api/v1/payments/:id — owner only. */
export const getPaymentHandler = asyncHandler(async (req: Request, res: Response) => {
  const payment = await getPayment(req.params.id as string, requireUser(req).id);
  res.status(200).json({ success: true, data: payment });
});
