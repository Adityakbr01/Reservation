import { describe, expect, test } from "bun:test";
import { computeNights, isPlanApplicable } from "../src/modules/availability/search.service";
import type { RatePlan } from "../src/modules/ratePlans/rate-plan.types";

type PlanInput = Pick<RatePlan, "status" | "restrictions">;

const baseRestrictions: PlanInput["restrictions"] = {
  minNights: null,
  maxNights: null,
  minAdvanceDays: null,
  maxAdvanceDays: null,
  validFrom: null,
  validUntil: null,
  daysOfWeek: [],
};

function plan(
  status: PlanInput["status"] = "ACTIVE",
  restrictions: Partial<PlanInput["restrictions"]> = {},
): PlanInput {
  return { status, restrictions: { ...baseRestrictions, ...restrictions } };
}

const day = "2026-11-10";
const dayPlus2 = "2026-11-12";
const dayPlus5 = "2026-11-15";

describe("computeNights", () => {
  test("counts exclusive-checkout nights", () => {
    expect(computeNights(new Date(day), new Date(dayPlus2))).toBe(2);
    expect(computeNights(new Date(day), new Date(dayPlus5))).toBe(5);
  });
});

describe("isPlanApplicable", () => {
  const checkIn = new Date(day);
  const checkOut = new Date(dayPlus2);

  test("accepts an unrestricted active plan", () => {
    expect(isPlanApplicable(plan(), checkIn, checkOut, 2)).toBe(true);
  });

  test("rejects inactive plans", () => {
    expect(isPlanApplicable(plan("INACTIVE"), checkIn, checkOut, 2)).toBe(false);
  });

  test("enforces the validity window overlapping the stay", () => {
    expect(isPlanApplicable(plan("ACTIVE", { validUntil: new Date("2026-11-01") }), checkIn, checkOut, 2)).toBe(false);
    expect(isPlanApplicable(plan("ACTIVE", { validFrom: new Date("2026-12-01") }), checkIn, checkOut, 2)).toBe(false);
  });

  test("enforces min/max nights", () => {
    expect(isPlanApplicable(plan("ACTIVE", { minNights: 3 }), checkIn, checkOut, 2)).toBe(false);
    expect(isPlanApplicable(plan("ACTIVE", { maxNights: 1 }), checkIn, checkOut, 2)).toBe(false);
    expect(
      isPlanApplicable(plan("ACTIVE", { minNights: 2, maxNights: 2 }), checkIn, checkOut, 2),
    ).toBe(true);
  });
});
