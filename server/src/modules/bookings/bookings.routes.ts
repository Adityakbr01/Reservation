import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { idParamsSchema } from "../../utils/validators";
import {
  cancelBookingHandler,
  createBookingHandler,
  createQuoteHandler,
  getBookingHandler,
  getBookingReceiptHandler,
  getMyBookingHandler,
  listMyBookingsHandler,
} from "./bookings.controller";
import {
  bookingIdParamsSchema,
  cancelBookingSchema,
  createBookingSchema,
  myBookingsQuerySchema,
} from "./booking.schema";
import { quoteRequestSchema } from "./quote.schema";

export const bookingsRouter = Router();

// Booking creation, holds, cancellation and My Bookings land in Phase 6.
// The quote endpoint ships now because pricing must exist before booking.
bookingsRouter.post("/quote", validate({ body: quoteRequestSchema }), createQuoteHandler);
bookingsRouter.post("/", authenticate, validate({ body: createBookingSchema }), createBookingHandler);
bookingsRouter.get(
  "/:id/receipt",
  authenticate,
  validate({ params: bookingIdParamsSchema }),
  getBookingReceiptHandler,
);
bookingsRouter.get(
  "/:id",
  authenticate,
  validate({ params: bookingIdParamsSchema }),
  getBookingHandler,
);
bookingsRouter.post(
  "/:id/cancel",
  authenticate,
  validate({ params: bookingIdParamsSchema, body: cancelBookingSchema }),
  cancelBookingHandler,
);

export const meBookingsRouter = Router();

meBookingsRouter.use(authenticate);
meBookingsRouter.get("/", validate({ query: myBookingsQuerySchema }), listMyBookingsHandler);
meBookingsRouter.get(
  "/:id",
  validate({ params: idParamsSchema }),
  getMyBookingHandler,
);
