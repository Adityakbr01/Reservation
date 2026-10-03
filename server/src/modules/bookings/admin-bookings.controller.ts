import type { Request, Response } from "express";
import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import {
  adminCancelBooking,
  adminRefundBooking,
  getBookingAdmin,
  listAllBookings,
  previewCancellation,
} from "./booking.service";
import type { AdminBookingsQuery, CancelBookingInput, RefundBookingInput } from "./booking.schema";

/** GET /api/v1/admin/reservations — standard paginated list contract. */
export const adminListBookingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as AdminBookingsQuery;
  const result = await listAllBookings(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/v1/admin/reservations/:id — booking with items and payments. */
export const adminGetBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getBookingAdmin(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});

/** GET /api/v1/admin/reservations/:id/cancel-preview — policy + expected refund. */
export const adminCancelPreviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const preview = await previewCancellation(req.params.id as string, null);
  res.status(200).json({ success: true, data: preview });
});

/** POST /api/v1/admin/reservations/:id/cancel — policy-gated, refunds when due. */
export const adminCancelHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CancelBookingInput;
  const booking = await adminCancelBooking(
    req.params.id as string,
    requireUser(req).id,
    body.reason ?? null,
  );
  res.status(200).json({ success: true, data: booking });
});

/** POST /api/v1/admin/reservations/:id/refund — standalone refund, no status change. */
export const adminRefundHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RefundBookingInput;
  const result = await adminRefundBooking(
    req.params.id as string,
    requireUser(req).id,
    body.amount ?? null,
  );
  res.status(201).json({ success: true, data: result });
});
