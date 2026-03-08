import { describe, it, expect } from "vitest";

import * as priceService from "./priceService";

const describeLive =
  process.env.LIVE_API_TESTS === "1" ? describe : describe.skip;

describeLive("Real-time Price API Integration", () => {
  describe("CoinGecko API", () => {
    it("should fetch real BTC price", async () => {
      const prices = await priceService.fetchCryptoPrices(["BTC"]);

      expect(prices["BTC"]).toBeDefined();
      expect(prices["BTC"].current_price).toBeGreaterThan(1000);
      expect(prices["BTC"].id).toBe("bitcoin");
    });

    it("should fetch real ETH price", async () => {
      const prices = await priceService.fetchCryptoPrices(["ETH"]);

      expect(prices["ETH"]).toBeDefined();
      expect(prices["ETH"].current_price).toBeGreaterThan(100);
      expect(prices["ETH"].id).toBe("ethereum");
    });

    it("should include market cap data", async () => {
      const prices = await priceService.fetchCryptoPrices(["BTC"]);

      if (prices["BTC"] && prices["BTC"].market_cap) {
        expect(prices["BTC"].market_cap).toBeGreaterThan(1000000000000);
      }
    });

    it("should include 24h change percentage", async () => {
      const prices = await priceService.fetchCryptoPrices(["BTC"]);

      if (prices["BTC"] && prices["BTC"].price_change_percentage_24h !== null) {
        expect(prices["BTC"].price_change_percentage_24h).toBeGreaterThan(-50);
        expect(prices["BTC"].price_change_percentage_24h).toBeLessThan(50);
      }
    });
  });

  describe("Exchange Rate API", () => {
    it("should fetch USD to CNY rate", async () => {
      const rates = await priceService.fetchExchangeRates();

      expect(rates["USD"]).toBeDefined();
      expect(rates["USD"]).toBeGreaterThan(5);
      expect(rates["USD"]).toBeLessThan(10);
    });

    it("should fetch HKD to CNY rate", async () => {
      const rates = await priceService.fetchExchangeRates();

      expect(rates["HKD"]).toBeDefined();
      expect(rates["HKD"]).toBeGreaterThan(0.5);
      expect(rates["HKD"]).toBeLessThan(1.5);
    });
  });

  describe("Asset Price Fetching", () => {
    it("should fetch BTC price in USD and CNY", async () => {
      const priceData = await priceService.fetchAssetPrice("BTC", "crypto");

      expect(priceData.priceUSD).toBeGreaterThan(1000);
      expect(priceData.priceCNY).toBeGreaterThan(5000);
    });

    it("should fetch ETH price in USD and CNY", async () => {
      const priceData = await priceService.fetchAssetPrice("ETH", "crypto");

      expect(priceData.priceUSD).toBeGreaterThan(100);
      expect(priceData.priceCNY).toBeGreaterThan(500);
    });

    it("should handle currency conversion for USD", async () => {
      const priceData = await priceService.fetchAssetPrice("USD", "currency");

      expect(priceData.priceUSD).toBe(1);
      expect(priceData.priceCNY).toBeGreaterThan(5);
      expect(priceData.priceCNY).toBeLessThan(10);
    });

    it("should handle currency conversion for HKD", async () => {
      const priceData = await priceService.fetchAssetPrice("HKD", "currency");

      expect(priceData.priceUSD).toBeGreaterThan(0);
      expect(priceData.priceCNY).toBeGreaterThan(0);
      // HKD price in USD should be around 0.13 (1 HKD = 0.13 USD)
      expect(priceData.priceUSD).toBeGreaterThan(0.1);
      expect(priceData.priceUSD).toBeLessThan(1.5);
    });
  });

  describe("API Fallback Behavior", () => {
    it("should return valid prices even if API is slow", async () => {
      const prices = await priceService.fetchCryptoPrices(["BTC", "ETH"]);

      // Should return either real or mock data
      expect(prices["BTC"] || prices["ETH"]).toBeDefined();
    });

    it("should maintain price consistency", async () => {
      const price1 = await priceService.fetchAssetPrice("BTC", "crypto");

      // Small delay to ensure fresh data
      await new Promise(resolve => setTimeout(resolve, 100));

      const price2 = await priceService.fetchAssetPrice("BTC", "crypto");

      // Prices should be very close (within 5% for market volatility)
      if (price1.priceUSD > 0 && price2.priceUSD > 0) {
        const percentDiff =
          (Math.abs(price1.priceUSD - price2.priceUSD) / price1.priceUSD) * 100;
        expect(percentDiff).toBeLessThan(5);
      }
    });
  });

  describe("Price Accuracy", () => {
    it("BTC should be significantly more expensive than ETH", async () => {
      const btcPrice = await priceService.fetchAssetPrice("BTC", "crypto");
      const ethPrice = await priceService.fetchAssetPrice("ETH", "crypto");

      expect(btcPrice.priceUSD).toBeGreaterThan(ethPrice.priceUSD * 10);
    });

    it("should return non-zero prices for all assets", async () => {
      const btc = await priceService.fetchAssetPrice("BTC", "crypto");
      const eth = await priceService.fetchAssetPrice("ETH", "crypto");
      const usd = await priceService.fetchAssetPrice("USD", "currency");

      expect(btc.priceUSD).toBeGreaterThan(0);
      expect(eth.priceUSD).toBeGreaterThan(0);
      expect(usd.priceUSD).toBeGreaterThan(0);
    });
  });
});
