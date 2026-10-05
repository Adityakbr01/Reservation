import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { AppError } from "../../utils/app-error";
import { recordAudit } from "../audit/audit.service";
import { NewsletterModel, listSubscribers, toSubscriber } from "./newsletter.model";
import type { SubscribeInput } from "./newsletter.schema";

export const publicSubscribeHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as SubscribeInput;
  const normalizedEmail = input.email.trim().toUpperCase();
  const existing = await NewsletterModel.findOne({ normalizedEmail }).exec();
  if (existing) {
    existing.status = "SUBSCRIBED";
    if (input.name) existing.name = input.name;
    await existing.save();
    res.status(200).json({ success: true, data: toSubscriber(existing) });
    return;
  }
  const doc = await NewsletterModel.create({
    email: input.email.trim(),
    normalizedEmail,
    name: input.name ?? null,
    source: input.source ?? "website",
    status: "SUBSCRIBED",
  });
  res.status(201).json({ success: true, data: toSubscriber(doc) });
});

export const publicUnsubscribeHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) throw new AppError("Missing unsubscribe token", 400, "TOKEN_REQUIRED");
  const doc = await NewsletterModel.findOne({ unsubscribeToken: token }).exec();
  if (!doc) throw new AppError("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
  doc.status = "UNSUBSCRIBED";
  await doc.save();
  res.status(200).json({ success: true, data: { unsubscribed: true } });
});

export const adminListSubscribersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as {
    page: number;
    limit: number;
    q?: string;
    status?: "SUBSCRIBED" | "UNSUBSCRIBED";
  };
  const result = await listSubscribers(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminDeleteSubscriberHandler = asyncHandler(async (req: Request, res: Response) => {
  await NewsletterModel.deleteOne({ _id: req.params.id }).exec();
  await recordAudit(req, "NEWSLETTER_UNSUBSCRIBED", "newsletter", { entityId: req.params.id as string });
  res.status(200).json({ success: true, data: { deleted: true } });
});
