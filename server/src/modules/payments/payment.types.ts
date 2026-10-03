import type { PaymentStatus } from "../bookings/booking.types";

export const PAYMENT_PROVIDERS = ["STRIPE"] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export interface Payment {
  id: string;
  bookingId: string;
  userId: string | null;
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
