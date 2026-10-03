import mongoose from "mongoose";

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

export interface RefundDocument extends mongoose.Document {
  bookingId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  provider: "STRIPE";
  providerRefundId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  requestedBy: mongoose.Types.ObjectId | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new mongoose.Schema<RefundDocument>(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    provider: { type: String, default: "STRIPE", required: true },
    providerRefundId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    status: { type: String, enum: REFUND_STATUSES, default: "SUCCEEDED", required: true },
    reason: { type: String, default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

refundSchema.index({ bookingId: 1, createdAt: -1 });
refundSchema.index({ paymentId: 1 });

// Guarded for --hot reloads.
export const RefundModel =
  mongoose.models.Refund ?? mongoose.model<RefundDocument>("Refund", refundSchema);

export function toRefund(doc: RefundDocument): Refund {
  return {
    id: doc._id.toString(),
    bookingId: doc.bookingId.toString(),
    paymentId: doc.paymentId.toString(),
    provider: doc.provider,
    providerRefundId: doc.providerRefundId,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    reason: doc.reason,
    requestedBy: doc.requestedBy ? doc.requestedBy.toString() : null,
    processedAt: doc.processedAt,
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
  processedAt?: Date | null;
}

/**
 * Webhook-driven refund recording. Unique providerRefundId makes repeat
 * deliveries safe; returns null when this refund was already recorded.
 */
export async function recordRefund(input: RecordRefundInput): Promise<Refund | null> {
  try {
    const doc = await RefundModel.create(input);
    return toRefund(doc);
  } catch (error) {
    if (error instanceof Error && (error as unknown as { code?: unknown }).code === 11000) {
      return null;
    }
    throw error;
  }
}

/** Sum of succeeded refunds for a payment — our own records, not Stripe's counter. */
export async function sumSucceededRefunds(paymentId: string): Promise<number> {
  const rows = await RefundModel.aggregate<{ total: number }>([
    { $match: { paymentId: new mongoose.Types.ObjectId(paymentId), status: "SUCCEEDED" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).exec();
  return rows[0]?.total ?? 0;
}
