import { describe, expect, test } from "bun:test";
import { applyDiscount, percentOf } from "../src/utils/money";

describe("percentOf", () => {
  test("rounds to whole minor units", () => {
    expect(percentOf(900000, 10)).toBe(90000);
    expect(percentOf(999, 10)).toBe(100);
  });
});

describe("applyDiscount", () => {
  test("percentage without cap", () => {
    expect(applyDiscount(900000, { type: "PERCENTAGE", value: 10 })).toBe(90000);
  });

  test("percentage honours maxDiscount cap", () => {
    expect(applyDiscount(900000, { type: "PERCENTAGE", value: 50, maxDiscount: 100000 })).toBe(100000);
  });

  test("fixed discount clamps at subtotal (never negative totals)", () => {
    expect(applyDiscount(30000, { type: "FIXED", value: 50000 })).toBe(30000);
  });

  test("zero subtotal yields zero discount", () => {
    expect(applyDiscount(0, { type: "PERCENTAGE", value: 10 })).toBe(0);
  });
});
