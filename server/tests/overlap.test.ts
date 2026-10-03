import { describe, expect, test } from "bun:test";
import { isOverlappingStay, isValidStayRange } from "../src/utils/availability";

describe("isOverlappingStay", () => {
  const existing = { checkIn: "2026-01-10", checkOut: "2026-01-15" };

  test("detects a contained overlap", () => {
    expect(
      isOverlappingStay(existing, { checkIn: "2026-01-12", checkOut: "2026-01-13" }),
    ).toBe(true);
  });

  test("detects a single-night edge overlap", () => {
    expect(
      isOverlappingStay(existing, { checkIn: "2026-01-14", checkOut: "2026-01-16" }),
    ).toBe(true);
  });

  test("treats checkout as exclusive: back-to-back stays do not overlap", () => {
    expect(
      isOverlappingStay(existing, { checkIn: "2026-01-15", checkOut: "2026-01-18" }),
    ).toBe(false);
    expect(
      isOverlappingStay({ checkIn: "2026-01-05", checkOut: "2026-01-10" }, existing),
    ).toBe(false);
  });
});

describe("isValidStayRange", () => {
  test("rejects checkout on or before check-in", () => {
    expect(isValidStayRange("2026-01-12", "2026-01-12")).toBe(false);
    expect(isValidStayRange("2026-01-13", "2026-01-12")).toBe(false);
  });

  test("rejects stays that already ended", () => {
    expect(isValidStayRange("2020-01-10", "2020-01-12")).toBe(false);
  });

  test("rejects unparseable dates", () => {
    expect(isValidStayRange("not-a-date", "2026-01-12")).toBe(false);
  });

  test("accepts a future stay", () => {
    expect(isValidStayRange("2099-01-10", "2099-01-12")).toBe(true);
  });
});
