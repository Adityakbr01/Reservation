import { describe, expect, test } from "bun:test";
import {
  assertGuestAcceptances,
  guestDisplayName,
  normalizeGuestEmail,
} from "../src/modules/bookings/guest.service";
import { guestBookingSchema } from "../src/modules/bookings/guest.schema";

describe("normalizeGuestEmail", () => {
  test("trims and lowercases so guests match accounts regardless of casing", () => {
    expect(normalizeGuestEmail("  Guest@Example.COM ")).toBe("guest@example.com");
  });
});

describe("guestDisplayName", () => {
  test("joins first and last name", () => {
    expect(guestDisplayName("Ada", "Lovelace")).toBe("Ada Lovelace");
  });

  test("caps at the user-name limit and falls back for blanks", () => {
    expect(guestDisplayName("A".repeat(100), "B".repeat(100))).toHaveLength(80);
    expect(guestDisplayName("  ", "  ")).toBe("Guest");
  });
});

describe("assertGuestAcceptances", () => {
  test("passes when both policies are accepted", () => {
    expect(() => assertGuestAcceptances(true, true)).not.toThrow();
  });

  test("rejects when either acknowledgement is missing", () => {
    expect(() => assertGuestAcceptances(false, true)).toThrow("Privacy Terms");
    expect(() => assertGuestAcceptances(true, false)).toThrow("Privacy Terms");
  });
});

describe("guestBookingSchema", () => {
  const base = {
    rooms: [{ roomTypeId: "507f1f77bcf86cd799439011", ratePlanId: "507f1f77bcf86cd799439012", quantity: 1 }],
    checkIn: new Date(Date.now() + 86_400_000),
    checkOut: new Date(Date.now() + 2 * 86_400_000),
    guests: { adults: 2, children: 0 },
    contact: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: "+911234567890" },
    acceptPrivacy: true,
    acceptTerms: true,
  };

  test("accepts checkout address fields and opt-ins", () => {
    const parsed = guestBookingSchema.parse({
      ...base,
      contact: { ...base.contact, title: "Ms", postcode: "SW1A 1AA", country: "UK" },
      createAccount: true,
      password: "correct horse 1!",
      confirmPassword: "correct horse 1!",
      newsletter: false,
    });
    expect(parsed.contact.postcode).toBe("SW1A 1AA");
    expect(parsed.createAccount).toBe(true);
  });

  test("acceptances travel with the payload for the service guard", () => {
    const parsed = guestBookingSchema.parse({ ...base, acceptPrivacy: false, acceptTerms: true });
    try {
      assertGuestAcceptances(parsed.acceptPrivacy, parsed.acceptTerms);
      expect.unreachable();
    } catch (error) {
      expect((error as { code?: string }).code).toBe("ACCEPTANCES_REQUIRED");
    }
  });

  test("book-faster passwords must be entered, long enough, and matching", () => {
    expect(() =>
      guestBookingSchema.parse({ ...base, createAccount: true, password: "short", confirmPassword: "short" }),
    ).toThrow("at least 8 characters");
    expect(() =>
      guestBookingSchema.parse({
        ...base,
        createAccount: true,
        password: "correct horse 1!",
        confirmPassword: "different horse 2?",
      }),
    ).toThrow("do not match");
    expect(() =>
      guestBookingSchema.parse({ ...base, createAccount: true, password: "correct horse 1!" }),
    ).toThrow("confirm a password");
    const parsed = guestBookingSchema.parse({
      ...base,
      createAccount: true,
      password: "correct horse 1!",
      confirmPassword: "correct horse 1!",
    });
    expect(parsed.password).toBe("correct horse 1!");
  });

  test("account creation stays optional — plain guests pass without passwords", () => {
    const parsed = guestBookingSchema.parse({ ...base });
    expect(parsed.createAccount).toBeUndefined();
    expect(parsed.password).toBeUndefined();
  });
});
