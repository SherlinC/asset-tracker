import { describe, expect, it } from "vitest";

import { fetchAssetPrice } from "./priceService";

describe("fetchAssetPrice currency linkage", () => {
  const exchangeRates = {
    USD: 7.2,
    HKD: 0.92,
    EUR: 7.8,
    JPY: 0.048,
    RUB: 0.079,
    CNY: 1,
  };

  it("prices RUB through exchange-rate linkage", async () => {
    const result = await fetchAssetPrice("RUB", "currency", exchangeRates);

    expect(result.priceCNY).toBeCloseTo(0.079, 6);
    expect(result.priceUSD).toBeCloseTo(0.079 / 7.2, 6);
    expect(result.change24h).toBe(0);
  });

  it("treats USDT as USD-linked cash", async () => {
    const result = await fetchAssetPrice("USDT", "currency", exchangeRates);

    expect(result.priceUSD).toBe(1);
    expect(result.priceCNY).toBe(7.2);
    expect(result.change24h).toBe(0);
  });
});
