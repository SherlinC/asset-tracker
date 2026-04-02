import { describe, expect, it } from "vitest";

import { getHoldingInterestMultiplier } from "./routers";

describe("getHoldingInterestMultiplier", () => {
  it("accrues simple interest for currency holdings", () => {
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    const now = new Date("2025-07-02T00:00:00.000Z").getTime();

    const multiplier = getHoldingInterestMultiplier(
      "currency",
      "3.65",
      createdAt,
      now
    );

    expect(multiplier).toBeCloseTo(1.0181, 3);
  });

  it("does not apply deposit interest to non-currency holdings", () => {
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    const now = new Date("2025-07-02T00:00:00.000Z").getTime();

    const multiplier = getHoldingInterestMultiplier(
      "stock",
      "3.65",
      createdAt,
      now
    );

    expect(multiplier).toBe(1);
  });
});
