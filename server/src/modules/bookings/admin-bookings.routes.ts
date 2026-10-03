import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminCancelHandler,
  adminCancelPreviewHandler,
  adminCheckInHandler,
  adminCheckOutHandler,
  adminGetBookingHandler,
  adminListBookingsHandler,
  adminReassignHandler,
  adminRefundHandler,
} from "./admin-bookings.controller";
import { adminBookingsQuerySchema, bookingIdParamsSchema, cancelBookingSchema, reassignBookingSchema, refundBookingSchema } from "./booking.schema";

export const adminBookingsRouter = Router();

adminBookingsRouter.use(authenticate, authorize("admin"));
adminBookingsRouter.get("/", validate({ query: adminBookingsQuerySchema }), adminListBookingsHandler);
adminBookingsRouter.get(
  "/:id",
  validate({ params: bookingIdParamsSchema }),
  adminGetBookingHandler,
);
adminBookingsRouter.get(
  "/:id/cancel-preview",
  validate({ params: bookingIdParamsSchema }),
  adminCancelPreviewHandler,
);
adminBookingsRouter.post(
  "/:id/cancel",
  validate({ params: bookingIdParamsSchema, body: cancelBookingSchema }),
  adminCancelHandler,
);
adminBookingsRouter.post(
  "/:id/refund",
  validate({ params: bookingIdParamsSchema, body: refundBookingSchema }),
  adminRefundHandler,
);
adminBookingsRouter.post(
  "/:id/check-in",
  validate({ params: bookingIdParamsSchema }),
  adminCheckInHandler,
);
adminBookingsRouter.post(
  "/:id/check-out",
  validate({ params: bookingIdParamsSchema }),
  adminCheckOutHandler,
);
adminBookingsRouter.post(
  "/:id/reassign",
  validate({ params: bookingIdParamsSchema, body: reassignBookingSchema }),
  adminReassignHandler,
);
