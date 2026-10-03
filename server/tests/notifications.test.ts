import { describe, expect, test } from "bun:test";
import { escapeHtml } from "../src/emails/shared";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingReceivedEmail,
  checkinReminderEmail,
} from "../src/emails/templates/booking";
import type { BookingEmailContext } from "../src/emails/templates/booking";
import { paymentFailedEmail, refundUpdatedEmail } from "../src/emails/templates/payment";
import { adminAlertEmail } from "../src/emails/templates/admin";
import { passwordResetEmail } from "../src/emails/templates/auth";
import {
  MAX_ATTEMPTS,
  idempotencyKeyFor,
  nextRetryDelayMs,
  notificationKeys,
} from "../src/modules/notifications/notification.types";

const BASE: BookingEmailContext = {
  guestName: "Neha Kumari",
  bookingReference: "QB-ABC123",
  propertyName: "Reservation House",
  roomSummary: "Deluxe Room",
  checkIn: "10 Oct 2026",
  checkOut: "12 Oct 2026",
  nights: 2,
  guests: "2 adults",
  currency: "INR",
  subtotal: 300000,
  discount: 0,
  taxes: 0,
  fees: 0,
  total: 300000,
  totalPaid: 300000,
  paymentStatus: "paid",
  cancellationPolicy: "Free cancellation until 24h before check-in (100% refund).",
  supportEmail: "stay@example.com",
  manageUrl: "http://localhost:5173/bookings",
};

describe("email templates", () => {
  test("confirmation carries the booking reference, never the mongo id", () => {
    const rendered = bookingConfirmedEmail(BASE);
    expect(rendered.subject).toContain("QB-ABC123");
    expect(rendered.html).toContain("QB-ABC123");
    expect(rendered.html).not.toContain("6ac0f25362199fc62a591eea");
  });

  test("received mail warns about hold expiry", () => {
    const rendered = bookingReceivedEmail(BASE);
    expect(rendered.html.toLowerCase()).toContain("hold");
  });

  test("cancelled mail with zero refund says none due", () => {
    const rendered = bookingCancelledEmail({
      ...BASE,
      cancelledAt: "2026-10-03",
      refundAmount: 0,
      refundStatus: "none",
    });
    expect(rendered.html).toContain("No refund was due");
  });

  test("cancelled mail with refund shows amount and status", () => {
    const rendered = bookingCancelledEmail({
      ...BASE,
      cancelledAt: "2026-10-03",
      refundAmount: 300000,
      refundStatus: "succeeded",
    });
    expect(rendered.html).toContain("INR 3000.00");
    expect(rendered.html).toContain("succeeded");
  });

  test("payment-failed mail never carries card data and mentions retry", () => {
    const rendered = paymentFailedEmail({
      guestName: "Neha",
      bookingReference: "QB-ABC123",
      holdExpiresAt: "2026-10-04T10:00:00Z",
      supportEmail: "stay@example.com",
      manageUrl: "http://localhost:5173/bookings",
    });
    expect(rendered.html.toLowerCase()).toContain("retry");
    expect(rendered.html).not.toMatch(/card number|cvv|secret/i);
  });

  test("refund update shows amount and status", () => {
    const rendered = refundUpdatedEmail({
      guestName: "Neha",
      bookingReference: "QB-ABC123",
      currency: "INR",
      refundAmount: 150000,
      refundStatus: "succeeded",
      supportEmail: "stay@example.com",
    });
    expect(rendered.html).toContain("INR 1500.00");
  });

  test("reminder mentions check-in date and rooms", () => {
    const rendered = checkinReminderEmail(BASE);
    expect(rendered.html).toContain("10 Oct 2026");
    expect(rendered.html).toContain("Deluxe Room");
  });

  test("admin alert links the booking reference", () => {
    const rendered = adminAlertEmail(
      {
        bookingReference: "QB-ABC123",
        headline: "New booking",
        detail: "Paid in full.",
        adminUrl: "http://localhost:5174/reservations/abc",
      },
      "New booking",
    );
    expect(rendered.subject).toContain("QB-ABC123");
    expect(rendered.html).toContain("http://localhost:5174/reservations/abc");
  });

  test("password reset mail escapes the name and encodes the token url", () => {
    const rendered = passwordResetEmail("<b>Neha</b>", "http://x/reset-password?token=abc");
    expect(rendered.html).not.toContain("<b>Neha</b>");
    expect(rendered.html).toContain("&lt;b&gt;Neha&lt;/b&gt;");
  });

  test("escapeHtml covers all interpolated contexts", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("notification idempotency keys", () => {
  test("same event maps to the same key", () => {
    expect(notificationKeys.bookingConfirmed("b1")).toBe(notificationKeys.bookingConfirmed("b1"));
    expect(notificationKeys.refundUpdated("re_1")).toBe(
      idempotencyKeyFor("REFUND_UPDATED", "re_1"),
    );
  });

  test("different events map to different keys", () => {
    expect(notificationKeys.bookingConfirmed("b1")).not.toBe(
      notificationKeys.bookingConfirmed("b2"),
    );
    expect(notificationKeys.paymentFailed("pi_1", "evt_1")).not.toBe(
      notificationKeys.paymentFailed("pi_1", "evt_2"),
    );
    expect(notificationKeys.checkinReminder("b1", new Date("2026-10-10"))).not.toBe(
      notificationKeys.checkinReminder("b1", new Date("2026-10-11")),
    );
  });
});

describe("retry backoff", () => {
  test("immediate first attempt, then 1m/5m/15m/1h, then terminal", () => {
    expect(nextRetryDelayMs(0)).toBe(0);
    expect(nextRetryDelayMs(1)).toBe(60_000);
    expect(nextRetryDelayMs(2)).toBe(300_000);
    expect(nextRetryDelayMs(3)).toBe(900_000);
    expect(nextRetryDelayMs(4)).toBe(3_600_000);
    expect(nextRetryDelayMs(5)).toBeNull();
    expect(MAX_ATTEMPTS).toBe(5);
  });
});
