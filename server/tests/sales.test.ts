import { describe, expect, test } from "bun:test";
import { salesRangeBounds } from "../src/modules/dashboard/sales.service";

describe("sales ranges", () => {
  const now = new Date("2026-10-03T14:00:00Z");

  test("today spans the UTC day", () => {
    const { from, to } = salesRangeBounds("today", now);
    expect(from.toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-03T23:59:59.999Z");
  });

  test("week spans 7 days ending now", () => {
    const { from, to } = salesRangeBounds("week", now);
    expect(from.toISOString()).toBe("2026-09-27T00:00:00.000Z");
    expect(to.getTime()).toBe(now.getTime());
  });

  test("month spans 30 days ending now", () => {
    const { from, to } = salesRangeBounds("month", now);
    expect(from.toISOString()).toBe("2026-09-04T00:00:00.000Z");
    expect(to.getTime()).toBe(now.getTime());
  });
});
