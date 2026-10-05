import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

/**
 * Append-only audit trail (docs 07 §73-75). No update/delete API exists
 * on purpose — history is immutable. Snapshots are curated allow-lists,
 * never full documents (no passwords, tokens, or card data ever land here).
 */
export const AUDIT_ACTIONS = [
  "BOOKING_CREATED",
  "BOOKING_CANCELLED",
  "BOOKING_CHECKED_IN",
  "BOOKING_CHECKED_OUT",
  "ROOM_REASSIGNED",
  "PAYMENT_REFUNDED",
  "CUSTOMER_DISABLED",
  "CUSTOMER_ENABLED",
  "CMS_PUBLISHED",
  "CMS_UNPUBLISHED",
  "CMS_ARCHIVED",
  "SETTINGS_UPDATED",
  "NOTIFICATION_RETRIED",
  "COUPON_CREATED",
  "COUPON_DISABLED",
  "ROOM_TYPE_SAVED",
  "ROOM_SAVED",
  "RATE_PLAN_SAVED",
  "AVAILABILITY_CHANGED",
  "DAILY_PRICE_SAVED",
  "AMENITY_SAVED",
  "ENQUIRY_CREATED",
  "ENQUIRY_STATUS",
  "NEWSLETTER_SUBSCRIBED",
  "NEWSLETTER_UNSUBSCRIBED",
  "REVIEW_CREATED",
  "REVIEW_MODERATED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogDocument extends mongoose.Document {
  actorId: mongoose.Types.ObjectId | null;
  actorRole: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

const auditLogSchema = new mongoose.Schema<AuditLogDocument>(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: null },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: null },
    before: { type: Object, default: null },
    after: { type: Object, default: null },
    metadata: { type: Object, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

// Guarded for --hot reloads.
export const AuditLogModel =
  mongoose.models.AuditLog ?? mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);

export function toAuditLog(doc: AuditLogDocument): AuditLog {
  return {
    id: doc._id.toString(),
    actorId: doc.actorId ? doc.actorId.toString() : null,
    actorRole: doc.actorRole,
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId,
    before: doc.before,
    after: doc.after,
    metadata: doc.metadata,
    ip: doc.ip,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt,
  };
}

export interface RecordAuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Insert-only. Audit writes never throw into domain flows. */
export async function insertAuditLog(input: RecordAuditInput): Promise<void> {
  try {
    await AuditLogModel.create({
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      metadata: input.metadata ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch {
    // Audit must never break the action it records.
  }
}

export interface ListAuditLogsFilter {
  page: number;
  limit: number;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
}

export async function listAuditLogs(filter: ListAuditLogsFilter): Promise<Paginated<AuditLog>> {
  const query: QueryFilter<AuditLogDocument> = {};
  if (filter.action) query.action = filter.action;
  if (filter.entityType) query.entityType = filter.entityType;
  if (filter.entityId) query.entityId = filter.entityId;
  const [total, docs] = await Promise.all([
    AuditLogModel.countDocuments(query).exec(),
    AuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toAuditLog(doc)),
    filter.page,
    filter.limit,
    total,
  );
}
