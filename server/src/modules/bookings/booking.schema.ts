import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { BOOKING_STATUSES } from "./booking.types";

const guestsSchema = z.object({
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
});

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().min(4).max(40),
});

const roomLineSchema = z.object({
  roomTypeId: objectIdSchema,
  ratePlanId: objectIdSchema,
  quantity: z.number().int().min(1).max(10).default(1),
});

export const createBookingSchema = z.object({
  rooms: z.array(roomLineSchema).min(1).max(5),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: guestsSchema,
  contact: contactSchema,
  couponCode: z.string().trim().min(1).max(40).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).nullable().optional(),
});

export const refundBookingSchema = z.object({
  amount: z.number().int().min(1).nullable().optional(),
});

export const myBookingsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
});

export const adminBookingsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  checkInFrom: z.coerce.date().optional(),
  checkOutTo: z.coerce.date().optional(),
});

export const bookingIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RefundBookingInput = z.infer<typeof refundBookingSchema>;
export type MyBookingsQuery = z.infer<typeof myBookingsQuerySchema>;
export type AdminBookingsQuery = z.infer<typeof adminBookingsQuerySchema>;
