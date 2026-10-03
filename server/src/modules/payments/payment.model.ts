import mongoose from "mongoose";
import { PAYMENT_PROVIDERS } from "./payment.types";
import type { PaymentProvider } from "./payment.types";
import type { PaymentStatus } from "../bookings/booking.types";

export interface PaymentDocument extends mongoose.Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | null;
  provider: PaymentProvider;
  providerPaymentIntentId: string | null;
  providerCheckoutSessionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failureCode: string | null;
  failureMessage: string | null;
  paidAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<PaymentDocument>(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    provider: { type: String, enum: PAYMENT_PROVIDERS, default: "STRIPE", required: true },
    providerPaymentIntentId: { type: String, default: null },
    providerCheckoutSessionId: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    status: { type: String, required: true, default: "PENDING" },
    failureCode: { type: String, default: null },
    failureMessage: { type: String, default: null },
    paidAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ providerPaymentIntentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });

// Guarded for --hot reloads.
export const PaymentModel =
  mongoose.models.Payment ?? mongoose.model<PaymentDocument>("Payment", paymentSchema);
