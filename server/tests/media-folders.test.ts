import { describe, expect, test } from "bun:test";
import { folderQuery, normalizeFolderPath } from "../src/modules/media/media.model";

describe("normalizeFolderPath", () => {
  test("builds nested paths like Cottage/Oakwood Cottage", () => {
    expect(normalizeFolderPath("Cottage/Oakwood Cottage")).toBe("Cottage/Oakwood Cottage");
  });

  test("trims, collapses spaces, drops empties and traversal", () => {
    expect(normalizeFolderPath("  Cottage // Oakwood   Cottage  ")).toBe("Cottage/Oakwood Cottage");
    expect(normalizeFolderPath("Cottage/../Other")).toBe("Cottage/Other");
  });

  test("caps depth and segment length, nulls blanks", () => {
    expect(normalizeFolderPath("a/b/c/d")).toBe("a/b/c");
    expect(normalizeFolderPath("")).toBeNull();
    expect(normalizeFolderPath(null)).toBeNull();
    expect(normalizeFolderPath(undefined)).toBeNull();
  });
});

describe("folderQuery", () => {
  test("exact paths match one folder, __root__ matches unfiled", () => {
    expect(folderQuery("Cottage/Oakwood Cottage")).toBe("Cottage/Oakwood Cottage");
    expect(folderQuery("__root__")).toBeNull();
  });

  test("trailing /* matches the subtree with escaped prefixes", () => {
    expect(folderQuery("Cottage/*")).toEqual({ $regex: "^Cottage/" });
    expect(folderQuery("A+B/*")).toEqual({ $regex: "^A\\+B/" });
  });
});
