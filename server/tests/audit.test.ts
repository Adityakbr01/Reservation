import { describe, expect, test } from "bun:test";
import { auditContextFrom, bookingSnapshot } from "../src/modules/audit/audit.service";
import { AUDIT_ACTIONS } from "../src/modules/audit/audit.model";
import type { Booking } from "../src/modules/bookings/booking.types";

function booking(): Booking {
  return {
    id: "b1",
    bookingNumber: "QB-TEST01",
    propertyId: "p1",
    userId: "u1",
    status: "CANCELLED",
    paymentStatus: "REFUNDED",
    checkIn: new Date("2026-10-10T00:00:00Z"),
    checkOut: new Date("2026-10-12T00:00:00Z"),
    guests: { adults: 2, children: 0 },
    contact: { firstName: "Neha", lastName: "K", email: "n@example.com", phone: "+91" },
    pricing: {
      currency: "INR",
      subtotal: 300000,
      discount: 0,
      taxes: 0,
      fees: 0,
      total: 300000,
      couponCode: null,
    },
    cancellation: { cancelledAt: new Date(), cancelledBy: "a1", reason: "guest" },
    hold: { holdId: null, expiresAt: null },
    stay: { checkedInAt: null, checkedInBy: null, checkedOutAt: null, checkedOutBy: null },
    source: "DIRECT",
    notes: null,
    reminderSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("audit snapshots", () => {
  test("booking snapshot carries statuses and money only", () => {
    const snap = bookingSnapshot(booking());
    expect(snap).toEqual({
      bookingNumber: "QB-TEST01",
      status: "CANCELLED",
      paymentStatus: "REFUNDED",
      total: 300000,
      currency: "INR",
    });
  });

  test("snapshot never leaks contact, notes, or ids", () => {
    const raw = JSON.stringify(bookingSnapshot(booking()));
    expect(raw).not.toContain("n@example.com");
    expect(raw).not.toContain("+91");
    expect(raw).not.toContain("u1");
  });

  test("action allow-list covers the audited flows", () => {
    for (const action of [
      "BOOKING_CREATED",
      "BOOKING_CANCELLED",
      "BOOKING_CHECKED_IN",
      "BOOKING_CHECKED_OUT",
      "PAYMENT_REFUNDED",
      "CMS_PUBLISHED",
      "SETTINGS_UPDATED",
    ] as const) {
      expect(AUDIT_ACTIONS).toContain(action);
    }
  });
});

describe("audit request context", () => {
  function req(headers: Record<string, string | string[]>, user?: { id: string; role: "user" | "admin" }) {
    return {
      headers,
      socket: { remoteAddress: "127.0.0.1" },
      user,
    } as unknown as Parameters<typeof auditContextFrom>[0];
  }

  test("prefers the first forwarded ip and truncates user agent", () => {
    const ctx = auditContextFrom(
      req(
        { "x-forwarded-for": "9.9.9.9, 1.1.1.1", "user-agent": "x".repeat(500) },
        { id: "a1", role: "admin" },
      ),
    );
    expect(ctx.ip).toBe("9.9.9.9");
    expect(ctx.actorId).toBe("a1");
    expect(ctx.actorRole).toBe("admin");
    expect(ctx.userAgent?.length).toBeLessThanOrEqual(300);
  });

  test("anonymous requests record null actor with socket ip", () => {
    const ctx = auditContextFrom(req({}));
    expect(ctx.actorId).toBeNull();
    expect(ctx.ip).toBe("127.0.0.1");
  });
});
