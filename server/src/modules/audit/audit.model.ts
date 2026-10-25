import { prisma } from "../../config/database";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { newId } from "../../utils/id";

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
  "EMAIL_TEMPLATE_UPDATED",
  "EMAIL_TEST_SENT",
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

export type AuditLogDocument = AuditLog & {
  _id: { toString: () => string };
};

export function toAuditLog(doc: any): AuditLog {
  return {
    id: doc.id ?? doc._id?.toString(),
    actorId: doc.actorId ? String(doc.actorId) : null,
    actorRole: doc.actorRole ?? null,
    action: doc.action as AuditAction,
    entityType: doc.entityType,
    entityId: doc.entityId ?? null,
    before: (doc.before as Record<string, unknown>) ?? null,
    after: (doc.after as Record<string, unknown>) ?? null,
    metadata: (doc.metadata as Record<string, unknown>) ?? null,
    ip: doc.ip ?? null,
    userAgent: doc.userAgent ?? null,
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
    await prisma.auditLog.create({
      data: {
        id: newId(),
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: (input.before as any) ?? undefined,
        after: (input.after as any) ?? undefined,
        metadata: (input.metadata as any) ?? undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
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
  const query: any = {};
  if (filter.action) query.action = filter.action;
  if (filter.entityType) query.entityType = filter.entityType;
  if (filter.entityId) query.entityId = filter.entityId;

  const [total, docs] = await Promise.all([
    prisma.auditLog.count({ where: query }),
    prisma.auditLog.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    }),
  ]);

  return paginatedResponse(
    docs.map((doc) => toAuditLog(doc)),
    filter.page,
    filter.limit,
    total,
  );
}
