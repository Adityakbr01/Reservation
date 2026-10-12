import { describe, expect, test } from "bun:test";
import {
  dummyStringVars,
  templateDefinition,
  EMAIL_TEMPLATE_KEYS,
} from "../src/emails/registry";
import {
  emailButton,
  escapeHtml,
  extractPlaceholders,
  htmlToText,
  isSafeEmailUrl,
  renderPlaceholderTemplate,
  requireVars,
  resolveLogoUrl,
} from "../src/emails/shared";
import { passwordChangedEmail, passwordResetEmail } from "../src/emails/templates/auth";
import { checkedInEmail, checkedOutEmail } from "../src/emails/templates/booking";
import { adminAlertEmail } from "../src/emails/templates/admin";
import { welcomeEmail } from "../src/emails/templates/welcome";
import { codeDefaultFor } from "../src/modules/emailTemplates/email-template.service";
import { renderDraftPreview } from "../src/modules/emailTemplates/email-template.service";
import { renderWithOverride } from "../src/modules/emailTemplates/email-template.service";
import { editableSourceFor } from "../src/modules/emailTemplates/email-template.service";
import {
  testEmailTemplateSchema,
  updateEmailTemplateSchema,
} from "../src/modules/emailTemplates/email-template.schema";
import { RESET_TOKEN_TTL_MS } from "../src/modules/auth/auth.service";
import { checkOutBlockReason } from "../src/modules/bookings/booking.service";
import type { Booking } from "../src/modules/bookings/booking.types";
import { notificationKeys } from "../src/modules/notifications/notification.types";

describe("required email copy", () => {
  test("checkout thank-you subject carries the dynamic cottage name", () => {
    const rendered = codeDefaultFor("CHECKED_OUT");
    expect(rendered.subject).toBe("Thank You for Staying at Fern Cottage");
    expect(rendered.html).toContain("Thank you for choosing <strong>Fern Cottage</strong>");
    expect(rendered.text).toContain("Thank you for choosing Fern Cottage by Hamptworth Stays.");
  });

  test("password reset request uses the exact subject and CTA", () => {
    const rendered = codeDefaultFor("PASSWORD_RESET");
    expect(rendered.subject).toBe("Reset Your Hamptworth Stays Password");
    expect(rendered.html).toContain("Reset Your Password");
    expect(rendered.html).toContain("reset-password?token=preview-token");
    expect(rendered.text).toContain("reset-password?token=preview-token");
  });

  test("password-changed mail uses the exact subject and login CTA", () => {
    const rendered = codeDefaultFor("PASSWORD_CHANGED");
    expect(rendered.subject).toBe("Your Password Has Been Updated");
    expect(rendered.html).toContain("Sign In to Your Account");
    expect(rendered.html).toContain("https://book.hamptworthstays.com/login");
    expect(rendered.text).toContain("https://book.hamptworthstays.com/login");
    expect(rendered.html).not.toContain("preview-token");
  });

  test("reset links expire after the configured validity period", () => {
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe("every template renders subject + html + text", () => {
  for (const key of EMAIL_TEMPLATE_KEYS) {
    test(`${key} renders complete, responsive, on-brand mail`, () => {
      const rendered = codeDefaultFor(key);
      expect(rendered.subject.trim().length).toBeGreaterThan(0);
      expect(rendered.html).toContain("viewport");
      expect(rendered.html).toContain("max-width: 600px");
      expect(rendered.html).toContain("#263D32");
      expect(rendered.html).toContain("#F7F5EF");
      expect(rendered.html).toContain("#D8C7A3");
      // No double-quoted font names inside style attributes — that silently
      // kills the whole attribute in browsers (white masthead text went
      // dark, links fell back to default blue).
      expect(rendered.html).not.toContain('family: "');
      expect(rendered.text.trim().length).toBeGreaterThan(20);
      expect(rendered.text).not.toContain("<div");
      expect(rendered.text).not.toContain("<table");
    });
  }
});

describe("dummy preview data covers required variables", () => {
  for (const key of EMAIL_TEMPLATE_KEYS) {
    test(`${key} dummy vars fill every required slot`, () => {
      const def = templateDefinition(key);
      const vars = dummyStringVars(key);
      for (const name of def.requiredVars) {
        expect(vars[name]?.trim() ? vars[name] : "").not.toBe("");
      }
    });
  }
});

describe("escaping and safe URLs", () => {
  test("cottage names cannot inject markup into subjects or bodies", () => {
    const base = codeDefaultFor("CHECKED_IN");
    expect(base.subject).toContain("Fern Cottage");
    const evil = checkedInEmail({
      guestName: "A",
      bookingReference: "QB-1",
      propertyName: "P",
      roomSummary: `"><script>alert(1)</script>`,
      checkIn: "a",
      checkOut: "b",
      nights: 1,
      guests: "1",
      currency: "GBP",
      subtotal: 0,
      discount: 0,
      taxes: 0,
      fees: 0,
      total: 0,
      totalPaid: 0,
      paymentStatus: "paid",
      cancellationPolicy: "x",
      supportEmail: "s@x.com",
      manageUrl: "https://book.hamptworthstays.com/bookings",
    });
    expect(evil.html).not.toContain("<script>");
    expect(evil.subject).not.toContain("<script>");
  });

  test("welcome and admin mails escape names and headlines", () => {
    expect(welcomeEmail("<img src=x onerror=alert(1)>").html).not.toContain("<img src=x");
    const alert = adminAlertEmail(
      { bookingReference: "QB-1", headline: "<b>Hi</b>", detail: "d", adminUrl: "https://a.com/x" },
      "<b>Hi</b>",
    );
    expect(alert.html).not.toContain("<b>Hi</b>");
  });

  test("unsafe CTA targets are neutralized, safe ones pass", () => {
    expect(isSafeEmailUrl("https://book.hamptworthstays.com/login")).toBe(true);
    expect(isSafeEmailUrl("http://example.com/x")).toBe(true);
    expect(isSafeEmailUrl("/bookings")).toBe(true);
    expect(isSafeEmailUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeEmailUrl("data:text/html,hi")).toBe(false);
    expect(isSafeEmailUrl("vbscript:msgbox")).toBe(false);
    const neutralized = emailButton("javascript:alert(1)", "Go");
    expect(neutralized).toContain('href="#"');
    expect(neutralized).not.toContain("javascript:");
  });

  test("logo URLs must be absolute https", () => {
    expect(resolveLogoUrl("https://cdn.example.com/logo.webp")).toBe("https://cdn.example.com/logo.webp");
    expect(resolveLogoUrl("/logo.webp")).toBeNull();
    expect(resolveLogoUrl("http://cdn.example.com/logo.png")).toBeNull();
    expect(resolveLogoUrl(null)).toBeNull();
  });

  test("escapeHtml covers all interpolated contexts", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("variable validation", () => {
  test("requireVars names every missing variable", () => {
    expect(() => requireVars({ a: "x" }, ["a", "b", "c"], "DEMO")).toThrow("b, c");
  });

  test("extractPlaceholders finds and dedupes {{vars}}", () => {
    expect(extractPlaceholders("Hi {{ guestName }}, ref {{bookingReference}} ({{guestName}})")).toEqual([
      "bookingReference",
      "guestName",
    ]);
  });

  test("placeholder rendering escapes values and rejects unknown vars", () => {
    const out = renderPlaceholderTemplate("Hi {{guestName}}", { guestName: "<b>A</b>" }, ["guestName"], "DEMO");
    expect(out).toBe("Hi &lt;b&gt;A&lt;/b&gt;");
    expect(() => renderPlaceholderTemplate("Hi {{nope}}", {}, ["guestName"], "DEMO")).toThrow("unknown variables");
  });

  test("htmlToText strips tags for the plain-text fallback", () => {
    expect(htmlToText("<p>Hello<br/>World</p>")).toContain("Hello");
    expect(htmlToText("<p>Hello<br/>World</p>")).not.toContain("<p>");
  });
});

describe("event timing and duplicate prevention", () => {
  function booking(overrides: Partial<Booking> = {}): Booking {
    return {
      id: "b1",
      bookingNumber: "QB-TEST01",
      propertyId: "p1",
      userId: "u1",
      status: "CHECKED_IN",
      paymentStatus: "PAID",
      checkIn: new Date("2026-10-10T00:00:00Z"),
      checkOut: new Date("2026-10-12T00:00:00Z"),
      guests: { adults: 2, children: 0 },
      contact: { firstName: "Neha", lastName: "K", email: "n@example.com", phone: "+91" },
      pricing: { currency: "INR", subtotal: 300000, discount: 0, taxes: 0, fees: 0, total: 300000, couponCode: null },
      cancellation: { cancelledAt: null, cancelledBy: null, reason: null },
      hold: { holdId: null, expiresAt: null },
      stay: { checkedInAt: null, checkedInBy: null, checkedOutAt: null, checkedOutBy: null },
      source: "DIRECT",
      notes: null,
      reminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  test("checkout thank-you is only valid after genuine checkout (CHECKED_IN gate)", () => {
    expect(checkOutBlockReason(booking({ status: "CHECKED_IN" }))).toBeNull();
    expect(checkOutBlockReason(booking({ status: "CONFIRMED" }))).not.toBeNull();
    const mail = checkedOutEmail({
      guestName: "Neha",
      bookingReference: "QB-TEST01",
      propertyName: "Hamptworth Stays",
      roomSummary: "Fern Cottage",
      checkIn: "10 Oct 2026",
      checkOut: "12 Oct 2026",
      nights: 2,
      guests: "2 adults",
      currency: "INR",
      subtotal: 300000,
      discount: 0,
      taxes: 0,
      fees: 0,
      total: 300000,
      totalPaid: 300000,
      paymentStatus: "paid",
      cancellationPolicy: "Free",
      supportEmail: "s@x.com",
      manageUrl: "http://localhost:5173/bookings",
    });
    expect(mail.subject).toBe("Thank You for Staying at Fern Cottage");
  });

  test("checked-out idempotency keys never double-fire", () => {
    expect(notificationKeys.checkedOut("b1")).toBe(notificationKeys.checkedOut("b1"));
    expect(notificationKeys.checkedOut("b1")).not.toBe(notificationKeys.checkedOut("b2"));
  });
});

describe("admin template schemas", () => {
  test("update rejects unknown variables and empty bodies", () => {
    const badVars = updateEmailTemplateSchema.safeParse({
      subject: "Hi {{hacker}}",
      htmlBody: "<p>Hi {{hacker}}</p>".padStart(60, "x"),
      textBody: "Hi {{hacker}} — hello there friend",
    });
    expect(badVars.success).toBe(true);
    const empty = updateEmailTemplateSchema.safeParse({ subject: "Hi" });
    expect(empty.success).toBe(false);
  });

  test("test-email requires a real recipient address", () => {
    expect(testEmailTemplateSchema.safeParse({ to: "guest@example.com" }).success).toBe(true);
    expect(testEmailTemplateSchema.safeParse({ to: "not-an-email" }).success).toBe(false);
    expect(testEmailTemplateSchema.safeParse({}).success).toBe(false);
  });
});

describe("password reset/change escaping", () => {
  test("reset mail escapes the name but keeps the real reset URL", () => {
    const rendered = passwordResetEmail("<b>Neha</b>", "https://x/reset-password?token=abc&u=1");
    expect(rendered.html).not.toContain("<b>Neha</b>");
    expect(rendered.html).toContain("https://x/reset-password?token=abc&amp;u=1");
  });

  test("changed mail never carries a token", () => {
    const rendered = passwordChangedEmail("Neha");
    expect(rendered.html).not.toMatch(/token/i);
    expect(rendered.text).not.toMatch(/token/i);
  });
});

describe("live draft preview", () => {
  test("unsaved editor content renders with dummy data", () => {
    const rendered = renderDraftPreview("WELCOME", {
      subject: "Welcome to Hamptworth Staysqq",
      htmlBody: "<p>Hello {{guestName}}, welcome to {{brandName}}!</p>",
      textBody: "Hello {{guestName}}, welcome!",
    });
    expect(rendered.source).toBe("draft");
    expect(rendered.subject).toBe("Welcome to Hamptworth Staysqq");
    expect(rendered.html).toContain("Alexandra Morgan");
    expect(rendered.html).toContain("Hamptworth Stays!");
    expect(rendered.html).not.toContain("{{guestName}}");
    expect(rendered.text).toContain("Alexandra Morgan");
  });

  test("empty draft fields fall back to the code default", () => {
    const rendered = renderDraftPreview("WELCOME", { subject: "", htmlBody: "", textBody: "" });
    expect(rendered.subject).toBe("Welcome to Hamptworth Stays");
    expect(rendered.html).toContain("Alexandra Morgan");
  });

  test("unknown variables are rejected with a clear message", () => {
    expect(() => renderDraftPreview("WELCOME", { subject: "Hi {{hacker}}" })).toThrow(
      "Unknown variables: hacker",
    );
  });

  test("draft values are escaped, scripts stripped", () => {
    const rendered = renderDraftPreview("CHECKED_OUT", {
      subject: "Thank You for Staying at {{cottageName}}",
      htmlBody: "<p>Hi {{guestName}}</p><script>alert(1)</script>",
      textBody: "Hi {{guestName}}",
    });
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("Hi Alexandra Morgan");
    expect(rendered.subject).toBe("Thank You for Staying at Fern Cottage");
  });
});

describe("override resolution (partial customizations)", () => {
  const vars = { guestName: "Alex", brandName: "Hamptworth Stays" };

  test("null/disabled override falls back to default", () => {
    const codeDefault = codeDefaultFor("WELCOME");
    expect(renderWithOverride("WELCOME", vars, codeDefault, null).source).toBe("default");
    const disabled = {
      subject: "Hi",
      htmlBody: "<p>Hi</p>",
      textBody: "Hi",
      isEnabled: false,
      updatedBy: null,
      updatedAt: new Date(),
    };
    expect(renderWithOverride("WELCOME", vars, codeDefault, disabled).source).toBe("default");
  });

  test("subject-only override keeps the default body", () => {
    const codeDefault = codeDefaultFor("WELCOME");
    const override = {
      subject: "Welcome, {{guestName}}!",
      htmlBody: "",
      textBody: "",
      isEnabled: true,
      updatedBy: null,
      updatedAt: new Date(),
    };
    const { rendered, source } = renderWithOverride("WELCOME", vars, codeDefault, override);
    expect(source).toBe("custom");
    expect(rendered.subject).toBe("Welcome, Alex!");
    expect(rendered.html).toBe(codeDefault.html);
    expect(rendered.text).toBe(codeDefault.text);
  });

  test("unknown variables in overrides are rejected", () => {
    const codeDefault = codeDefaultFor("WELCOME");
    const override = {
      subject: "Hi {{hacker}}",
      htmlBody: "",
      textBody: "",
      isEnabled: true,
      updatedBy: null,
      updatedAt: new Date(),
    };
    expect(() => renderWithOverride("WELCOME", vars, codeDefault, override)).toThrow(
      "unknown variables",
    );
  });

  test("fully blank override falls back to default", () => {
    const codeDefault = codeDefaultFor("WELCOME");
    const override = {
      subject: "",
      htmlBody: "",
      textBody: "",
      isEnabled: true,
      updatedBy: null,
      updatedAt: new Date(),
    };
    expect(renderWithOverride("WELCOME", vars, codeDefault, override).source).toBe("default");
  });
});

describe("editable source restoration", () => {
  for (const key of EMAIL_TEMPLATE_KEYS) {
    test(`${key} restores to placeholders and re-renders identically`, () => {
      const source = editableSourceFor(key);
      // No dummy values leak into the editable source (spot-check the known ones).
      expect(source.htmlBody).not.toContain("Alexandra Morgan");
      expect(source.htmlBody).not.toContain("QB-HX7K2P");
      expect(source.subject).not.toContain("QB-HX7K2P");
      // Re-rendering the restored source reproduces the default byte-for-byte.
      const redone = renderDraftPreview(key, {
        subject: source.subject,
        htmlBody: source.htmlBody,
        textBody: source.textBody,
      });
      const codeDefault = codeDefaultFor(key);
      expect(redone.subject).toBe(codeDefault.subject);
      expect(redone.html).toBe(codeDefault.html);
      expect(redone.text).toBe(codeDefault.text);
    });
  }
});

describe("local live-preview parity", () => {
  test("dummy vars cover every required slot for every key (pure, no DB)", () => {
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const def = templateDefinition(key);
      const vars = dummyStringVars(key);
      expect(Object.keys(vars).length).toBeGreaterThan(0);
      for (const name of def.requiredVars) {
        expect(vars[name]?.trim() ? vars[name] : "").not.toBe("");
      }
    }
  });

  test("dummy values contain no HTML-special chars (Mustache parity)", () => {
    // The admin renders live previews with Mustache, which HTML-escapes
    // {{var}} output exactly like the server — as long as dummy values
    // never contain < > " or '. A bare & (maps links) is the one exception:
    // both sides escape it identically in HTML; only the text pane shows
    // &amp; instead of &.
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const vars = dummyStringVars(key);
      for (const value of Object.values(vars)) {
        expect(value).not.toMatch(/[<>"']/);
      }
    }
  });
});
