import type { Request } from "express";
import type { RequestUser } from "../../types/auth";
import type { Booking } from "../bookings/booking.types";
import { insertAuditLog, listAuditLogs } from "./audit.model";
import type { AuditAction, ListAuditLogsFilter } from "./audit.model";

export interface AuditContext {
  actorId: string | null;
  actorRole: string | null;
  ip: string | null;
  userAgent: string | null;
}

/** Pulls actor + network context off the request for audit rows. */
export function auditContextFrom(req: Request): AuditContext {
  const user = (req as Request & { user?: RequestUser }).user;
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim()) ??
    req.socket.remoteAddress ??
    null;
  return {
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    ip,
    userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
  };
}

export async function recordAudit(
  req: Request,
  action: AuditAction,
  entityType: string,
  extra: {
    entityId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  } = {},
): Promise<void> {
  const context = auditContextFrom(req);
  await insertAuditLog({
    actorId: context.actorId,
    actorRole: context.actorRole,
    action,
    entityType,
    entityId: extra.entityId ?? null,
    before: extra.before ?? null,
    after: extra.after ?? null,
    metadata: extra.metadata ?? null,
    ip: context.ip,
    userAgent: context.userAgent,
  });
}

export async function listAdminAuditLogs(filter: ListAuditLogsFilter) {
  return listAuditLogs(filter);
}

/** Curated booking snapshot for audit rows — statuses and money only. */
export function bookingSnapshot(booking: Booking): Record<string, unknown> {
  return {
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    total: booking.pricing.total,
    currency: booking.pricing.currency,
  };
}
