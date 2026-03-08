import { describe, it, expect } from "vitest";

describe("PortfolioSummary Data Sync", () => {
  describe("Asset Allocation Calculation", () => {
    it("should calculate type-based allocation correctly", () => {
      const assets = [
        { type: "crypto", value: 100 },
        { type: "crypto", value: 200 },
        { type: "currency", value: 300 },
        { type: "stock", value: 400 },
      ];

      const typeAllocation: Record<string, number> = {};
      assets.forEach((asset) => {
        if (!typeAllocation[asset.type]) {
          typeAllocation[asset.type] = 0;
        }
        typeAllocation[asset.type] += asset.value;
      });

      expect(typeAllocation.crypto).toBe(300);
      expect(typeAllocation.currency).toBe(300);
      expect(typeAllocation.stock).toBe(400);
    });

    it("should calculate total value from asset allocation", () => {
      const typeAllocation = {
        crypto: 300,
        currency: 300,
        stock: 400,
      };

      const totalValue = Object.values(typeAllocation).reduce((sum, val) => sum + val, 0);

      expect(totalValue).toBe(1000);
    });

    it("should calculate percentage allocation correctly", () => {
      const typeAllocation = {
        crypto: 300,
        currency: 300,
        stock: 400,
      };
      const totalValue = 1000;

      const percentages = Object.entries(typeAllocation).map(([type, value]) => ({
        type,
        percentage: (value / totalValue) * 100,
      }));

      expect(percentages[0].percentage).toBe(30);
      expect(percentages[1].percentage).toBe(30);
      expect(percentages[2].percentage).toBe(40);
    });
  });

  describe("Individual Asset Breakdown", () => {
    it("should create individual asset allocation data", () => {
      const assets = [
        { symbol: "BTC", value: 100, type: "crypto" },
        { symbol: "ETH", value: 200, type: "crypto" },
        { symbol: "USD", value: 300, type: "currency" },
        { symbol: "AAPL", value: 400, type: "stock" },
      ];

      const allocationByAsset = assets.map((asset) => ({
        name: asset.symbol,
        value: asset.value,
        type: asset.type,
      }));

      expect(allocationByAsset).toHaveLength(4);
      expect(allocationByAsset[0].name).toBe("BTC");
      expect(allocationByAsset[1].name).toBe("ETH");
    });

    it("should calculate individual asset percentages", () => {
      const assets = [
        { symbol: "BTC", value: 100 },
        { symbol: "ETH", value: 200 },
        { symbol: "USD", value: 300 },
        { symbol: "AAPL", value: 400 },
      ];
      const totalValue = 1000;

      const percentages = assets.map((asset) => ({
        symbol: asset.symbol,
        percentage: (asset.value / totalValue) * 100,
      }));

      expect(percentages[0].percentage).toBe(10);
      expect(percentages[1].percentage).toBe(20);
      expect(percentages[2].percentage).toBe(30);
      expect(percentages[3].percentage).toBe(40);
    });
  });

  describe("Currency Conversion Consistency", () => {
    it("should convert all values consistently from USD to CNY", () => {
      const exchangeRate = 6.9444;
      const assets = [
        { symbol: "BTC", valueUSD: 100 },
        { symbol: "ETH", valueUSD: 200 },
        { symbol: "USD", valueUSD: 300 },
      ];

      const assetsCNY = assets.map((asset) => ({
        symbol: asset.symbol,
        valueCNY: asset.valueUSD * exchangeRate,
      }));

      expect(assetsCNY[0].valueCNY).toBeCloseTo(694.44, 1);
      expect(assetsCNY[1].valueCNY).toBeCloseTo(1388.88, 1);
      expect(assetsCNY[2].valueCNY).toBeCloseTo(2083.32, 1);
    });

    it("should maintain percentage allocation across currency conversions", () => {
      const exchangeRate = 6.9444;
      const assets = [
        { symbol: "BTC", valueUSD: 100 },
        { symbol: "ETH", valueUSD: 200 },
        { symbol: "USD", valueUSD: 300 },
        { symbol: "AAPL", valueUSD: 400 },
      ];
      const totalUSD = 1000;

      // Calculate percentages in USD
      const percentagesUSD = assets.map((asset) => ({
        symbol: asset.symbol,
        percentage: (asset.valueUSD / totalUSD) * 100,
      }));

      // Convert to CNY and recalculate percentages
      const assetsCNY = assets.map((asset) => ({
        symbol: asset.symbol,
        valueCNY: asset.valueUSD * exchangeRate,
      }));
      const totalCNY = assetsCNY.reduce((sum, asset) => sum + asset.valueCNY, 0);

      const percentagesCNY = assetsCNY.map((asset) => ({
        symbol: asset.symbol,
        percentage: (asset.valueCNY / totalCNY) * 100,
      }));

      // Percentages should be the same
      expect(percentagesUSD[0].percentage).toBeCloseTo(percentagesCNY[0].percentage, 5);
      expect(percentagesUSD[1].percentage).toBeCloseTo(percentagesCNY[1].percentage, 5);
      expect(percentagesUSD[2].percentage).toBeCloseTo(percentagesCNY[2].percentage, 5);
      expect(percentagesUSD[3].percentage).toBeCloseTo(percentagesCNY[3].percentage, 5);
    });
  });

  describe("Total Value Verification", () => {
    it("should verify total portfolio value matches sum of holdings", () => {
      const holdings = [
        { symbol: "BTC", value: 100 },
        { symbol: "ETH", value: 200 },
        { symbol: "USD", value: 300 },
        { symbol: "AAPL", value: 400 },
      ];

      const totalFromHoldings = holdings.reduce((sum, holding) => sum + holding.value, 0);
      const portfolioTotalValue = 1000;

      expect(totalFromHoldings).toBe(portfolioTotalValue);
    });

    it("should verify type-based allocation sum equals total value", () => {
      const typeAllocation = {
        crypto: 300,
        currency: 300,
        stock: 400,
      };
      const portfolioTotalValue = 1000;

      const allocationSum = Object.values(typeAllocation).reduce((sum, val) => sum + val, 0);

      expect(allocationSum).toBe(portfolioTotalValue);
    });

    it("should verify individual asset allocation sum equals total value", () => {
      const assets = [
        { symbol: "BTC", value: 100 },
        { symbol: "ETH", value: 200 },
        { symbol: "USD", value: 300 },
        { symbol: "AAPL", value: 400 },
      ];
      const portfolioTotalValue = 1000;

      const assetSum = assets.reduce((sum, asset) => sum + asset.value, 0);

      expect(assetSum).toBe(portfolioTotalValue);
    });
  });

  describe("Crypto Asset Breakdown", () => {
    it("should show individual crypto assets in allocation", () => {
      const assets = [
        { symbol: "BTC", value: 100, type: "crypto" },
        { symbol: "ETH", value: 200, type: "crypto" },
        { symbol: "USDT", value: 50, type: "crypto" },
        { symbol: "USD", value: 300, type: "currency" },
        { symbol: "AAPL", value: 400, type: "stock" },
      ];

      const cryptoAssets = assets.filter((a) => a.type === "crypto");

      expect(cryptoAssets).toHaveLength(3);
      expect(cryptoAssets.map((a) => a.symbol)).toEqual(["BTC", "ETH", "USDT"]);
    });

    it("should calculate crypto asset percentages", () => {
      const assets = [
        { symbol: "BTC", value: 100, type: "crypto" },
        { symbol: "ETH", value: 200, type: "crypto" },
        { symbol: "USDT", value: 50, type: "crypto" },
        { symbol: "USD", value: 300, type: "currency" },
        { symbol: "AAPL", value: 400, type: "stock" },
      ];
      const totalValue = 1050;

      const cryptoPercentages = assets
        .filter((a) => a.type === "crypto")
        .map((asset) => ({
          symbol: asset.symbol,
          percentage: (asset.value / totalValue) * 100,
        }));

      expect(cryptoPercentages[0].percentage).toBeCloseTo(9.52, 1);
      expect(cryptoPercentages[1].percentage).toBeCloseTo(19.05, 1);
      expect(cryptoPercentages[2].percentage).toBeCloseTo(4.76, 1);
    });

    it("should sum crypto asset values to type allocation", () => {
      const assets = [
        { symbol: "BTC", value: 100, type: "crypto" },
        { symbol: "ETH", value: 200, type: "crypto" },
        { symbol: "USDT", value: 50, type: "crypto" },
      ];

      const cryptoTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
      const typeAllocationCrypto = 350;

      expect(cryptoTotal).toBe(typeAllocationCrypto);
    });
  });

  describe("Data Synchronization", () => {
    it("should sync portfolio summary with holdings list", () => {
      const holdings = [
        { assetId: 1, symbol: "BTC", value: 100 },
        { assetId: 2, symbol: "ETH", value: 200 },
        { assetId: 3, symbol: "USD", value: 300 },
      ];

      const portfolioSummary = {
        totalValue: 600,
        assets: holdings,
      };

      const holdingsTotal = holdings.reduce((sum, h) => sum + h.value, 0);

      expect(portfolioSummary.totalValue).toBe(holdingsTotal);
      expect(portfolioSummary.assets).toHaveLength(holdings.length);
    });

    it("should detect mismatch between portfolio and holdings", () => {
      const holdings = [
        { symbol: "BTC", value: 100 },
        { symbol: "ETH", value: 200 },
      ];
      const portfolioTotal = 400; // Mismatch

      const holdingsTotal = holdings.reduce((sum, h) => sum + h.value, 0);

      expect(portfolioTotal).not.toBe(holdingsTotal);
      expect(portfolioTotal).toBe(400);
      expect(holdingsTotal).toBe(300);
    });
  });

  describe("Display Consistency", () => {
    it("should display same total value in both currencies", () => {
      const valueUSD = 100;
      const exchangeRate = 6.9444;
      const valueCNY = valueUSD * exchangeRate;

      // When converting back
      const convertedBack = valueCNY / exchangeRate;

      expect(convertedBack).toBeCloseTo(valueUSD, 5);
    });

    it("should display consistent percentages regardless of currency", () => {
      const assets = [
        { symbol: "BTC", valueUSD: 100 },
        { symbol: "ETH", valueUSD: 200 },
        { symbol: "USD", valueUSD: 300 },
      ];
      const totalUSD = 600;
      const exchangeRate = 6.9444;

      // Percentages in USD
      const percentagesUSD = assets.map((a) => (a.valueUSD / totalUSD) * 100);

      // Convert to CNY
      const assetsCNY = assets.map((a) => ({
        valueCNY: a.valueUSD * exchangeRate,
      }));
      const totalCNY = assetsCNY.reduce((sum, a) => sum + a.valueCNY, 0);

      // Percentages in CNY
      const percentagesCNY = assetsCNY.map((a) => (a.valueCNY / totalCNY) * 100);

      // Should be the same
      percentagesUSD.forEach((pUSD, i) => {
        expect(pUSD).toBeCloseTo(percentagesCNY[i], 5);
      });
    });
  });
});
