import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { createQuote } from "./quote.service";
import type { QuoteRequest } from "./quote.schema";

/** POST /api/v1/bookings/quote — 201 with a TTL-bound authoritative quote. */
export const createQuoteHandler = asyncHandler(async (req: Request, res: Response) => {
  const quote = await createQuote(req.body as QuoteRequest);
  res.status(201).json({ success: true, data: quote });
});
