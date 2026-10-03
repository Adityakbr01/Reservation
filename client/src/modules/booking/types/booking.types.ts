export interface BookingSelection {
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  /** Display-only names from search results; price always comes from quote. */
  roomName: string;
  rateName: string;
}

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface QuotePricing {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
}

export interface Quote {
  quoteId: string;
  pricing: QuotePricing;
  expiresAt: string;
}

export type BookingStatus = "HELD" | "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  pricing: {
    total: number;
    currency: string;
  };
}

export interface CreateBookingResult {
  booking: Booking;
  idempotentReplay: boolean;
}

export interface PaymentIntentResult {
  paymentId: string;
  clientSecret: string;
  reused: boolean;
}

export interface CouponCheck {
  valid: boolean;
  discount: number;
  code: string;
  reason?: string;
}
