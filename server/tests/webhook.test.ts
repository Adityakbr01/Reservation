import Stripe from "stripe";
import { describe, expect, test } from "bun:test";
import { verifyStripeWebhook } from "../src/modules/webhooks/stripe-webhook.service";

const SECRET = "whsec_unit_test_secret";

/**
 * Webhook signature verification using Stripe's own test-header generator
 * (offline-safe: it only HMAC-signs, no network involved). The secret is
 * passed explicitly so this test never depends on ambient env state.
 */
describe("verifyStripeWebhook", () => {
  test("accepts a correctly signed payload and rejects tampering", async () => {
    const payload = JSON.stringify({ id: "evt_unit_1", object: "event", type: "ping" });
    const header = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: SECRET,
    });
    const event = await verifyStripeWebhook(Buffer.from(payload), header, SECRET);
    expect(event.id).toBe("evt_unit_1");

    let code = "";
    try {
      await verifyStripeWebhook(Buffer.from(payload + "tampered"), header, SECRET);
    } catch (error) {
      code = (error as { code?: string }).code ?? "";
    }
    expect(code).toBe("INVALID_SIGNATURE");

    let missing = "";
    try {
      await verifyStripeWebhook(Buffer.from(payload), "", SECRET);
    } catch (error) {
      missing = (error as { code?: string }).code ?? "";
    }
    expect(missing).toBe("INVALID_SIGNATURE");
  });
});
