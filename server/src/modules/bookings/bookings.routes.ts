import { Router } from "express";
import { validate } from "../../middleware/validate";
import { createQuoteHandler } from "./bookings.controller";
import { quoteRequestSchema } from "./quote.schema";

export const bookingsRouter = Router();

// Booking creation, holds, cancellation and My Bookings land in Phase 6.
// The quote endpoint ships now because pricing must exist before booking.
bookingsRouter.post("/quote", validate({ body: quoteRequestSchema }), createQuoteHandler);
