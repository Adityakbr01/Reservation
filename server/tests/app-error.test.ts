import { describe, expect, test } from "bun:test";
import { AppError } from "../src/utils/app-error";

describe("AppError", () => {
  test("carries status, code, and message", () => {
    const error = new AppError("Room unavailable", 409, "ROOM_UNAVAILABLE");
    expect(error.status).toBe(409);
    expect(error.code).toBe("ROOM_UNAVAILABLE");
    expect(error.message).toBe("Room unavailable");
  });

  test("defaults to a 500 INTERNAL_ERROR", () => {
    const error = new AppError("boom");
    expect(error.status).toBe(500);
    expect(error.code).toBe("INTERNAL_ERROR");
  });
});
