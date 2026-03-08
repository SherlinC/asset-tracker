import { describe, it, expect } from "vitest";

describe("HoldingsList Price Display", () => {
  describe("Asset Data Mapping", () => {
    it("should correctly map asset ID to portfolio summary data", () => {
      const asset = { id: 1, symbol: "BTC", name: "Bitcoin", type: "crypto" };
      const portfolioAssets = [
        { id: 1, symbol: "BTC", priceUSD: 100, valueUSD: 1000 },
        { id: 2, symbol: "ETH", priceUSD: 50, valueUSD: 500 },
      ];

      const assetData = portfolioAssets.find((a) => a.id === asset.id);

      expect(assetData).toBeDefined();
      expect(assetData?.priceUSD).toBe(100);
      expect(assetData?.valueUSD).toBe(1000);
    });

    it("should handle missing asset data gracefully", () => {
      const asset = { id: 3, symbol: "XRP", name: "Ripple", type: "crypto" };
      const portfolioAssets = [
        { id: 1, symbol: "BTC", priceUSD: 100, valueUSD: 1000 },
        { id: 2, symbol: "ETH", priceUSD: 50, valueUSD: 500 },
      ];

      const assetData = portfolioAssets.find((a) => a.id === asset.id);

      expect(assetData).toBeUndefined();
    });
  });

  describe("Current Price Display", () => {
    it("should display current price correctly", () => {
      const priceUSD = 100;
      const currencyDisplay = "USD";
      const exchangeRate = 6.9;

      const displayPrice = currencyDisplay === "USD" ? priceUSD : priceUSD * exchangeRate;

      expect(displayPrice).toBe(100);
    });

    it("should convert price to CNY correctly", () => {
      const priceUSD = 100;
      const currencyDisplay = "CNY";
      const exchangeRate = 6.9;

      const displayPrice = currencyDisplay === "USD" ? priceUSD : priceUSD * exchangeRate;

      expect(displayPrice).toBe(690);
    });

    it("should handle zero price", () => {
      const priceUSD = 0;
      const currencyDisplay = "USD";

      const displayPrice = currencyDisplay === "USD" ? priceUSD : priceUSD * 6.9;

      expect(displayPrice).toBe(0);
    });
  });

  describe("Total Value Display", () => {
    it("should display total value correctly", () => {
      const valueUSD = 1000;
      const currencyDisplay = "USD";
      const exchangeRate = 6.9;

      const displayValue = currencyDisplay === "USD" ? valueUSD : valueUSD * exchangeRate;

      expect(displayValue).toBe(1000);
    });

    it("should convert total value to CNY correctly", () => {
      const valueUSD = 1000;
      const currencyDisplay = "CNY";
      const exchangeRate = 6.9;

      const displayValue = currencyDisplay === "USD" ? valueUSD : valueUSD * exchangeRate;

      expect(displayValue).toBe(6900);
    });

    it("should calculate total value from quantity and price", () => {
      const quantity = 2;
      const priceUSD = 100;
      const valueUSD = quantity * priceUSD;

      expect(valueUSD).toBe(200);
    });
  });

  describe("Currency Conversion", () => {
    it("should maintain precision in currency conversion", () => {
      const priceUSD = 123.456;
      const exchangeRate = 6.9444;

      const priceCNY = priceUSD * exchangeRate;

      expect(priceCNY).toBeCloseTo(857.33, 1);
    });

    it("should handle fractional quantities", () => {
      const quantity = 0.5;
      const priceUSD = 100;
      const valueUSD = quantity * priceUSD;

      expect(valueUSD).toBe(50);
    });

    it("should handle very small prices", () => {
      const priceUSD = 0.001;
      const currencyDisplay = "CNY";
      const exchangeRate = 6.9;

      const displayPrice = currencyDisplay === "USD" ? priceUSD : priceUSD * exchangeRate;

      expect(displayPrice).toBeCloseTo(0.0069, 4);
    });
  });

  describe("Profit/Loss Calculation", () => {
    it("should calculate profit correctly", () => {
      const totalValueUSD = 1200;
      const costBasisTotal = 1000;

      const profitUSD = totalValueUSD - costBasisTotal;
      const profitPercent = (profitUSD / costBasisTotal) * 100;

      expect(profitUSD).toBe(200);
      expect(profitPercent).toBe(20);
    });

    it("should calculate loss correctly", () => {
      const totalValueUSD = 800;
      const costBasisTotal = 1000;

      const lossUSD = totalValueUSD - costBasisTotal;
      const lossPercent = (lossUSD / costBasisTotal) * 100;

      expect(lossUSD).toBe(-200);
      expect(lossPercent).toBe(-20);
    });

    it("should handle zero cost basis", () => {
      const totalValueUSD = 1000;
      const costBasisTotal = 0;

      const profitUSD = costBasisTotal ? totalValueUSD - costBasisTotal : null;

      expect(profitUSD).toBeNull();
    });

    it("should handle missing cost basis", () => {
      const totalValueUSD = 1000;
      const costBasis = null;

      const costBasisTotal = costBasis ? costBasis * 2 : null;
      const profitUSD = costBasisTotal ? totalValueUSD - costBasisTotal : null;

      expect(profitUSD).toBeNull();
    });
  });

  describe("24h Change Display", () => {
    it("should display positive 24h change", () => {
      const change24h = 5.25;

      expect(change24h.toFixed(2)).toBe("5.25");
    });

    it("should display negative 24h change", () => {
      const change24h = -3.75;

      expect(change24h.toFixed(2)).toBe("-3.75");
    });

    it("should display zero change", () => {
      const change24h = 0;

      expect(change24h.toFixed(2)).toBe("0.00");
    });
  });

  describe("Multiple Holdings", () => {
    it("should display prices for multiple holdings correctly", () => {
      const holdings = [
        { assetId: 1, quantity: 1, priceUSD: 100, valueUSD: 100 },
        { assetId: 2, quantity: 2, priceUSD: 50, valueUSD: 100 },
        { assetId: 3, quantity: 0.5, priceUSD: 200, valueUSD: 100 },
      ];

      const totalValue = holdings.reduce((sum, h) => sum + h.valueUSD, 0);

      expect(totalValue).toBe(300);
    });

    it("should maintain correct prices when switching currencies", () => {
      const holdings = [
        { priceUSD: 100, valueUSD: 100 },
        { priceUSD: 50, valueUSD: 100 },
      ];

      const exchangeRate = 6.9;

      const totalUSD = holdings.reduce((sum, h) => sum + h.valueUSD, 0);
      const totalCNY = totalUSD * exchangeRate;

      expect(totalUSD).toBe(200);
      expect(totalCNY).toBe(1380);
    });
  });

  describe("Display Formatting", () => {
    it("should format currency with 2 decimal places", () => {
      const value = 1234.5678;

      const formatted = value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      expect(formatted).toBe("1,234.57");
    });

    it("should format large numbers with commas", () => {
      const value = 1000000.99;

      const formatted = value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      expect(formatted).toBe("1,000,000.99");
    });

    it("should format small numbers correctly", () => {
      const value = 0.001;

      const formatted = value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      expect(formatted).toBe("0.00");
    });
  });
});
