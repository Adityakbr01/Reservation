import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import { isDuplicateKeyError } from "../../utils/mongo";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

export const REFUND_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export interface Refund {
  id: string;
  bookingId: string;
  paymentId: string;
  provider: "STRIPE";
  providerRefundId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  requestedBy: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toRefund(doc: any): Refund {
  return {
    id: doc.id ?? doc._id?.toString(),
    bookingId: typeof doc.bookingId === "object" ? doc.bookingId.toString() : doc.bookingId,
    paymentId: typeof doc.paymentId === "object" ? doc.paymentId.toString() : doc.paymentId,
    provider: doc.provider as "STRIPE",
    providerRefundId: doc.providerRefundId,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status as RefundStatus,
    reason: doc.reason ?? null,
    requestedBy: doc.requestedBy ? (typeof doc.requestedBy === "object" ? doc.requestedBy.toString() : doc.requestedBy) : null,
    processedAt: doc.processedAt ? new Date(doc.processedAt) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface RecordRefundInput {
  bookingId: string;
  paymentId: string;
  providerRefundId: string;
  amount: number;
  currency: string;
  status?: RefundStatus;
  reason?: string | null;
  requestedBy?: string | null;
  processedAt?: Date | null;
}

/**
 * Webhook-driven refund recording. Unique providerRefundId makes repeat
 * deliveries safe; returns null when this refund was already recorded.
 */
export async function recordRefund(input: RecordRefundInput): Promise<Refund | null> {
  try {
    const id = newId();
    const doc = await prisma.refund.create({
      data: {
        id,
        bookingId: input.bookingId,
        paymentId: input.paymentId,
        providerRefundId: input.providerRefundId,
        amount: input.amount,
        currency: input.currency,
        status: input.status ?? "SUCCEEDED",
        reason: input.reason ?? null,
        requestedBy: input.requestedBy ?? null,
        processedAt: input.processedAt ?? null,
      },
    });
    return toRefund(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return null;
    }
    throw error;
  }
}

/** All refunds for a payment, newest first — payment detail + email context. */
export async function listRefundsForPayment(paymentId: string): Promise<Refund[]> {
  const docs = await prisma.refund.findMany({
    where: { paymentId },
    orderBy: { createdAt: "desc" },
  });
  return docs.map(toRefund);
}

/** Latest refund for a payment — drives the REFUND_UPDATED email context. */
export async function findLatestRefundForPayment(paymentId: string): Promise<Refund | null> {
  const refunds = await listRefundsForPayment(paymentId);
  return refunds[0] ?? null;
}

/** Sum of succeeded refunds for a payment — our own records, not Stripe's counter. */
export async function sumSucceededRefunds(paymentId: string): Promise<number> {
  const result = await prisma.refund.aggregate({
    where: { paymentId, status: "SUCCEEDED" },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

/**
 * Promotes an already-recorded PENDING refund to SUCCEEDED once the
 * provider confirms it. Returns true when a transition happened; false
 * when the record was already terminal (idempotent repeat deliveries).
 */
export async function markRefundSucceeded(providerRefundId: string): Promise<boolean> {
  const result = await prisma.refund.updateMany({
    where: { providerRefundId, status: "PENDING" },
    data: { status: "SUCCEEDED", processedAt: new Date() },
  });
  return result.count > 0;
}

export interface ListRefundsFilter {
  page: number;
  limit: number;
  bookingId?: string;
  status?: RefundStatus;
}

export async function listRefunds(filter: ListRefundsFilter): Promise<Paginated<Refund>> {
  const { page, limit, bookingId, status } = filter;
  const where: any = {};
  if (bookingId) where.bookingId = bookingId;
  if (status) where.status = status;
  const [total, docs] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toRefund),
    page,
    limit,
    total,
  );
}
