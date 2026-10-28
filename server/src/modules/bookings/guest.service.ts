import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { signAccessToken } from "../../utils/jwt";
import { isDuplicateKeyError } from "../../utils/mongo";
import { forgotPassword } from "../auth/auth.service";
import { NewsletterModel } from "../newsletter/newsletter.model";
import { createPaymentIntent } from "../payments/payment.service";
import { createUser, findUserByEmail, findUserById, toSafeUser } from "../users/user.repository";
import type { SafeUser, UserRole } from "../users/user.types";
import { createBooking } from "./booking.service";
import type { Booking, BookingItem } from "./booking.types";
import type { GuestBookingInput } from "./guest.schema";

const BCRYPT_ROUNDS = 10;

/** Lowercase + trim so guest emails match accounts regardless of casing. Pure — unit-tested. */
export function normalizeGuestEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "First Last" capped at the user-name limit. Pure — unit-tested. */
export function guestDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim().slice(0, 80) || "Guest";
}

/** Checkout acceptances are mandatory (policies acknowledgement). Pure — unit-tested. */
export function assertGuestAcceptances(acceptPrivacy: boolean, acceptTerms: boolean): void {
  if (!acceptPrivacy || !acceptTerms) {
    throw new AppError(
      "Please accept the Privacy Terms and Booking Conditions to continue",
      400,
      "ACCEPTANCES_REQUIRED",
    );
  }
}

export interface GuestBookingResult {
  booking: Booking;
  items: BookingItem[];
  user: SafeUser;
  /** Present when an account is linked or created (silent login). */
  token: string | null;
  isNewAccount: boolean;
  idempotentReplay: boolean;
  payment: { paymentId: string; clientSecret: string; reused: boolean } | null;
  paymentError: string | null;
}

export interface GuestBookingOptions {
  /** Authenticated caller, when a valid session was presented. */
  authUserId: string | null;
  idempotencyKey?: string;
}

/**
 * Frictionless guest checkout.
 * If user exists, associates the booking with their existing account and continues.
 * Never blocks the guest checkout flow.
 */
export async function createGuestBooking(
  input: GuestBookingInput,
  options: GuestBookingOptions,
): Promise<GuestBookingResult> {
  assertGuestAcceptances(input.acceptPrivacy, input.acceptTerms);
  const email = normalizeGuestEmail(input.contact.email);

  let user: SafeUser;
  let token: string | null = null;
  let isNewAccount = false;

  if (options.authUserId) {
    const sessionUser = await findUserById(options.authUserId);
    if (!sessionUser) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    user = sessionUser;
  } else {
    const existing = await findUserByEmail(email);
    if (existing) {
      if (!existing.isActive) {
        throw new AppError("This account has been suspended", 403, "ACCOUNT_SUSPENDED");
      }
      user = existing;
      const issueRole: UserRole = existing.role === "admin" ? "user" : existing.role;
      token = signAccessToken(existing.id, issueRole);
      isNewAccount = false;
    } else {
      try {
        // Book Faster: the guest chose their own password, so the account is
        // ready immediately. Otherwise the password is random and a
        // set-password email goes out only when createAccount was ticked.
        const chosenPassword = input.createAccount ? (input.password?.trim() ? input.password : null) : null;
        const passwordHash = await bcrypt.hash(
          chosenPassword ?? randomBytes(32).toString("hex"),
          BCRYPT_ROUNDS,
        );
        const doc = await createUser({
          name: guestDisplayName(input.contact.firstName, input.contact.lastName),
          email,
          passwordHash,
          role: "user",
        });
        user = toSafeUser(doc);
        token = signAccessToken(user.id, user.role);
        isNewAccount = true;
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          const raceUser = await findUserByEmail(email);
          if (raceUser) {
            user = raceUser;
            const issueRole: UserRole = raceUser.role === "admin" ? "user" : raceUser.role;
            token = signAccessToken(raceUser.id, issueRole);
            isNewAccount = false;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  }

  const result = await createBooking(
    user.id,
    {
      rooms: input.rooms,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      contact: { ...input.contact, email },
      couponCode: input.couponCode,
      notes: input.notes ?? null,
    },
    options.idempotencyKey,
  );

  let payment: GuestBookingResult["payment"] = null;
  let paymentError: string | null = null;
  try {
    const intent = await createPaymentIntent(user.id, result.booking.id);
    payment = { paymentId: intent.payment.id, clientSecret: intent.clientSecret, reused: intent.reused };
  } catch (error) {
    // Hold exists and is retryable via the authenticated intent endpoint
    // (the guest now holds a session). Never lose the booking to Stripe downtime.
    paymentError = error instanceof AppError ? error.code : "PAYMENT_INTENT_FAILED";
    logger.warn("Guest booking payment-intent failed, hold kept for retry", {
      bookingId: result.booking.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (input.newsletter) {
    try {
      const normalizedEmail = email.toUpperCase();
      const existingSub = await NewsletterModel.findOne({ normalizedEmail }).exec();
      if (existingSub) {
        existingSub.status = "SUBSCRIBED";
        await existingSub.save();
      } else {
        await NewsletterModel.create({
          email,
          normalizedEmail,
          name: guestDisplayName(input.contact.firstName, input.contact.lastName),
          source: "checkout",
          status: "SUBSCRIBED",
        });
      }
    } catch {
      // Newsletter must never block booking.
    }
  }

  const passwordSupplied = !!input.createAccount && !!input.password?.trim();
  if (input.createAccount && isNewAccount && !passwordSupplied) {
    try {
      // No password chosen — send the set-password email; best-effort by contract.
      await forgotPassword({ email });
    } catch {
      // Booking stands regardless of email delivery.
    }
  }

  return {
    booking: result.booking,
    items: result.items,
    user,
    token,
    isNewAccount,
    idempotentReplay: result.idempotentReplay,
    payment,
    paymentError,
  };
}

/** Email-exists probe for the checkout UX (returning guests get a sign-in nudge). */
export async function checkGuestEmail(email: string): Promise<{ exists: boolean }> {
  const existing = await findUserByEmail(normalizeGuestEmail(email));
  return { exists: !!existing };
}
