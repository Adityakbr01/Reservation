import { describe, expect, test } from "bun:test";
import { offerBadgeLabel } from "../src/modules/roomTypes/room-offers.service";

describe("offerBadgeLabel", () => {
  test("percentage discounts render as N% OFF", () => {
    expect(offerBadgeLabel("PERCENTAGE", 20, "GBP")).toBe("20% OFF");
  });

  test("fixed discounts render as a SAVE amount", () => {
    expect(offerBadgeLabel("FIXED", 5000, "GBP")).toBe("SAVE £50");
  });
});
