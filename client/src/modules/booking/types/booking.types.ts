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
  title?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile?: string | null;
  postcode?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
}

export interface GuestBookingPayload {
  rooms: Array<{ roomTypeId: string; ratePlanId: string; quantity: number }>;
  checkIn: string;
  checkOut: string;
  guests: { adults: number; children: number };
  contact: GuestDetails;
  couponCode?: string;
  notes?: string | null;
  createAccount?: boolean | null;
  password?: string | null;
  confirmPassword?: string | null;
  newsletter?: boolean | null;
  acceptPrivacy: boolean;
  acceptTerms: boolean;
}

export interface GuestBookingResult {
  booking: Booking;
  items: unknown[];
  user: { id: string; name: string; email: string; role: string };
  token: string | null;
  isNewAccount: boolean;
  idempotentReplay: boolean;
  payment: { paymentId: string; clientSecret: string; reused: boolean } | null;
  paymentError: string | null;
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
  nightly?: Array<{ date: string; price: number }>;
  nights?: number;
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
