export type BookingStatus =
  | "DRAFT"
  | "HELD"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "REFUND_PENDING"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "EXPIRED";

export interface ReservationGuests {
  adults: number;
  children: number;
}

export interface ReservationContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title?: string | null;
  mobile?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
}

export interface ReservationPricing {
  currency: string;
  subtotal: number;
  discount: number;
  taxes: number;
  fees: number;
  total: number;
  couponCode: string | null;
}

export interface Reservation {
  id: string;
  bookingNumber: string;
  propertyId: string;
  userId: string | null;
  status: BookingStatus;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  guests: ReservationGuests;
  contact: ReservationContact;
  pricing: ReservationPricing;
  cancellation: {
    cancelledAt: string | null;
    cancelledBy: string | null;
    reason: string | null;
  };
  hold: {
    holdId: string | null;
    expiresAt: string | null;
  };
  stay: {
    checkedInAt: string | null;
    checkedInBy: string | null;
    checkedOutAt: string | null;
    checkedOutBy: string | null;
  };
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationItem {
  id: string;
  bookingId: string;
  roomTypeId: string;
  roomId: string | null;
  ratePlanId: string;
  roomNameSnapshot: string;
  roomNumberSnapshot: string | null;
  ratePlanNameSnapshot: string;
  checkIn: string;
  checkOut: string;
  pricing?: {
    total: number;
  };
}

export interface ReservationDetail {
  booking: Reservation;
  items: ReservationItem[];
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
  }>;
}

export interface CancelPreview {
  evaluation: {
    isCancellable: boolean;
    refundAmount: number;
    refundPercentage: number;
    reason: string;
    policyName: string | null;
  };
  bookingNumber: string;
  status: BookingStatus;
  paidTotal: number;
}

export interface ReservationFilters {
  page: number;
  limit: number;
  status?: BookingStatus;
  q?: string;
  checkInFrom?: string;
  checkOutTo?: string;
}

export const RESERVATION_STATUSES = [
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
