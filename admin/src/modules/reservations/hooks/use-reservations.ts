import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { availabilityKeys, reservationKeys } from "@/lib/query-keys";
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  deleteReservation,
  getReservation,
  listReservations,
  previewReservationCancel,
  reassignReservation,
} from "../api/reservations.api";
import type { ReservationFilters } from "../types/reservation.types";

export function useReservations(filters: ReservationFilters) {
  return useQuery({
    queryKey: reservationKeys.list(filters),
    queryFn: () => listReservations(filters),
  });
}

export function useReservation(id: string, enabled = true) {
  return useQuery({
    queryKey: reservationKeys.detail(id),
    queryFn: () => getReservation(id),
    enabled: enabled && id.length > 0,
  });
}

export function useCancelPreview(id: string, enabled = true) {
  return useQuery({
    queryKey: [...reservationKeys.detail(id), "cancel-preview"] as const,
    queryFn: () => previewReservationCancel(id),
    enabled: enabled && id.length > 0,
  });
}

export function useCancelReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string | null) => cancelReservation(id, reason),
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success(`Booking ${booking.bookingNumber} cancelled`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useCheckInReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => checkInReservation(id),
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      toast.success(`Booking ${booking.bookingNumber} checked in`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useCheckOutReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => checkOutReservation(id),
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      toast.success(`Booking ${booking.bookingNumber} checked out`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useReassignReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => reassignReservation(id, roomId),
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      toast.success(`Booking ${booking.bookingNumber} moved`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useDeleteReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteReservation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success("Reservation deleted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
