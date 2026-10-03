export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface AdminPayment {
  id: string;
  bookingId: string;
  userId: string | null;
  provider: string;
  providerPaymentIntentId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failureCode: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  createdAt: string;
}

export type RefundStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface AdminRefund {
  id: string;
  bookingId: string;
  paymentId: string;
  providerRefundId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  createdAt: string;
}

export interface PaymentFilters {
  page: number;
  limit: number;
  status?: PaymentStatus;
  bookingId?: string;
}

export interface RefundFilters {
  page: number;
  limit: number;
  bookingId?: string;
  status?: RefundStatus;
}

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export const REFUND_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
