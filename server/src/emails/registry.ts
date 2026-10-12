/**
 * Email template registry — the single catalogue of every reusable
 * Hamptworth Stays template (docs: brand email system).
 *
 * Code templates in `templates/*` are the safe defaults. Admin-editable
 * DB overrides (see `modules/emailTemplates`) reuse these keys and
 * variable lists; anything disabled or missing falls back to code.
 */
import { money } from "./shared";
import type { BookingEmailContext } from "./templates/booking";

export const EMAIL_TEMPLATE_KEYS = [
  "BOOKING_RECEIVED",
  "BOOKING_CONFIRMED",
  "PAYMENT_FAILED",
  "REFUND_UPDATED",
  "BOOKING_CANCELLED",
  "CHECKIN_REMINDER",
  "CHECKED_IN",
  "CHECKED_OUT",
  "PASSWORD_RESET",
  "PASSWORD_CHANGED",
  "WELCOME",
  "REGISTER", // TODO: Implement this template
  "ADMIN_NEW_BOOKING",
  "ADMIN_PAYMENT_FAILURE",
  "ADMIN_CANCELLATION",
  "ADMIN_SOLD_OUT",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export const EMAIL_TEMPLATE_CATEGORIES = [
  "booking",
  "payment",
  "account",
  "admin",
] as const;

export type EmailTemplateCategory = (typeof EMAIL_TEMPLATE_CATEGORIES)[number];

export interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  /** {{variables}} the template may use. Required ones must render non-blank. */
  requiredVars: string[];
  optionalVars: string[];
  /** Guest-facing transactional mail always keeps its code fallback when disabled. */
  essential: boolean;
  /** Queue type that triggers it, if any (auth mails send directly). */
  notificationType: string | null;
}

export const EMAIL_TEMPLATE_DEFINITIONS: Record<
  EmailTemplateKey,
  EmailTemplateDefinition
> = {
  BOOKING_RECEIVED: {
    key: "BOOKING_RECEIVED",
    name: "Booking received (hold)",
    category: "booking",
    description:
      "Sent when a booking is created and rooms are held pending payment.",
    requiredVars: [
      "guestName",
      "cottageName",
      "brandName",
      "bookingReference",
      "checkIn",
      "checkOut",
      "manageUrl",
    ],
    optionalVars: [
      "nights",
      "guests",
      "total",
      "propertyAddress",
      "mapsUrl",
      "brandSiteUrl",
      "bookingSiteUrl",
      "supportEmail",
    ],
    essential: true,
    notificationType: "BOOKING_RECEIVED",
  },
  BOOKING_CONFIRMED: {
    key: "BOOKING_CONFIRMED",
    name: "Booking confirmation",
    category: "booking",
    description:
      "Sent after payment succeeds and the booking is confirmed. Doubles as payment confirmation.",
    requiredVars: [
      "guestName",
      "cottageName",
      "brandName",
      "bookingReference",
      "checkIn",
      "checkOut",
      "manageUrl",
    ],
    optionalVars: [
      "nights",
      "guests",
      "total",
      "totalPaid",
      "paymentStatus",
      "cancellationPolicy",
      "checkInTime",
      "checkOutTime",
      "propertyAddress",
      "mapsUrl",
      "brandSiteUrl",
      "bookingSiteUrl",
      "supportEmail",
    ],
    essential: true,
    notificationType: "BOOKING_CONFIRMED",
  },
  PAYMENT_FAILED: {
    key: "PAYMENT_FAILED",
    name: "Payment failed",
    category: "payment",
    description:
      "Sent when the bank declines the charge while the hold is still alive.",
    requiredVars: [
      "guestName",
      "bookingReference",
      "holdExpiresAt",
      "manageUrl",
    ],
    optionalVars: ["brandName", "supportEmail"],
    essential: true,
    notificationType: "PAYMENT_FAILED",
  },
  REFUND_UPDATED: {
    key: "REFUND_UPDATED",
    name: "Refund update",
    category: "payment",
    description: "Sent when a refund changes state for a captured payment.",
    requiredVars: [
      "guestName",
      "bookingReference",
      "refundAmount",
      "refundStatus",
    ],
    optionalVars: ["brandName", "supportEmail"],
    essential: true,
    notificationType: "REFUND_UPDATED",
  },
  BOOKING_CANCELLED: {
    key: "BOOKING_CANCELLED",
    name: "Booking cancellation",
    category: "booking",
    description:
      "Sent after a cancellation is confirmed, with refund details where due.",
    requiredVars: [
      "guestName",
      "bookingReference",
      "checkIn",
      "checkOut",
      "cancelledAt",
    ],
    optionalVars: [
      "cottageName",
      "brandName",
      "refundAmount",
      "refundStatus",
      "supportEmail",
    ],
    essential: true,
    notificationType: "BOOKING_CANCELLED",
  },
  CHECKIN_REMINDER: {
    key: "CHECKIN_REMINDER",
    name: "Pre-arrival / check-in instructions",
    category: "booking",
    description:
      "Sent before check-in with arrival times, address and directions.",
    requiredVars: [
      "guestName",
      "cottageName",
      "brandName",
      "bookingReference",
      "checkIn",
      "manageUrl",
    ],
    optionalVars: [
      "checkOut",
      "nights",
      "guests",
      "checkInTime",
      "checkOutTime",
      "propertyAddress",
      "mapsUrl",
      "brandSiteUrl",
      "bookingSiteUrl",
      "supportEmail",
    ],
    essential: true,
    notificationType: "CHECKIN_REMINDER",
  },
  CHECKED_IN: {
    key: "CHECKED_IN",
    name: "Welcome (checked in)",
    category: "booking",
    description:
      "Sent after an admin marks the booking checked in — never before.",
    requiredVars: ["guestName", "cottageName", "brandName", "bookingReference"],
    optionalVars: [
      "checkOut",
      "checkOutTime",
      "brandSiteUrl",
      "bookingSiteUrl",
      "supportEmail",
    ],
    essential: true,
    notificationType: "CHECKED_IN",
  },
  CHECKED_OUT: {
    key: "CHECKED_OUT",
    name: "Checkout thank-you",
    category: "booking",
    description:
      "Sent only after genuine checkout. Never on checkout-date arrival alone.",
    requiredVars: ["guestName", "cottageName", "brandName", "bookingReference"],
    optionalVars: [
      "total",
      "paymentStatus",
      "brandSiteUrl",
      "bookingSiteUrl",
      "supportEmail",
    ],
    essential: true,
    notificationType: "CHECKED_OUT",
  },
  PASSWORD_RESET: {
    key: "PASSWORD_RESET",
    name: "Password reset request",
    category: "account",
    description:
      "Sent after a valid reset flow generates the single-use, time-limited URL.",
    requiredVars: ["guestName", "brandName", "resetUrl"],
    optionalVars: ["brandSiteUrl", "bookingSiteUrl", "expiryNote"],
    essential: true,
    notificationType: null,
  },
  PASSWORD_CHANGED: {
    key: "PASSWORD_CHANGED",
    name: "Password successfully reset",
    category: "account",
    description:
      "Sent only after the password update succeeds. Never includes the password or token.",
    requiredVars: ["guestName", "brandName", "loginUrl"],
    optionalVars: ["brandSiteUrl", "bookingSiteUrl"],
    essential: true,
    notificationType: null,
  },
  WELCOME: {
    key: "WELCOME",
    name: "Welcome (new account)",
    category: "account",
    description:
      "Sent after registration succeeds. No verification flow exists yet.",
    requiredVars: ["guestName", "brandName"],
    optionalVars: ["brandSiteUrl", "bookingSiteUrl", "loginUrl"],
    essential: false,
    notificationType: null,
  },

  REGISTER: {
    key: "REGISTER",
    name: "Registration",
    category: "account",
    description:
      "Sent after registration succeeds. No verification flow exists yet.",
    requiredVars: ["guestName", "brandName"],
    optionalVars: ["brandSiteUrl", "bookingSiteUrl", "loginUrl"],
    essential: false,
    notificationType: null,
  },
  ADMIN_NEW_BOOKING: {
    key: "ADMIN_NEW_BOOKING",
    name: "Admin: new booking",
    category: "admin",
    description: "Staff alert for a newly confirmed booking.",
    requiredVars: ["bookingReference", "headline", "detail", "adminUrl"],
    optionalVars: [],
    essential: false,
    notificationType: "ADMIN_NEW_BOOKING",
  },
  ADMIN_PAYMENT_FAILURE: {
    key: "ADMIN_PAYMENT_FAILURE",
    name: "Admin: payment failure",
    category: "admin",
    description: "Staff alert when a guest payment fails.",
    requiredVars: ["bookingReference", "headline", "detail", "adminUrl"],
    optionalVars: [],
    essential: false,
    notificationType: "ADMIN_PAYMENT_FAILURE",
  },
  ADMIN_CANCELLATION: {
    key: "ADMIN_CANCELLATION",
    name: "Admin: booking cancelled",
    category: "admin",
    description: "Staff alert when a booking is cancelled.",
    requiredVars: ["bookingReference", "headline", "detail", "adminUrl"],
    optionalVars: [],
    essential: false,
    notificationType: "ADMIN_CANCELLATION",
  },
  ADMIN_SOLD_OUT: {
    key: "ADMIN_SOLD_OUT",
    name: "Admin: fully booked",
    category: "admin",
    description: "Staff alert when a date range sells out.",
    requiredVars: ["bookingReference", "headline", "detail", "adminUrl"],
    optionalVars: [],
    essential: false,
    notificationType: "ADMIN_SOLD_OUT",
  },
};

export function templateDefinition(
  key: EmailTemplateKey,
): EmailTemplateDefinition {
  return EMAIL_TEMPLATE_DEFINITIONS[key];
}

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}

/** Realistic Hamptworth dummy data for admin previews — never real guest data. */
export function dummyBookingContext(): BookingEmailContext {
  return {
    guestName: "Alexandra Morgan",
    bookingReference: "QB-HX7K2P",
    propertyName: "Hamptworth Stays",
    roomSummary: "Fern Cottage",
    checkIn: "20 Dec 2026",
    checkOut: "23 Dec 2026",
    nights: 3,
    guests: "2 adults",
    currency: "GBP",
    subtotal: 45000,
    discount: 0,
    taxes: 9000,
    fees: 0,
    total: 54000,
    totalPaid: 54000,
    paymentStatus: "paid",
    cancellationPolicy:
      "Free cancellation until 48h before check-in (100% refund).",
    supportEmail: "stay@hamptworthstays.com",
    manageUrl: "https://book.hamptworthstays.com/bookings",
    checkInTime: "16:00",
    checkOutTime: "11:00",
    propertyAddress: "Home Farm, Hamptworth, SP5 2DS",
    mapsUrl: null,
    brandName: "Hamptworth Stays",
    brandSiteUrl: "https://hamptworthstays.com/",
    bookingSiteUrl: "https://book.hamptworthstays.com/",
  };
}

/** String {{var}} map for DB-override placeholder rendering previews. */
export function dummyStringVars(key: EmailTemplateKey): Record<string, string> {
  const booking = dummyBookingContext();
  const base: Record<string, string> = {
    guestName: booking.guestName,
    propertyName: booking.propertyName,
    brandName: "Hamptworth Stays",
    cottageName: booking.roomSummary,
    bookingReference: booking.bookingReference,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: String(booking.nights),
    guests: booking.guests,
    currency: booking.currency,
    total: money(booking.total, booking.currency),
    totalPaid: money(booking.totalPaid, booking.currency),
    paymentStatus: booking.paymentStatus,
    cancellationPolicy: booking.cancellationPolicy,
    supportEmail: booking.supportEmail,
    manageUrl: booking.manageUrl,
    checkInTime: "After 4 pm",
    checkOutTime: "Before 11 am",
    propertyAddress: booking.propertyAddress ?? "",
    mapsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Home+Farm%2C+Hamptworth",
    brandSiteUrl: "https://hamptworthstays.com/",
    bookingSiteUrl: "https://book.hamptworthstays.com/",
    holdExpiresAt: "23 Dec 2026, 4:00 pm",
    cancelledAt: "18 Dec 2026",
    refundAmount: money(54000, "GBP"),
    refundStatus: "succeeded",
    headline: "New booking",
    detail: "Alexandra Morgan, Fern Cottage, 20 Dec 2026 → 23 Dec 2026.",
    adminUrl: "https://admin.hamptworthstays.com/reservations/abc123",
    resetUrl:
      "https://book.hamptworthstays.com/reset-password?token=preview-token",
    loginUrl: "https://book.hamptworthstays.com/login",
    expiryNote: "For your security, the reset link expires after 1 hour.",
  };
  const def = templateDefinition(key);
  const vars: Record<string, string> = {};
  for (const name of [...def.requiredVars, ...def.optionalVars]) {
    vars[name] = base[name] ?? "";
  }
  // Admin alerts render per-template headline/detail copy in code defaults —
  // mirror it here so restoration and previews stay exact.
  if (key === "ADMIN_PAYMENT_FAILURE") {
    vars.headline = "Payment failure";
    vars.detail = "Payment for Alexandra Morgan failed. Booking is failed.";
  } else if (key === "ADMIN_CANCELLATION") {
    vars.headline = "Booking cancelled";
    vars.detail = "Cancelled by guest/admin. Payment state: paid.";
  } else if (key === "ADMIN_SOLD_OUT") {
    vars.headline = "Fully booked";
    vars.detail = "All rooms are now sold for 20 Dec 2026 → 23 Dec 2026. Triggered by this booking.";
  }
  return vars;
}
