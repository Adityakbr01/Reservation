import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { bookingKeys } from "@/lib/query-keys";
import {
  createBooking,
  createPaymentIntent,
  fetchBooking,
  fetchQuote,
  validateCouponCode,
} from "../api/booking.api";
import type { CreateBookingInput } from "../api/booking.api";
import type { QuoteRequest } from "../api/booking.api";

export function useQuote(input: QuoteRequest | null) {
  return useQuery({
    queryKey: bookingKeys.quote(input),
    queryFn: () => {
      if (!input) throw new Error("Missing quote input");
      return fetchQuote(input);
    },
    enabled: input !== null,
    staleTime: 60_000,
    retry: false,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: (vars: { input: CreateBookingInput; idempotencyKey: string }) =>
      createBooking(vars.input, vars.idempotencyKey),
    onSuccess: () => {
      toast.success("Booking held — proceed to payment");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function usePaymentIntent() {
  return useMutation({
    mutationFn: createPaymentIntent,
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: validateCouponCode,
    onSuccess: (data) => {
      if (data.valid) {
        toast.success("Coupon applied");
      } else {
        toast.error(data.reason ?? "This coupon cannot be applied");
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

const TERMINAL_STATUSES = ["CONFIRMED", "CANCELLED", "EXPIRED"] as const;

export function useBookingStatus(id: string | null) {
  return useQuery({
    queryKey: bookingKeys.detail(id ?? "none"),
    queryFn: () => {
      if (!id) throw new Error("Missing booking id");
      return fetchBooking(id);
    },
    enabled: id !== null,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 2500;
      return (TERMINAL_STATUSES as readonly string[]).includes(status) ? false : 2500;
    },
  });
}
