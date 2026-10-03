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
    { new: true },
  ).exec();
  return doc ? toPayment(doc) : null;
}

export async function listPaymentsByBooking(bookingId: string): Promise<Payment[]> {
  const docs = await PaymentModel.find({ bookingId }).sort({ createdAt: -1 }).exec();
  return docs.map((doc) => toPayment(doc));
}
