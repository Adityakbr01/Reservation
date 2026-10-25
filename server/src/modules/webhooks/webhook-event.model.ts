import { prisma } from "../../config/database";
import { newId } from "../../utils/id";

export const WEBHOOK_PROCESSING_STATUSES = ["RECEIVED", "PROCESSED", "FAILED"] as const;

export type WebhookProcessingStatus = (typeof WEBHOOK_PROCESSING_STATUSES)[number];

export interface WebhookEvent {
  id: string;
  provider: string;
  stripeEventId: string;
  eventType: string;
  receivedAt: Date;
  processedAt: Date | null;
  processingStatus: WebhookProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export async function hasWebhookEvent(stripeEventId: string): Promise<boolean> {
  const count = await prisma.webhookEvent.count({ where: { stripeEventId } });
  return count > 0;
}

export async function recordWebhookEvent(stripeEventId: string, eventType: string): Promise<void> {
  await prisma.webhookEvent.create({
    data: {
      id: newId(),
      stripeEventId,
      eventType,
      processingStatus: "RECEIVED",
    },
  });
}

export async function markWebhookEvent(
  stripeEventId: string,
  status: WebhookProcessingStatus,
): Promise<void> {
  await prisma.webhookEvent.updateMany({
    where: { stripeEventId },
    data: {
      processingStatus: status,
      ...(status === "PROCESSED" ? { processedAt: new Date() } : {}),
    },
  });
}
