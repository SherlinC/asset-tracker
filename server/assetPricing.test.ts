import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getPriceByAssetId: vi.fn(),
  upsertPrice: vi.fn(),
}));

vi.mock("./priceService", () => ({
  fetchAssetPrice: vi.fn(),
  fetchExchangeRates: vi.fn(),
}));

import * as db from "./db";
import * as priceService from "./priceService";
import { fetchAssetPriceWithFallback } from "./assetPricing";

describe("fetchAssetPriceWithFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists successful live prices", async () => {
    vi.mocked(priceService.fetchAssetPrice).mockResolvedValue({
      priceUSD: 12.34,
      priceCNY: 88.85,
      change24h: 1.23,
    });

    const result = await fetchAssetPriceWithFallback(
      27,
      "LU0633140727.EUFUND",
      "fund"
    );

    expect(result.priceUSD).toBe(12.34);
    expect(db.upsertPrice).toHaveBeenCalledWith(27, "12.34", "1.23");
    expect(db.getPriceByAssetId).not.toHaveBeenCalled();
  });

  it("falls back to cached USD price when live price is missing", async () => {
    vi.mocked(priceService.fetchAssetPrice).mockResolvedValue({
      priceUSD: 0,
      priceCNY: 0,
      change24h: 0,
    });
    vi.mocked(db.getPriceByAssetId).mockResolvedValue({
      id: 1,
      assetId: 27,
      price: "10.50",
      change24h: "-0.84",
      marketCap: null,
      updatedAt: new Date(),
    });
    vi.mocked(priceService.fetchExchangeRates).mockResolvedValue({
      USD: 7.2,
      HKD: 0.92,
      EUR: 7.8,
      JPY: 0.048,
      CNY: 1,
    });

    const result = await fetchAssetPriceWithFallback(
      27,
      "LU0633140727.EUFUND",
      "fund"
    );

    expect(result.priceUSD).toBe(10.5);
    expect(result.priceCNY).toBeCloseTo(75.6, 4);
    expect(result.change24h).toBe(-0.84);
  });
});
