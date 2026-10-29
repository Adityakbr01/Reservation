import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { Payment, PaymentProvider } from "./payment.types";
import type { PaymentStatus } from "../bookings/booking.types";

export interface PaymentDocLike extends Payment {
  _id: { toString(): string };
}

export function toPayment(doc: any): Payment {
  const metadata = typeof doc.metadata === "string" ? JSON.parse(doc.metadata) : (doc.metadata ?? {});
  return {
    id: doc.id ?? doc._id?.toString(),
    bookingId: typeof doc.bookingId === "object" ? doc.bookingId.toString() : doc.bookingId,
    userId: doc.userId ? (typeof doc.userId === "object" ? doc.userId.toString() : doc.userId) : null,
    provider: doc.provider as PaymentProvider,
    providerPaymentIntentId: doc.providerPaymentIntentId ?? null,
    providerCheckoutSessionId: doc.providerCheckoutSessionId ?? null,
    amount: doc.amount != null ? Number(doc.amount) : 0,
    currency: doc.currency,
    status: doc.status as PaymentStatus,
    failureCode: doc.failureCode ?? null,
    failureMessage: doc.failureMessage ?? null,
    paidAt: doc.paidAt ? new Date(doc.paidAt) : null,
    metadata,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreatePaymentInput {
  bookingId: string;
  userId: string | null;
  providerPaymentIntentId?: string | null;
  amount: number;
  currency: string;
  status?: PaymentStatus;
  metadata?: Record<string, unknown>;
}

export async function createPayment(input: CreatePaymentInput): Promise<PaymentDocLike> {
  const id = newId();
  const payment = await prisma.payment.create({
    data: {
      id,
      bookingId: input.bookingId,
      userId: input.userId,
      providerPaymentIntentId: input.providerPaymentIntentId ?? null,
      amount: input.amount,
      currency: input.currency,
      status: input.status ?? "PENDING",
      metadata: (input.metadata ?? {}) as any,
    },
  });
  return {
    ...toPayment(payment),
    _id: { toString: () => payment.id },
  };
}

export async function findPaymentById(id: string): Promise<Payment | null> {
  const doc = await prisma.payment.findUnique({ where: { id } });
  return doc ? toPayment(doc) : null;
}

export async function findPaymentByIntentId(intentId: string): Promise<Payment | null> {
  const doc = await prisma.payment.findUnique({ where: { providerPaymentIntentId: intentId } });
  return doc ? toPayment(doc) : null;
}

export async function findLatestPaymentForBooking(bookingId: string): Promise<Payment | null> {
  const doc = await prisma.payment.findFirst({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
  });
  return doc ? toPayment(doc) : null;
}

export interface PaymentStatusUpdate {
  status: PaymentStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  paidAt?: Date | null;
}

export async function updatePaymentStatus(
  id: string,
  update: PaymentStatusUpdate,
): Promise<Payment | null> {
  try {
    const doc = await prisma.payment.update({
      where: { id },
      data: {
        status: update.status,
        failureCode: update.failureCode ?? null,
        failureMessage: update.failureMessage ?? null,
        ...(update.paidAt !== undefined ? { paidAt: update.paidAt } : {}),
      },
    });
    return toPayment(doc);
  } catch {
    return null;
  }
}

export async function listPaymentsByBooking(bookingId: string): Promise<Payment[]> {
  const docs = await prisma.payment.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
  });
  return docs.map(toPayment);
}

export interface ListPaymentsFilter {
  page: number;
  limit: number;
  status?: Payment["status"];
  bookingId?: string;
}

export async function listPayments(filter: ListPaymentsFilter): Promise<Paginated<Payment>> {
  const { page, limit, status, bookingId } = filter;
  const where: any = {};
  if (status) where.status = status;
  if (bookingId) where.bookingId = bookingId;
  const [total, docs] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toPayment),
    page,
    limit,
    total,
  );
}
