import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { PaymentModel } from "./payment.model";
import type { PaymentDocument } from "./payment.model";
import type { Payment } from "./payment.types";
import type { PaymentStatus } from "../bookings/booking.types";

export function toPayment(doc: PaymentDocument): Payment {
  return {
    id: doc._id.toString(),
    bookingId: doc.bookingId.toString(),
    userId: doc.userId ? doc.userId.toString() : null,
    provider: doc.provider,
    providerPaymentIntentId: doc.providerPaymentIntentId,
    providerCheckoutSessionId: doc.providerCheckoutSessionId,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    failureCode: doc.failureCode,
    failureMessage: doc.failureMessage,
    paidAt: doc.paidAt,
    metadata: { ...(doc.metadata as Record<string, unknown>) },
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

export async function createPayment(input: CreatePaymentInput): Promise<PaymentDocument> {
  return PaymentModel.create(input);
}

export async function findPaymentById(id: string): Promise<Payment | null> {
  const doc = await PaymentModel.findById(id).exec();
  return doc ? toPayment(doc) : null;
}

export async function findPaymentByIntentId(intentId: string): Promise<Payment | null> {
  const doc = await PaymentModel.findOne({ providerPaymentIntentId: intentId }).exec();
  return doc ? toPayment(doc) : null;
}

export async function findLatestPaymentForBooking(bookingId: string): Promise<Payment | null> {
  const doc = await PaymentModel.findOne({ bookingId }).sort({ createdAt: -1 }).exec();
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
  const doc = await PaymentModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status: update.status,
        failureCode: update.failureCode ?? null,
        failureMessage: update.failureMessage ?? null,
        ...(update.paidAt !== undefined ? { paidAt: update.paidAt } : {}),
      },
    },
    { returnDocument: "after" },
  ).exec();
  return doc ? toPayment(doc) : null;
}

export async function listPaymentsByBooking(bookingId: string): Promise<Payment[]> {
  const docs = await PaymentModel.find({ bookingId }).sort({ createdAt: -1 }).exec();
  return docs.map((doc) => toPayment(doc));
}

export interface ListPaymentsFilter {
  page: number;
  limit: number;
  status?: Payment["status"];
  bookingId?: string;
}

export async function listPayments(filter: ListPaymentsFilter): Promise<Paginated<Payment>> {
  const { page, limit, status, bookingId } = filter;
  const query: QueryFilter<PaymentDocument> = {};
  if (status) query.status = status;
  if (bookingId) query.bookingId = bookingId;
  const [total, docs] = await Promise.all([
    PaymentModel.countDocuments(query).exec(),
    PaymentModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toPayment(doc)),
    page,
    limit,
    total,
  );
}
