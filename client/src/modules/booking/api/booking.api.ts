import { apiClient, publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type {
  Booking,
  CouponCheck,
  CreateBookingResult,
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

export async function fetchBooking(id: string): Promise<Booking> {
  const response = await apiClient.get<ApiEnvelope<Booking>>(`/bookings/${id}`);
  return unwrapResponse(response);
}

export async function validateCouponCode(code: string): Promise<CouponCheck> {
  const response = await publicApiClient.post<ApiEnvelope<CouponCheck>>("/public/coupons/validate", {
    code,
  });
  return unwrapResponse(response);
}
