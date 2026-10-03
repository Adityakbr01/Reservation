import type { Request, Response } from "express";
import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { cancelBooking, createBooking, getBooking, listMyBookings } from "./booking.service";
import { createQuote } from "./quote.service";
import type { QuoteRequest } from "./quote.schema";
import type {
  CancelBookingInput,
  CreateBookingInput,
  MyBookingsQuery,
} from "./booking.schema";

/** POST /api/v1/bookings/quote — 201 with a TTL-bound authoritative quote. */
export const createQuoteHandler = asyncHandler(async (req: Request, res: Response) => {
  const quote = await createQuote(req.body as QuoteRequest);
  res.status(201).json({ success: true, data: quote });
});

/**
 * POST /api/v1/bookings — 201 HELD booking with inventory hold.
 * Optional Idempotency-Key header replays the original instead of
 * double-booking on retries.
 */
export const createBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const header = req.headers["idempotency-key"];
  const idempotencyKey = typeof header === "string" && header.length > 0 ? header : undefined;
  const result = await createBooking(
    requireUser(req).id,
    req.body as CreateBookingInput,
    idempotencyKey,
  );
  res.status(result.idempotentReplay ? 200 : 201).json({ success: true, data: result });
});

/** GET /api/v1/bookings/:id — owner only (others get 404, no leakage). */
export const getBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getBooking(req.params.id as string, requireUser(req).id);
  res.status(200).json({ success: true, data: result });
});

/** POST /api/v1/bookings/:id/cancel — owner only. */
export const cancelBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CancelBookingInput;
  const booking = await cancelBooking(
    req.params.id as string,
    requireUser(req).id,
    body.reason ?? null,
  );
  res.status(200).json({ success: true, data: booking });
});

/** GET /api/me/bookings — standard paginated list contract. */
export const listMyBookingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as MyBookingsQuery;
  const result = await listMyBookings(requireUser(req).id, query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/me/bookings/:id — owner only. */
export const getMyBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getBooking(req.params.id as string, requireUser(req).id);
  res.status(200).json({ success: true, data: result });
});
