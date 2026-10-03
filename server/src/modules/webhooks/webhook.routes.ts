import { Router } from "express";
import { stripeWebhookHandler } from "./webhook.controller";

export const webhookRouter = Router();

// Mounted at /api/v1/webhooks/stripe, so the path here is root.
webhookRouter.post("/", stripeWebhookHandler);
