import { describe, expect, it } from "vitest";
import { PLANS, formatPrice, isPlanId, needsPlus } from "./pricing";

describe("pricing", () => {
  it("formats whole and fractional dollar prices", () => {
    expect(formatPrice(PLANS.monthly.cents)).toBe("$9.99");
    expect(formatPrice(PLANS.yearly.cents)).toBe("$59");
  });

  it("accepts only the two plans", () => {
    expect(isPlanId("monthly")).toBe(true);
    expect(isPlanId("yearly")).toBe(true);
    expect(isPlanId("lifetime")).toBe(false);
    expect(isPlanId(undefined)).toBe(false);
  });
});

describe("needsPlus", () => {
  const plus = { since: "2026-11-14T00:00:00.000Z", sessionId: "cs_test_1" };

  it("leaves the first own worksheet free", () => {
    expect(needsPlus({ plus: null, ownWorksheetsUsed: 0 })).toBe(false);
  });

  it("asks for Plus from the second own worksheet", () => {
    expect(needsPlus({ plus: null, ownWorksheetsUsed: 1 })).toBe(true);
    expect(needsPlus({ plus: null, ownWorksheetsUsed: 4 })).toBe(true);
  });

  it("never asks a Plus member", () => {
    expect(needsPlus({ plus, ownWorksheetsUsed: 7 })).toBe(false);
  });
});
