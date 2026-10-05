import { z } from "zod";
import { createBookingSchema } from "./booking.schema";

/**
 * Guest checkout (Synxis/Dorset-style): same stay payload as an
 * authenticated booking, plus checkout acceptances and opt-ins.
 * No password is ever collected — a shadow account is provisioned
 * in the background and a token returned, so the guest never sees
 * a login screen.
 */
export const guestBookingSchema = createBookingSchema
  .extend({
    /** "I would like to create an account" — books faster next time. */
    createAccount: z.boolean().nullable().optional(),
    /**
     * Chosen password for the new account. When omitted with
     * createAccount, a set-password email is sent instead.
     */
    password: z.string().max(128).nullable().optional(),
    confirmPassword: z.string().max(128).nullable().optional(),
    /** "Yes, I would like newsletters and special offers by email." */
    newsletter: z.boolean().nullable().optional(),
    /** Privacy Terms acceptance (required). */
    acceptPrivacy: z.boolean(),
    /** Booking Conditions acceptance (required). */
    acceptTerms: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.createAccount) return;
    const password = value.password?.trim() ? value.password : null;
    const confirm = value.confirmPassword?.trim() ? value.confirmPassword : null;
    if (!password || !confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Enter and confirm a password to create your account, or uncheck the box",
      });
      return;
    }
    if (password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password must be at least 8 characters long",
      });
    }
    if (password !== confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export const checkEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
});

export type GuestBookingInput = z.infer<typeof guestBookingSchema>;
export type CheckEmailInput = z.infer<typeof checkEmailSchema>;
