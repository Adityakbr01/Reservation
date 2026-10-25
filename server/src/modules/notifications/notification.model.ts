import { prisma } from "../../config/database";
import { isDuplicateKeyError } from "../../utils/mongo";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { newId } from "../../utils/id";
import { MAX_ATTEMPTS } from "./notification.types";
import type {
  Notification,
  NotificationStatus,
  NotificationType,
} from "./notification.types";

export type NotificationDocument = Notification & {
  _id: { toString: () => string };
};

export function toNotification(doc: any): Notification {
  return {
    id: doc.id ?? doc._id?.toString(),
    type: doc.type as NotificationType,
    recipient: doc.recipient,
    bookingId: doc.bookingId ? String(doc.bookingId) : null,
    paymentId: doc.paymentId ? String(doc.paymentId) : null,
    idempotencyKey: doc.idempotencyKey,
    status: doc.status as NotificationStatus,
    attempts: Number(doc.attempts),
    maxAttempts: Number(doc.maxAttempts),
    nextAttemptAt: doc.nextAttemptAt,
    lastError: doc.lastError ?? null,
    provider: doc.provider ?? null,
    providerMessageId: doc.providerMessageId ?? null,
    sentAt: doc.sentAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface EnqueueNotificationInput {
  type: NotificationType;
  recipient: string;
  bookingId?: string | null;
  paymentId?: string | null;
  idempotencyKey: string;
}

/**
 * Inserts a queue row. Unique idempotencyKey makes repeat enqueues of the
 * same event safe; returns null when already queued or sent.
 */
export async function insertNotification(
  input: EnqueueNotificationInput,
): Promise<Notification | null> {
  try {
    const doc = await prisma.notification.create({
      data: {
        id: newId(),
        type: input.type,
        recipient: input.recipient,
        bookingId: input.bookingId ?? null,
        paymentId: input.paymentId ?? null,
        idempotencyKey: input.idempotencyKey,
        status: "QUEUED",
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        nextAttemptAt: new Date(),
      },
    });
    return toNotification(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return null;
    }
    throw error;
  }
}

/** Atomically claims the next due row so parallel workers never double-send. */
export async function claimDueNotification(now: Date): Promise<Notification | null> {
  return await prisma.$transaction(async (tx) => {
    const candidate = await tx.notification.findFirst({
      where: {
        status: "QUEUED",
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: "asc" },
    });
    if (!candidate) return null;
    const updated = await tx.notification.update({
      where: { id: candidate.id },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
      },
    });
    return toNotification(updated);
  });
}

export async function markNotificationSent(
  id: string,
  provider: string,
  providerMessageId: string | null,
): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: {
      status: "SENT",
      provider,
      providerMessageId,
      sentAt: new Date(),
      lastError: null,
    },
  });
}

export async function markNotificationRetry(
  id: string,
  nextAttemptAt: Date,
  lastError: string,
): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { status: "QUEUED", nextAttemptAt, lastError },
  });
}

/** Terminal failure: kept for the admin monitor (dead-letter), never deleted. */
export async function markNotificationFailed(id: string, lastError: string): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { status: "FAILED", nextAttemptAt: null, lastError },
  });
}

/** Admin retry of a FAILED row: back to QUEUED, attempts preserved for audit. */
export async function requeueNotification(id: string): Promise<Notification | null> {
  try {
    const doc = await prisma.notification.update({
      where: { id, status: "FAILED" },
      data: { status: "QUEUED", nextAttemptAt: new Date(), lastError: null },
    });
    return toNotification(doc);
  } catch {
    return null;
  }
}

export interface ListNotificationsFilter {
  page: number;
  limit: number;
  status?: NotificationStatus;
  type?: NotificationType;
}

export async function listNotifications(
  filter: ListNotificationsFilter,
): Promise<Paginated<Notification>> {
  const { page, limit, status, type } = filter;
  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  const [total, docs] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map((doc) => toNotification(doc)),
    page,
    limit,
    total,
  );
}

export async function findNotificationById(id: string): Promise<Notification | null> {
  if (!id || id.length !== 24) return null;
  const doc = await prisma.notification.findUnique({ where: { id } });
  return doc ? toNotification(doc) : null;
}
