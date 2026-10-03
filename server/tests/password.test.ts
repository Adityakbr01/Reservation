import bcrypt from "bcryptjs";
import { describe, expect, test } from "bun:test";

describe("password hashing (bcryptjs)", () => {
  test("hash verifies against the original password and rejects others", async () => {
    const hash = await bcrypt.hash("correct-horse-8", 10);
    expect(await bcrypt.compare("correct-horse-8", hash)).toBe(true);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  }, 15000);
});
