import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { MAX_ATTEMPTS } from "./notification.types";
import type {
  Notification,
  NotificationStatus,
  NotificationType,
} from "./notification.types";

export interface NotificationDocument extends mongoose.Document {
  type: NotificationType;
  recipient: string;
  bookingId: mongoose.Types.ObjectId | null;
  paymentId: mongoose.Types.ObjectId | null;
  idempotencyKey: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
  provider: string | null;
  providerMessageId: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<NotificationDocument>(
  {
    type: { type: String, required: true },
    recipient: { type: String, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "SENT", "FAILED"],
      default: "QUEUED",
      required: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: MAX_ATTEMPTS, min: 1 },
    nextAttemptAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    provider: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ status: 1, nextAttemptAt: 1 });
notificationSchema.index({ bookingId: 1, createdAt: -1 });

// Guarded for --hot reloads.
export const NotificationModel =
  mongoose.models.Notification ??
  mongoose.model<NotificationDocument>("Notification", notificationSchema);

export function toNotification(doc: NotificationDocument): Notification {
  return {
    id: doc._id.toString(),
    type: doc.type,
    recipient: doc.recipient,
    bookingId: doc.bookingId ? doc.bookingId.toString() : null,
    paymentId: doc.paymentId ? doc.paymentId.toString() : null,
    idempotencyKey: doc.idempotencyKey,
    status: doc.status,
    attempts: doc.attempts,
    maxAttempts: doc.maxAttempts,
    nextAttemptAt: doc.nextAttemptAt,
    lastError: doc.lastError,
    provider: doc.provider,
    providerMessageId: doc.providerMessageId,
    sentAt: doc.sentAt,
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
    const doc = await NotificationModel.create({
      type: input.type,
      recipient: input.recipient,
      bookingId: input.bookingId ?? null,
      paymentId: input.paymentId ?? null,
      idempotencyKey: input.idempotencyKey,
      status: "QUEUED",
      nextAttemptAt: new Date(),
    });
    return toNotification(doc);
  } catch (error) {
    if (error instanceof Error && (error as unknown as { code?: unknown }).code === 11000) {
      return null;
    }
    throw error;
  }
}

/** Atomically claims the next due row so parallel workers never double-send. */
export async function claimDueNotification(now: Date): Promise<Notification | null> {
  const doc = await NotificationModel.findOneAndUpdate(
    { status: "QUEUED", nextAttemptAt: { $lte: now } },
    {
      $set: { status: "PROCESSING" },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after", sort: { nextAttemptAt: 1 } },
  ).exec();
  return doc ? toNotification(doc) : null;
}

export async function markNotificationSent(
  id: string,
  provider: string,
  providerMessageId: string | null,
): Promise<void> {
  await NotificationModel.findByIdAndUpdate(id, {
    $set: {
      status: "SENT",
      provider,
      providerMessageId,
      sentAt: new Date(),
      lastError: null,
    },
  }).exec();
}

export async function markNotificationRetry(
  id: string,
  nextAttemptAt: Date,
  lastError: string,
): Promise<void> {
  await NotificationModel.findByIdAndUpdate(id, {
    $set: { status: "QUEUED", nextAttemptAt, lastError },
  }).exec();
}

/** Terminal failure: kept for the admin monitor (dead-letter), never deleted. */
export async function markNotificationFailed(id: string, lastError: string): Promise<void> {
  await NotificationModel.findByIdAndUpdate(id, {
    $set: { status: "FAILED", nextAttemptAt: null, lastError },
  }).exec();
}

/** Admin retry of a FAILED row: back to QUEUED, attempts preserved for audit. */
export async function requeueNotification(id: string): Promise<Notification | null> {
  const doc = await NotificationModel.findOneAndUpdate(
    { _id: id, status: "FAILED" },
    { $set: { status: "QUEUED", nextAttemptAt: new Date(), lastError: null } },
    { returnDocument: "after" },
  ).exec();
  return doc ? toNotification(doc) : null;
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
  const query: QueryFilter<NotificationDocument> = {};
  if (status) query.status = status;
  if (type) query.type = type;
  const [total, docs] = await Promise.all([
    NotificationModel.countDocuments(query).exec(),
    NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toNotification(doc)),
    page,
    limit,
    total,
  );
}

export async function findNotificationById(id: string): Promise<Notification | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await NotificationModel.findById(id).exec();
  return doc ? toNotification(doc) : null;
}
