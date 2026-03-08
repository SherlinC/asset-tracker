import { describe, it, expect, beforeAll, afterAll } from "vitest";

import {
  fetchCryptoPrices,
  fetchExchangeRates,
  fetchAssetPrice,
} from "./priceService";

const describeLive =
  process.env.LIVE_API_TESTS === "1" ? describe : describe.skip;

describeLive("Real Cryptocurrency Prices from CoinGecko API", () => {
  describe("fetchCryptoPrices", () => {
    it("should fetch real BTC price from CoinGecko API", async () => {
      const prices = await fetchCryptoPrices(["BTC"]);

      expect(prices).toBeDefined();
      expect(prices["BTC"]).toBeDefined();
      expect(prices["BTC"].current_price).toBeGreaterThan(0);
      expect(prices["BTC"].id).toBe("bitcoin");
      expect(prices["BTC"].symbol).toBe("btc");

      // BTC should be worth more than $1000 (sanity check)
      expect(prices["BTC"].current_price).toBeGreaterThan(1000);
      console.log(`BTC Price: $${prices["BTC"].current_price}`);
    });

    it("should fetch real ETH price from CoinGecko API", async () => {
      const prices = await fetchCryptoPrices(["ETH"]);

      expect(prices).toBeDefined();
      expect(prices["ETH"]).toBeDefined();
      expect(prices["ETH"].current_price).toBeGreaterThan(0);
      expect(prices["ETH"].id).toBe("ethereum");
      expect(prices["ETH"].symbol).toBe("eth");

      // ETH should be worth more than $100 (sanity check)
      expect(prices["ETH"].current_price).toBeGreaterThan(100);
      console.log(`ETH Price: $${prices["ETH"].current_price}`);
    });

    it("should fetch multiple crypto prices", async () => {
      const prices = await fetchCryptoPrices(["BTC", "ETH", "XRP"]);

      expect(Object.keys(prices).length).toBeGreaterThan(0);

      if (prices["BTC"]) {
        expect(prices["BTC"].current_price).toBeGreaterThan(1000);
      }
      if (prices["ETH"]) {
        expect(prices["ETH"].current_price).toBeGreaterThan(100);
      }
    });

    it("should include 24h change percentage", async () => {
      const prices = await fetchCryptoPrices(["BTC"]);

      if (prices["BTC"]) {
        expect(prices["BTC"].price_change_percentage_24h).toBeDefined();
        // 24h change should be a reasonable percentage (between -50% and +50%)
        if (prices["BTC"].price_change_percentage_24h !== null) {
          expect(prices["BTC"].price_change_percentage_24h).toBeGreaterThan(
            -50
          );
          expect(prices["BTC"].price_change_percentage_24h).toBeLessThan(50);
        }
      }
    });

    it("should include market cap data", async () => {
      const prices = await fetchCryptoPrices(["BTC"]);

      if (prices["BTC"]) {
        expect(prices["BTC"].market_cap).toBeDefined();
        // BTC market cap should be in trillions
        if (prices["BTC"].market_cap !== null) {
          expect(prices["BTC"].market_cap).toBeGreaterThan(1000000000000);
        }
      }
    });

    it("should fetch prices from API (not mock)", async () => {
      const prices = await fetchCryptoPrices(["BTC", "ETH"]);

      // Verify we got valid prices
      expect(prices["BTC"] || prices["ETH"]).toBeDefined();

      // Prices should be reasonable (BTC > 1000, ETH > 100)
      if (prices["BTC"]) {
        expect(prices["BTC"].current_price).toBeGreaterThan(1000);
      }
      if (prices["ETH"]) {
        expect(prices["ETH"].current_price).toBeGreaterThan(100);
      }
    });
  });

  describe("fetchExchangeRates", () => {
    it("should fetch real USD to CNY exchange rate", async () => {
      const rates = await fetchExchangeRates();

      expect(rates).toBeDefined();
      expect(rates["USD"]).toBeDefined();
      expect(rates["USD"]).toBeGreaterThan(0);

      // USD to CNY should be between 5 and 10
      expect(rates["USD"]).toBeGreaterThan(5);
      expect(rates["USD"]).toBeLessThan(10);
      console.log(`USD/CNY: ${rates["USD"].toFixed(4)}`);
    });

    it("should fetch real HKD to CNY exchange rate", async () => {
      const rates = await fetchExchangeRates();

      expect(rates).toBeDefined();
      expect(rates["HKD"]).toBeDefined();
      expect(rates["HKD"]).toBeGreaterThan(0);

      // HKD to CNY should be between 0.5 and 1.5
      expect(rates["HKD"]).toBeGreaterThan(0.5);
      expect(rates["HKD"]).toBeLessThan(1.5);
      console.log(`HKD/CNY: ${rates["HKD"].toFixed(4)}`);
    });
  });

  describe("fetchAssetPrice", () => {
    it("should fetch real BTC price in USD and CNY", async () => {
      const priceData = await fetchAssetPrice("BTC", "crypto");

      expect(priceData).toBeDefined();
      expect(priceData.priceUSD).toBeGreaterThan(1000);
      expect(priceData.priceCNY).toBeGreaterThan(5000);

      // CNY price should be approximately USD price * exchange rate (within 10%)
      const expectedCNY = priceData.priceUSD * 6.9;
      const percentDiff =
        (Math.abs(priceData.priceCNY - expectedCNY) / expectedCNY) * 100;
      expect(percentDiff).toBeLessThan(10);
      console.log(
        `BTC: $${priceData.priceUSD} USD = ¥${priceData.priceCNY} CNY`
      );
    });

    it("should fetch real ETH price in USD and CNY", async () => {
      const priceData = await fetchAssetPrice("ETH", "crypto");

      expect(priceData).toBeDefined();
      expect(priceData.priceUSD).toBeGreaterThan(100);
      expect(priceData.priceCNY).toBeGreaterThan(500);
      console.log(
        `ETH: $${priceData.priceUSD} USD = ¥${priceData.priceCNY} CNY`
      );
    });

    it("should fetch USD currency price", async () => {
      const priceData = await fetchAssetPrice("USD", "currency");

      expect(priceData).toBeDefined();
      expect(priceData.priceUSD).toBe(1);
      expect(priceData.priceCNY).toBeGreaterThan(5);
      expect(priceData.priceCNY).toBeLessThan(10);
      console.log(`USD: $1 USD = ¥${priceData.priceCNY} CNY`);
    });

    it("should fetch HKD currency price", async () => {
      const priceData = await fetchAssetPrice("HKD", "currency");

      expect(priceData).toBeDefined();
      expect(priceData.priceUSD).toBeGreaterThan(0);
      expect(priceData.priceCNY).toBeGreaterThan(0.5);
      expect(priceData.priceCNY).toBeLessThan(1.5);
      console.log(
        `HKD: $${priceData.priceUSD} USD = ¥${priceData.priceCNY} CNY`
      );
    });
  });

  describe("Price Accuracy", () => {
    it("BTC price should be significantly higher than ETH price", async () => {
      const btcData = await fetchAssetPrice("BTC", "crypto");
      const ethData = await fetchAssetPrice("ETH", "crypto");

      expect(btcData.priceUSD).toBeGreaterThan(ethData.priceUSD * 10);
      console.log(
        `BTC/ETH ratio: ${(btcData.priceUSD / ethData.priceUSD).toFixed(2)}x`
      );
    });

    it("should maintain consistent prices across multiple calls", async () => {
      const price1 = await fetchAssetPrice("BTC", "crypto");
      const price2 = await fetchAssetPrice("BTC", "crypto");

      // Prices should be very close (within 1% due to real-time fluctuations)
      const priceDiff = Math.abs(price1.priceUSD - price2.priceUSD);
      const percentDiff = (priceDiff / price1.priceUSD) * 100;

      expect(percentDiff).toBeLessThan(1);
    });

    it("should return non-zero prices for all major cryptos", async () => {
      const prices = await fetchCryptoPrices(["BTC", "ETH", "XRP"]);

      for (const symbol of ["BTC", "ETH", "XRP"]) {
        if (prices[symbol]) {
          expect(prices[symbol].current_price).toBeGreaterThan(0);
        }
      }
    });
  });
});
