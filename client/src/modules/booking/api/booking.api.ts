import { apiClient, publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type {
  Booking,
  BookingReceipt,
  CouponCheck,
  CreateBookingResult,
  GuestBookingPayload,
  GuestBookingResult,
  GuestDetails,
  PaymentIntentResult,
  Quote,
} from "../types/booking.types";

export interface QuoteRequest {
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  quantity: number;
  couponCode?: string;
}

/** Authoritative server pricing. Never trust search-result prices. */
export async function fetchQuote(input: QuoteRequest): Promise<Quote> {
  const response = await apiClient.post<ApiEnvelope<Quote>>("/bookings/quote", input);
  return unwrapResponse(response);
}

export interface CreateBookingInput {
  rooms: Array<{ roomTypeId: string; ratePlanId: string; quantity: number }>;
  checkIn: string;
  checkOut: string;
  guests: { adults: number; children: number };
  contact: GuestDetails;
  couponCode?: string;
}

export async function createBooking(
  input: CreateBookingInput,
  idempotencyKey: string,
): Promise<CreateBookingResult> {
  const response = await apiClient.post<ApiEnvelope<CreateBookingResult>>("/bookings", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return unwrapResponse(response);
}

export async function createPaymentIntent(bookingId: string): Promise<PaymentIntentResult> {
  const response = await apiClient.post<ApiEnvelope<PaymentIntentResult>>(
    "/payments/create-intent",
    { bookingId },
  );
  return unwrapResponse(response);
}

export interface MyBookingsResult {
  bookings: Booking[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchMyBookings(page = 1): Promise<MyBookingsResult> {
  const response = await publicApiClient.get<ApiEnvelope<Booking[]>>("/me/bookings", {
    params: { page },
  });
  return { bookings: unwrapResponse(response), meta: response.data.meta ?? { page, limit: 10, total: 0, totalPages: 0 } };
}

export async function fetchBooking(id: string): Promise<Booking> {
  // Server returns `{ booking, items }` — unwrap so callers always see a Booking.
  const response = await apiClient.get<ApiEnvelope<{ booking: Booking }>>(`/bookings/${id}`);
  return unwrapResponse(response).booking;
}

export async function fetchBookingReceipt(id: string): Promise<BookingReceipt> {
  const response = await apiClient.get<ApiEnvelope<BookingReceipt>>(`/bookings/${id}/receipt`);
  return unwrapResponse(response);
}

export async function cancelBooking(id: string): Promise<Booking> {
  const response = await apiClient.post<ApiEnvelope<Booking>>(`/bookings/${id}/cancel`, {});
  return unwrapResponse(response);
}

export interface ValidateCouponRequest {
  code: string;
  roomTypeId?: string;
  subtotal?: number;
}

export async function validateCouponCode(input: string | ValidateCouponRequest): Promise<CouponCheck> {
  const body = typeof input === "string" ? { code: input } : input;
  const response = await publicApiClient.post<ApiEnvelope<CouponCheck>>("/public/coupons/validate", body);
  return unwrapResponse(response);
}

/**
 * Frictionless guest checkout. No login needed — for a new email the
 * server provisions the account in the background and returns a token
 * the client stores silently, so the guest never sees a login screen.
 */
export async function createGuestBooking(
  input: GuestBookingPayload,
  idempotencyKey: string,
): Promise<GuestBookingResult> {
  const response = await publicApiClient.post<ApiEnvelope<GuestBookingResult>>(
    "/public/bookings/guest",
    input,
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return unwrapResponse(response);
}

/** Returning-guest probe: an existing email gets a sign-in nudge instead of a silent login. */
export async function checkGuestEmail(email: string): Promise<{ exists: boolean }> {
  const response = await publicApiClient.post<ApiEnvelope<{ exists: boolean }>>(
    "/public/bookings/check-email",
    { email },
  );
  return unwrapResponse(response);
}
