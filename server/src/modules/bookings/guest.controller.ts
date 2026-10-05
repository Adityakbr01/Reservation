import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { verifyAccessToken } from "../../utils/jwt";
import { findUserById } from "../users/user.repository";
import type { RequestUser } from "../../types/auth";
import { bookingSnapshot, recordAudit } from "../audit/audit.service";
import { checkGuestEmail, createGuestBooking } from "./guest.service";
import type { CheckEmailInput, GuestBookingInput } from "./guest.schema";

/** Best-effort session read: valid token links the booking, anything else stays a guest. */
async function readOptionalUser(req: Request): Promise<RequestUser | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const claims = verifyAccessToken(header.slice("Bearer ".length).trim());
    const user = await findUserById(claims.sub);
    if (!user || !user.isActive) return null;
    return { id: user.id, role: user.role };
  } catch {
    return null;
  }
}

/**
 * POST /api/public/bookings/guest — frictionless checkout.
 * Creates the HOLD booking + Stripe intent and, for new emails,
 * provisions a shadow account and returns its token so the client
 * signs the guest in silently (no login screen, higher conversion).
 */
export const createGuestBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const header = req.headers["idempotency-key"];
  const idempotencyKey = typeof header === "string" && header.length > 0 ? header : undefined;
  const session = await readOptionalUser(req);
  const result = await createGuestBooking(req.body as GuestBookingInput, {
    authUserId: session?.id ?? null,
    idempotencyKey,
  });
  if (!result.idempotentReplay) {
    await recordAudit(req, "BOOKING_CREATED", "booking", {
      entityId: result.booking.id,
      after: bookingSnapshot(result.booking),
      metadata: { guest: session ? false : true, isNewAccount: result.isNewAccount },
    });
  }
  res.status(result.idempotentReplay ? 200 : 201).json({ success: true, data: result });
});

/** POST /api/public/bookings/check-email — { exists } for the sign-in nudge. */
export const checkGuestEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await checkGuestEmail((req.body as CheckEmailInput).email);
  res.status(200).json({ success: true, data: result });
});
