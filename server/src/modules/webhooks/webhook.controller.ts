import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { processStripeEvent, verifyStripeWebhook } from "./stripe-webhook.service";

/**
 * POST /api/v1/webhooks/stripe — mounted with express.raw() BEFORE any
 * JSON parsing, otherwise signature verification is impossible.
 */
export const stripeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!Buffer.isBuffer(req.body)) {
    throw new AppError("Webhook requires a raw body", 400, "INVALID_SIGNATURE");
  }
  const signature = req.headers["stripe-signature"];
  const event = await verifyStripeWebhook(req.body, Array.isArray(signature) ? signature[0] : (signature ?? ""));
  await processStripeEvent(event);
  res.status(200).json({ success: true, data: { received: true } });
});
