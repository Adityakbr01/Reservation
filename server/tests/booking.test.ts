import { describe, expect, test } from "bun:test";
import { shouldExpireHold } from "../src/modules/bookings/booking.service";

const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 60_000);

describe("shouldExpireHold", () => {
  test("expires HELD and PAYMENT_PENDING past their hold time", () => {
    expect(shouldExpireHold("HELD", past)).toBe(true);
    expect(shouldExpireHold("PAYMENT_PENDING", past)).toBe(true);
  });

  test("keeps live holds", () => {
    expect(shouldExpireHold("HELD", future)).toBe(false);
    expect(shouldExpireHold("HELD", null)).toBe(false);
  });

  test("never expires terminal or active states", () => {
    for (const status of ["CONFIRMED", "CHECKED_IN", "CANCELLED", "EXPIRED", "DRAFT"] as const) {
      expect(shouldExpireHold(status, past)).toBe(false);
    }
  });
});

describe("bookingNumber", () => {
  test("generateBookingNumber format is QB-XXXXXX without ambiguous chars", async () => {
    const { generateBookingNumber } = await import("../src/modules/bookings/booking.repository");
    for (let i = 0; i < 20; i += 1) {
      const value = generateBookingNumber();
      expect(value).toMatch(/^QB-[A-Z2-9]{6}$/);
      expect(value).not.toMatch(/[01IO]/);
    }
  });
});
