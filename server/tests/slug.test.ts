import { describe, expect, test } from "bun:test";
import { slugify } from "../src/utils/slug";

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    expect(slugify("Deluxe Room")).toBe("deluxe-room");
  });

  test("trims and strips punctuation", () => {
    expect(slugify("  Suite & Spa! ")).toBe("suite-spa");
  });

  test("transliterates diacritics", () => {
    expect(slugify("Café Münchén")).toBe("cafe-munchen");
  });

  test("returns empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  test("keeps numbers", () => {
    expect(slugify("Room 101")).toBe("room-101");
  });
});
