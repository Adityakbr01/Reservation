export interface Customer {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  is_active?: boolean;
  lastLoginAt?: string | null;
  last_login_at?: string | null;
  createdAt: string;
  created_at?: string;
}

export interface CustomerFilters {
  page: number;
  limit: number;
  q?: string;
  role?: string;
}

export interface CustomerBooking {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  total: number;
  currency: string;
}

export interface CustomerDetail {
  user: Customer;
  bookings: CustomerBooking[];
  paymentSummary: { paid: number; refunded: number; currency: string | null };
  cancellations: Array<{ bookingNumber: string; cancelledAt: string | null; reason: string | null }>;
}
