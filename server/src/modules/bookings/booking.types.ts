export const BOOKING_STATUSES = [
  "DRAFT",
  "HELD",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "REFUND_PENDING",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "EXPIRED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_SOURCES = ["DIRECT", "ADMIN"] as const;

export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** States that block physical inventory for overlapping dates. */
export const INVENTORY_BLOCKING_STATUSES: BookingStatus[] = ["CONFIRMED", "CHECKED_IN"];

/** Held states block only while their hold has not expired. */
export const HOLD_STATUSES: BookingStatus[] = ["HELD", "PAYMENT_PENDING"];

export interface BookingGuests {
  adults: number;
  children: number;
}

export interface BookingContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface BookingPricing {
  currency: string;
  subtotal: number;
  discount: number;
  taxes: number;
  fees: number;
  total: number;
  couponCode: string | null;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  propertyId: string;
  userId: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  checkIn: Date;
  checkOut: Date;
  guests: BookingGuests;
  contact: BookingContact;
  pricing: BookingPricing;
  cancellation: {
    cancelledAt: Date | null;
    cancelledBy: string | null;
    reason: string | null;
  };
  hold: {
    holdId: string | null;
    expiresAt: Date | null;
  };
  source: BookingSource;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  roomTypeId: string;
  roomId: string | null;
  ratePlanId: string;
  roomNameSnapshot: string;
  roomNumberSnapshot: string | null;
  ratePlanNameSnapshot: string;
  checkIn: Date;
  checkOut: Date;
  guests: BookingGuests;
  pricing: {
    nightlyRates: Array<{ date: Date; amount: number }>;
    subtotal: number;
    discount: number;
    taxes: number;
    fees: number;
    total: number;
    currency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
