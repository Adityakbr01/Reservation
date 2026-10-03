import { describe, expect, test } from "bun:test";
import { occupiedDayKeys } from "../src/modules/availability/calendar.service";

describe("calendar day coverage", () => {
  test("a 2-night stay occupies check-in and middle day, not checkout", () => {
    const days = occupiedDayKeys(new Date("2026-11-10T00:00:00Z"), new Date("2026-11-12T00:00:00Z"));
    expect(days).toEqual(["2026-11-10", "2026-11-11"]);
  });

  test("single night occupies one day", () => {
    const days = occupiedDayKeys(new Date("2026-11-10T00:00:00Z"), new Date("2026-11-11T00:00:00Z"));
    expect(days).toEqual(["2026-11-10"]);
  });
});
