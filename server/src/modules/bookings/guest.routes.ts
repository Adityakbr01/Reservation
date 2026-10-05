import { Router } from "express";
import { validate } from "../../middleware/validate";
import { checkGuestEmailHandler, createGuestBookingHandler } from "./guest.controller";
import { checkEmailSchema, guestBookingSchema } from "./guest.schema";

export const publicBookingsRouter = Router();

publicBookingsRouter.post(
  "/guest",
  validate({ body: guestBookingSchema }),
  createGuestBookingHandler,
);
publicBookingsRouter.post(
  "/check-email",
  validate({ body: checkEmailSchema }),
  checkGuestEmailHandler,
);
