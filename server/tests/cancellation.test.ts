import { describe, expect, test } from "bun:test";
import { evaluateCancellation } from "../src/modules/policies/policy.service";

const POLICY = { name: "Standard flexible", freeCancellationHours: 24, refundPercentage: 100 };
const CHECK_IN = new Date("2026-12-20T14:00:00Z");
const CHECK_OUT = new Date("2026-12-22T11:00:00Z");

describe("evaluateCancellation", () => {
  test("unpaid cancellable states cancel with zero refund", () => {
    for (const status of ["HELD", "PAYMENT_PENDING"] as const) {
      const result = evaluateCancellation({
        status,
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        paidTotal: 0,
        policy: POLICY,
        now: new Date("2026-12-01T00:00:00Z"),
      });
      expect(result.isCancellable).toBe(true);
      expect(result.refundAmount).toBe(0);
    }
  });

  test("paid booking inside the window gets a full refund", () => {
    const result = evaluateCancellation({
      status: "CONFIRMED",
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      paidTotal: 20000,
      policy: POLICY,
      now: new Date("2026-12-18T00:00:00Z"),
    });
    expect(result.isCancellable).toBe(true);
    expect(result.refundAmount).toBe(20000);
    expect(result.refundPercentage).toBe(100);
  });

  test("paid booking past the cutoff cancels with no refund", () => {
    const result = evaluateCancellation({
      status: "CONFIRMED",
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      paidTotal: 20000,
      policy: POLICY,
      now: new Date("2026-12-20T00:00:00Z"),
    });
    expect(result.isCancellable).toBe(true);
    expect(result.refundAmount).toBe(0);
  });

  test("partial percentage applies correctly", () => {
    const result = evaluateCancellation({
      status: "CONFIRMED",
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      paidTotal: 20000,
      policy: { ...POLICY, refundPercentage: 50 },
      now: new Date("2026-12-01T00:00:00Z"),
    });
    expect(result.refundAmount).toBe(10000);
    expect(result.refundPercentage).toBe(50);
  });

  test("terminal states and finished stays are not cancellable", () => {
    for (const status of ["CANCELLED", "EXPIRED", "CHECKED_OUT"] as const) {
      const result = evaluateCancellation({
        status,
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        paidTotal: 20000,
        policy: POLICY,
        now: new Date("2026-12-01T00:00:00Z"),
      });
      expect(result.isCancellable).toBe(false);
    }
    const finished = evaluateCancellation({
      status: "CONFIRMED",
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      paidTotal: 20000,
      policy: POLICY,
      now: new Date("2026-12-25T00:00:00Z"),
    });
    expect(finished.isCancellable).toBe(false);
  });
});
