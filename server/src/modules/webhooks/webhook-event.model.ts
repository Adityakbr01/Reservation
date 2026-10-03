import mongoose from "mongoose";

export const WEBHOOK_PROCESSING_STATUSES = ["RECEIVED", "PROCESSED", "FAILED"] as const;

export type WebhookProcessingStatus = (typeof WEBHOOK_PROCESSING_STATUSES)[number];

export interface WebhookEventDocument extends mongoose.Document {
  provider: string;
  stripeEventId: string;
  eventType: string;
  receivedAt: Date;
  processedAt: Date | null;
  processingStatus: WebhookProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventSchema = new mongoose.Schema<WebhookEventDocument>(
  {
    provider: { type: String, required: true, default: "STRIPE" },
    stripeEventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    receivedAt: { type: Date, required: true, default: () => new Date() },
    processedAt: { type: Date, default: null },
    processingStatus: {
      type: String,
      enum: WEBHOOK_PROCESSING_STATUSES,
      required: true,
      default: "RECEIVED",
    },
  },
  { timestamps: true },
);

// stripeEventId unique index comes from `unique: true` on the field above.

// Guarded for --hot reloads.
export const WebhookEventModel =
  mongoose.models.WebhookEvent ??
  mongoose.model<WebhookEventDocument>("WebhookEvent", webhookEventSchema);

export async function hasWebhookEvent(stripeEventId: string): Promise<boolean> {
  return (await WebhookEventModel.exists({ stripeEventId })) !== null;
}

export async function recordWebhookEvent(stripeEventId: string, eventType: string): Promise<void> {
  await WebhookEventModel.create({ stripeEventId, eventType, processingStatus: "RECEIVED" });
}

export async function markWebhookEvent(
  stripeEventId: string,
  status: WebhookProcessingStatus,
): Promise<void> {
  await WebhookEventModel.updateOne(
    { stripeEventId },
    {
      $set: {
        processingStatus: status,
        ...(status === "PROCESSED" ? { processedAt: new Date() } : {}),
      },
    },
  ).exec();
}
