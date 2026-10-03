import { describe, expect, test } from "bun:test";
import {
  canTransition,
  isAllowedUrl,
  isReservedSlug,
  isValidSlug,
  sanitizeRichText,
} from "../src/modules/cms/cms.types";

describe("cms slug rules", () => {
  test("accepts lowercase hyphen slugs", () => {
    expect(isValidSlug("deluxe-room")).toBe(true);
    expect(isValidSlug("offer-2026")).toBe(true);
  });

  test("rejects uppercase, spaces, and special chars", () => {
    expect(isValidSlug("Deluxe Room")).toBe(false);
    expect(isValidSlug("room_type")).toBe(false);
    expect(isValidSlug("a".repeat(121))).toBe(false);
  });

  test("rejects reserved slugs", () => {
    for (const slug of ["admin", "api", "booking", "payments", "webhooks", "media"]) {
      expect(isReservedSlug(slug)).toBe(true);
    }
    expect(isReservedSlug("deluxe-room")).toBe(false);
  });
});

describe("cms link allowlist", () => {
  test("allows https/http/relative/mailto/tel/anchor", () => {
    expect(isAllowedUrl("https://example.com/offer")).toBe(true);
    expect(isAllowedUrl("http://example.com")).toBe(true);
    expect(isAllowedUrl("/offers/summer")).toBe(true);
    expect(isAllowedUrl("mailto:stay@example.com")).toBe(true);
    expect(isAllowedUrl("tel:+911234567890")).toBe(true);
    expect(isAllowedUrl("#rooms")).toBe(true);
  });

  test("rejects scriptable and protocol-relative urls", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isAllowedUrl("data:text/html,<h1>x</h1>")).toBe(false);
    expect(isAllowedUrl("//evil.com/x")).toBe(false);
  });
});

describe("cms sanitizer", () => {
  test("strips scripts, iframes, and event handlers", () => {
    const dirty = `<p>Hello</p><script>alert(1)</script><iframe src="x"></iframe><a href="https://ok.com" onclick="steal()">link</a>`;
    const clean = sanitizeRichText(dirty);
    expect(clean).toContain("<p>Hello</p>");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain('href="https://ok.com"');
  });

  test("neutralizes javascript: hrefs", () => {
    const clean = sanitizeRichText(`<a href="javascript:alert(1)">x</a>`);
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain('href="#"');
  });
});

describe("cms lifecycle", () => {
  test("draft publishes or archives", () => {
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransition("DRAFT", "ARCHIVED")).toBe(true);
    expect(canTransition("DRAFT", "DRAFT")).toBe(false);
  });

  test("published returns to draft or archives", () => {
    expect(canTransition("PUBLISHED", "DRAFT")).toBe(true);
    expect(canTransition("PUBLISHED", "ARCHIVED")).toBe(true);
    expect(canTransition("PUBLISHED", "PUBLISHED")).toBe(false);
  });

  test("archived only reopens as draft", () => {
    expect(canTransition("ARCHIVED", "DRAFT")).toBe(true);
    expect(canTransition("ARCHIVED", "PUBLISHED")).toBe(false);
    expect(canTransition("ARCHIVED", "ARCHIVED")).toBe(false);
  });
});
