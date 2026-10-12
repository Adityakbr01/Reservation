import { describe, expect, test } from "bun:test";
import {
  assertStorageKey,
  buildAvatarKey,
  buildMediaKey,
  parentDirOf,
  publicAssetUrl,
  storagePrefixSegments,
} from "../src/integrations/storage/storage-keys";

describe("buildMediaKey", () => {
  test("builds dated keys with uuid + slug + mime-derived extension", () => {
    const key = buildMediaKey("Homepage Banner.PNG", "image/png", new Date("2026-10-12T00:00:00Z"), "");
    expect(key).toMatch(/^media\/2026\/10\/[0-9a-f]{8}-homepage-banner\.png$/);
  });

  test("prepends the configured prefix", () => {
    const key = buildMediaKey("a.jpg", "image/jpeg", new Date("2026-10-12T00:00:00Z"), "uploads");
    expect(key).toMatch(/^uploads\/media\/2026\/10\/[0-9a-f]{8}-a\.jpg$/);
  });

  test("ignores the client extension when MIME differs", () => {
    const key = buildMediaKey("photo.exe", "image/jpeg", new Date("2026-01-05T00:00:00Z"), "");
    expect(key.endsWith(".jpg")).toBe(true);
    expect(key).not.toContain(".exe");
  });

  test("rejects disallowed MIME types", () => {
    expect(() => buildMediaKey("x.svg", "image/svg+xml", new Date(), "")).toThrow();
  });
});

describe("buildAvatarKey", () => {
  test("scopes avatars by user with timestamp", () => {
    const key = buildAvatarKey("user_123", "me.webp", "image/webp", 1728650000000, "");
    expect(key).toMatch(/^avatars\/user_123-1728650000000-[0-9a-f]{8}-me\.webp$/);
  });

  test("sanitizes hostile user ids", () => {
    const key = buildAvatarKey("../../etc", "a.png", "image/png", 1, "");
    expect(key).not.toContain("..");
    expect(key.startsWith("avatars/")).toBe(true);
  });
});

describe("storagePrefixSegments", () => {
  test("empty prefix yields no segments", () => {
    expect(storagePrefixSegments("")).toEqual([]);
  });

  test("rejects hostile or colliding prefixes", () => {
    for (const bad of ["../x", "media", "avatars", "a//b", "/abs"]) {
      expect(() => storagePrefixSegments(bad)).toThrow();
    }
    expect(storagePrefixSegments("uploads")).toEqual(["uploads"]);
    expect(storagePrefixSegments("uploads/")).toEqual(["uploads"]);
  });
});

describe("assertStorageKey root-jail", () => {
  test("accepts well-formed keys with or without prefix", () => {
    expect(() => assertStorageKey("media/2026/10/ab12cd34-photo.jpg")).not.toThrow();
    expect(() => assertStorageKey("avatars/u-1-a.png")).not.toThrow();
    expect(() => assertStorageKey("uploads/media/2026/10/ab12cd34-photo.jpg")).not.toThrow();
    expect(() => assertStorageKey("uploads/avatars/u-1-a.png")).not.toThrow();
  });

  test("rejects traversal, absolute paths, backslashes and kind-less keys", () => {
    for (const bad of [
      "../etc/passwd",
      "media/../../x.jpg",
      "/media/x.jpg",
      "media\\x.jpg",
      "other/x.jpg",
      "media",
      "uploads/media",
      "",
    ]) {
      expect(() => assertStorageKey(bad)).toThrow();
    }
  });
});

describe("publicAssetUrl + parentDirOf", () => {
  test("joins base and key, tolerating trailing slashes", () => {
    expect(publicAssetUrl("https://hamptworthstays.com/hamptworthStay/", "uploads/media/2026/10/a.jpg")).toBe(
      "https://hamptworthstays.com/hamptworthStay/uploads/media/2026/10/a.jpg",
    );
  });

  test("parent dir drops the filename", () => {
    expect(parentDirOf("uploads/media/2026/10/a.jpg")).toBe("uploads/media/2026/10");
  });
});
