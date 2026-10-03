import { describe, expect, test } from "bun:test";
import { buildPagination, paginatedResponse } from "../src/utils/pagination";

describe("buildPagination", () => {
  test("computes total pages", () => {
    expect(buildPagination(1, 10, 95)).toEqual({ page: 1, limit: 10, total: 95, totalPages: 10 });
  });

  test("returns zero pages for an empty list", () => {
    expect(buildPagination(1, 10, 0)).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  test("keeps the requested page untouched (standard list semantics)", () => {
    expect(buildPagination(5, 10, 12).page).toBe(5);
  });
});

describe("paginatedResponse", () => {
  test("wraps data with the pagination envelope", () => {
    expect(paginatedResponse(["a", "b"], 2, 10, 12)).toEqual({
      data: ["a", "b"],
      meta: { page: 2, limit: 10, total: 12, totalPages: 2 },
    });
  });
});
