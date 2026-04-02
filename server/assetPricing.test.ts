import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAssetPriceWithFallback } from "./assetPricing";
import * as db from "./db";
import * as priceService from "./priceService";

import type * as envModule from "./_core/env";

vi.mock("./_core/env", async () => {
  const actual = await vi.importActual<typeof envModule>("./_core/env");

  return {
    ...actual,
    ENV: {
      ...actual.ENV,
      eodhdApiKey: "",
      priceCacheMaxAgeMinutes: 30,
    },
  };
});

vi.mock("./db", () => ({
  getPriceByAssetId: vi.fn(),
  upsertPrice: vi.fn(),
}));

vi.mock("./priceService", () => ({
  fetchAssetPrice: vi.fn(),
  fetchExchangeRates: vi.fn(),
}));

describe("fetchAssetPriceWithFallback", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T12:00:00.000Z"));

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
      updatedAt: new Date("2026-03-22T11:50:00.000Z"),
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
    expect(result.source).toBe("cache");
  });

  it("ignores stale cached prices when live price is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T12:00:00.000Z"));

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
      updatedAt: new Date("2026-03-22T11:00:00.000Z"),
    });

    const result = await fetchAssetPriceWithFallback(27, "600519.SS", "stock");

    expect(result).toEqual({
      priceUSD: 0,
      priceCNY: 0,
      change24h: 0,
      source: "empty",
      issueCode: undefined,
    });
    expect(priceService.fetchExchangeRates).not.toHaveBeenCalled();
  });

  it("marks missing EODHD config for international fund price failures", async () => {
    vi.mocked(priceService.fetchAssetPrice).mockResolvedValue({
      priceUSD: 0,
      priceCNY: 0,
      change24h: 0,
    });
    vi.mocked(db.getPriceByAssetId).mockResolvedValue(null);

    const result = await fetchAssetPriceWithFallback(
      27,
      "LU0633140727.EUFUND",
      "fund"
    );

    expect(result).toEqual({
      priceUSD: 0,
      priceCNY: 0,
      change24h: 0,
      source: "empty",
      issueCode: "missing_eodhd_api_key",
    });
  });
});
