import { describe, it, expect, beforeEach, vi } from "vitest";

import * as priceService from "./priceService";

const describeLive =
  process.env.LIVE_API_TESTS === "1" ? describe : describe.skip;

describeLive("Real-time Price Fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAssetPrice", () => {
    it("should fetch USD currency price", async () => {
      const result = await priceService.fetchAssetPrice("USD", "currency");

      expect(result.priceUSD).toBe(1);
      expect(result.priceCNY).toBeGreaterThan(5);
      expect(result.priceCNY).toBeLessThan(10);
    });

    it("should fetch HKD currency price", async () => {
      const result = await priceService.fetchAssetPrice("HKD", "currency");

      expect(result.priceUSD).toBeGreaterThan(0);
      expect(result.priceCNY).toBeGreaterThan(0);
    });

    it("should fetch BTC crypto price", async () => {
      const result = await priceService.fetchAssetPrice("BTC", "crypto");

      expect(result.priceUSD).toBeGreaterThan(1000);
      expect(result.priceCNY).toBeGreaterThan(5000);
      expect(result).toHaveProperty("change24h");
    });

    it("should fetch ETH crypto price", async () => {
      const result = await priceService.fetchAssetPrice("ETH", "crypto");

      expect(result.priceUSD).toBeGreaterThan(100);
      expect(result.priceCNY).toBeGreaterThan(500);
    });

    it("should fetch AAPL stock price", async () => {
      const result = await priceService.fetchAssetPrice("AAPL", "stock");

      expect(result.priceUSD).toBeGreaterThan(0);
      expect(result.priceCNY).toBeGreaterThan(0);
      expect(result).toHaveProperty("change24h");
    });

    it("should fetch GOOGL stock price", async () => {
      const result = await priceService.fetchAssetPrice("GOOGL", "stock");

      expect(result.priceUSD).toBeGreaterThan(0);
    });

    it("should fetch TSLA stock price", async () => {
      const result = await priceService.fetchAssetPrice("TSLA", "stock");

      expect(result.priceUSD).toBeGreaterThan(0);
    });

    it("should convert USD to CNY correctly", async () => {
      const result = await priceService.fetchAssetPrice("USD", "currency");

      // USD price should be 1
      expect(result.priceUSD).toBe(1);
      // CNY should be approximately 7x the USD rate
      expect(result.priceCNY).toBeGreaterThan(6);
      expect(result.priceCNY).toBeLessThan(8);
    });

    it("should handle multiple asset types", async () => {
      const [currency, crypto, stock] = await Promise.all([
        priceService.fetchAssetPrice("USD", "currency"),
        priceService.fetchAssetPrice("BTC", "crypto"),
        priceService.fetchAssetPrice("AAPL", "stock"),
      ]);

      expect(currency.priceUSD).toBeGreaterThan(0);
      expect(crypto.priceUSD).toBeGreaterThan(0);
      expect(stock.priceUSD).toBeGreaterThan(0);
    });

    it("should handle invalid symbols gracefully", async () => {
      const result = await priceService.fetchAssetPrice("INVALID", "stock");

      expect(result.priceUSD).toBe(0);
      expect(result.priceCNY).toBe(0);
    });
  });

  describe("Price Conversion", () => {
    it("should correctly convert crypto prices to both currencies", async () => {
      const result = await priceService.fetchAssetPrice("BTC", "crypto");

      expect(result.priceUSD).toBeGreaterThan(0);
      expect(result.priceCNY).toBeGreaterThan(result.priceUSD * 5);
    });

    it("should maintain consistent conversion rates", async () => {
      const usd = await priceService.fetchAssetPrice("USD", "currency");
      const btc = await priceService.fetchAssetPrice("BTC", "crypto");

      // BTC CNY should be approximately BTC USD * USD CNY rate
      const expectedBTCCNY = btc.priceUSD * usd.priceCNY;
      const percentDiff =
        (Math.abs(btc.priceCNY - expectedBTCCNY) / expectedBTCCNY) * 100;
      expect(percentDiff).toBeLessThan(5);
    });
  });

  describe("Market Cap Data", () => {
    it("should have valid price data for crypto assets", async () => {
      const result = await priceService.fetchAssetPrice("BTC", "crypto");

      expect(result.priceUSD).toBeGreaterThan(1000);
      expect(result.priceCNY).toBeGreaterThan(5000);
    });

    it("should return valid prices for all asset types", async () => {
      const stock = await priceService.fetchAssetPrice("AAPL", "stock");
      const currency = await priceService.fetchAssetPrice("USD", "currency");
      const crypto = await priceService.fetchAssetPrice("BTC", "crypto");

      expect(stock.priceUSD).toBeGreaterThan(0);
      expect(currency.priceUSD).toBeGreaterThan(0);
      expect(crypto.priceUSD).toBeGreaterThan(0);
    });
  });

  describe("24h Change Data", () => {
    it("should include 24h change for crypto assets", async () => {
      const result = await priceService.fetchAssetPrice("BTC", "crypto");

      expect(result).toHaveProperty("change24h");
      expect(typeof result.change24h).toBe("number");
    });

    it("should handle positive 24h changes", async () => {
      const result = await priceService.fetchAssetPrice("BTC", "crypto");

      // 24h change should be a reasonable percentage
      expect(result.change24h).toBeGreaterThan(-50);
      expect(result.change24h).toBeLessThan(50);
    });

    it("should handle negative 24h changes", async () => {
      const result = await priceService.fetchAssetPrice("ETH", "crypto");

      // 24h change should be a reasonable percentage
      expect(result.change24h).toBeGreaterThan(-50);
      expect(result.change24h).toBeLessThan(50);
    });
  });
});
