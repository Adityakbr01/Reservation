import { describe, expect, test } from "bun:test";
import {
  checkInBlockReason,
  checkOutBlockReason,
} from "../src/modules/bookings/booking.service";
import type { Booking } from "../src/modules/bookings/booking.types";
import { checkedInEmail, checkedOutEmail } from "../src/emails/templates/booking";

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    bookingNumber: "QB-TEST01",
    propertyId: "p1",
    userId: "u1",
    status: "CONFIRMED",
    paymentStatus: "PAID",
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
    cancellation: { cancelledAt: null, cancelledBy: null, reason: null },
    hold: { holdId: null, expiresAt: null },
    stay: { checkedInAt: null, checkedInBy: null, checkedOutAt: null, checkedOutBy: null },
    source: "DIRECT",
    notes: null,
    reminderSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("check-in gate", () => {
  const now = new Date("2026-10-10T12:00:00Z");

  test("confirmed + paid + due date passes", () => {
    expect(checkInBlockReason(booking(), now)).toBeNull();
  });

  test("non-confirmed statuses blocked", () => {
    for (const status of ["HELD", "PAYMENT_PENDING", "CANCELLED", "EXPIRED", "CHECKED_IN"] as const) {
      expect(checkInBlockReason(booking({ status }), now)).not.toBeNull();
    }
  });

  test("unpaid blocked", () => {
    expect(checkInBlockReason(booking({ paymentStatus: "PENDING" }), now)).not.toBeNull();
  });

  test("early arrival blocked until check-in day", () => {
    const early = new Date("2026-10-09T23:59:59Z");
    expect(checkInBlockReason(booking(), early)).toContain("day");
  });

  test("missing guest email blocked", () => {
    const noEmail = booking();
    noEmail.contact.email = "";
    expect(checkInBlockReason(noEmail, now)).not.toBeNull();
  });
});

describe("check-out gate", () => {
  test("only checked-in bookings pass", () => {
    expect(checkOutBlockReason(booking({ status: "CHECKED_IN" }))).toBeNull();
    expect(checkOutBlockReason(booking({ status: "CONFIRMED" }))).not.toBeNull();
    expect(checkOutBlockReason(booking({ status: "CHECKED_OUT" }))).not.toBeNull();
  });
});

describe("stay emails", () => {
  const ctx = {
    guestName: "Neha",
    bookingReference: "QB-TEST01",
    propertyName: "House",
    roomSummary: "Deluxe",
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
    cancellationPolicy: "Free",
    supportEmail: "s@x.com",
    manageUrl: "http://localhost:5173/bookings",
  };

  test("checked-in mail welcomes with reference", () => {
    const rendered = checkedInEmail(ctx);
    expect(rendered.html).toContain("QB-TEST01");
  });

  test("checked-out mail shows total and thanks", () => {
    const rendered = checkedOutEmail(ctx);
    expect(rendered.html).toContain("INR 3000.00");
    expect(rendered.html).toContain("QB-TEST01");
  });
});
