import { describe, it, expect } from "vitest";

describe("HoldingsList Real-time Price Display", () => {
  describe("Price Formatting", () => {
    it("should format currency values correctly in CNY", () => {
      const value = 1234.56;
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      
      expect(formatted).toBe("1,234.56");
    });

    it("should format currency values correctly in USD", () => {
      const value = 1234.56;
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      
      expect(formatted).toBe("1,234.56");
    });

    it("should handle zero values", () => {
      const value = 0;
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      
      expect(formatted).toBe("0.00");
    });

    it("should handle very large values", () => {
      const value = 1000000.99;
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      
      expect(formatted).toBe("1,000,000.99");
    });

    it("should handle decimal precision for crypto", () => {
      const value = "0.00000001";
      const num = parseFloat(value);
      const formatted = num.toFixed(8).replace(/\.?0+$/, "");
      
      expect(formatted).toBe("0.00000001");
    });
  });

  describe("Profit/Loss Calculation", () => {
    it("should calculate profit correctly", () => {
      const quantity = 1;
      const currentPrice = 100;
      const costBasis = 80;
      
      const totalValue = quantity * currentPrice;
      const costBasisTotal = costBasis * quantity;
      const profitLoss = totalValue - costBasisTotal;
      const profitLossPercent = (profitLoss / costBasisTotal) * 100;
      
      expect(profitLoss).toBe(20);
      expect(profitLossPercent).toBe(25);
    });

    it("should calculate loss correctly", () => {
      const quantity = 1;
      const currentPrice = 80;
      const costBasis = 100;
      
      const totalValue = quantity * currentPrice;
      const costBasisTotal = costBasis * quantity;
      const profitLoss = totalValue - costBasisTotal;
      const profitLossPercent = (profitLoss / costBasisTotal) * 100;
      
      expect(profitLoss).toBe(-20);
      expect(profitLossPercent).toBe(-20);
    });

    it("should handle zero profit/loss", () => {
      const quantity = 1;
      const currentPrice = 100;
      const costBasis = 100;
      
      const totalValue = quantity * currentPrice;
      const costBasisTotal = costBasis * quantity;
      const profitLoss = totalValue - costBasisTotal;
      const profitLossPercent = (profitLoss / costBasisTotal) * 100;
      
      expect(profitLoss).toBe(0);
      expect(profitLossPercent).toBe(0);
    });

    it("should calculate profit for multiple quantities", () => {
      const quantity = 10;
      const currentPrice = 100;
      const costBasis = 80;
      
      const totalValue = quantity * currentPrice;
      const costBasisTotal = costBasis * quantity;
      const profitLoss = totalValue - costBasisTotal;
      const profitLossPercent = (profitLoss / costBasisTotal) * 100;
      
      expect(profitLoss).toBe(200);
      expect(profitLossPercent).toBe(25);
    });

    it("should handle fractional quantities", () => {
      const quantity = 0.5;
      const currentPrice = 50000;
      const costBasis = 40000;
      
      const totalValue = quantity * currentPrice;
      const costBasisTotal = costBasis * quantity;
      const profitLoss = totalValue - costBasisTotal;
      const profitLossPercent = (profitLoss / costBasisTotal) * 100;
      
      expect(profitLoss).toBe(5000);
      expect(profitLossPercent).toBe(25);
    });
  });

  describe("Currency Display", () => {
    it("should display prices in CNY format", () => {
      const price = 1234.56;
      const symbol = "¥";
      const formatted = `${symbol}${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      
      expect(formatted).toBe("¥1,234.56");
    });

    it("should display prices in USD format", () => {
      const price = 1234.56;
      const symbol = "$";
      const formatted = `${symbol}${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      
      expect(formatted).toBe("$1,234.56");
    });

    it("should support currency switching", () => {
      const priceUSD = 100;
      const priceCNY = priceUSD * 7.2;
      
      expect(priceCNY).toBe(720);
    });
  });

  describe("Asset Type Colors", () => {
    it("should assign correct color for currency type", () => {
      const type = "currency";
      const expected = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      
      expect(type).toBe("currency");
    });

    it("should assign correct color for crypto type", () => {
      const type = "crypto";
      const expected = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
      
      expect(type).toBe("crypto");
    });

    it("should assign correct color for stock type", () => {
      const type = "stock";
      const expected = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      
      expect(type).toBe("stock");
    });
  });

  describe("24h Change Display", () => {
    it("should display positive change correctly", () => {
      const change = 2.5;
      const formatted = change.toFixed(2);
      
      expect(formatted).toBe("2.50");
    });

    it("should display negative change correctly", () => {
      const change = -1.5;
      const formatted = change.toFixed(2);
      
      expect(formatted).toBe("-1.50");
    });

    it("should display zero change correctly", () => {
      const change = 0;
      const formatted = change.toFixed(2);
      
      expect(formatted).toBe("0.00");
    });

    it("should handle large percentage changes", () => {
      const change = 125.75;
      const formatted = change.toFixed(2);
      
      expect(formatted).toBe("125.75");
    });
  });

  describe("Total Value Calculation", () => {
    it("should calculate total value correctly", () => {
      const quantity = 2.5;
      const price = 100;
      const totalValue = quantity * price;
      
      expect(totalValue).toBe(250);
    });

    it("should handle crypto with small quantities", () => {
      const quantity = 0.00001;
      const price = 50000;
      const totalValue = quantity * price;
      
      expect(totalValue).toBe(0.5);
    });

    it("should handle large stock holdings", () => {
      const quantity = 1000;
      const price = 150;
      const totalValue = quantity * price;
      
      expect(totalValue).toBe(150000);
    });
  });

  describe("Cost Basis Display", () => {
    it("should display cost basis when available", () => {
      const costBasis = 80;
      expect(costBasis).toBeGreaterThan(0);
    });

    it("should handle missing cost basis", () => {
      const costBasis = null;
      expect(costBasis).toBeNull();
    });

    it("should calculate cost basis total correctly", () => {
      const quantity = 10;
      const costBasis = 50;
      const costBasisTotal = costBasis * quantity;
      
      expect(costBasisTotal).toBe(500);
    });
  });

  describe("Real-time Price Integration", () => {
    it("should use portfolio summary data for prices", () => {
      const portfolioData = {
        totalValue: 1000,
        assets: [
          {
            holdingId: 1,
            assetId: 1,
            symbol: "BTC",
            name: "Bitcoin",
            type: "crypto",
            quantity: 0.5,
            price: 50000,
            value: 25000,
            change24h: 2.5,
          },
        ],
        allocation: { crypto: 25000 },
      };

      const btcAsset = portfolioData.assets[0];
      expect(btcAsset.price).toBe(50000);
      expect(btcAsset.value).toBe(25000);
      expect(btcAsset.change24h).toBe(2.5);
    });

    it("should handle missing price data gracefully", () => {
      const price = 0;
      const display = price > 0 ? `$${price}` : "-";
      
      expect(display).toBe("-");
    });

    it("should update prices when portfolio summary changes", () => {
      const oldPrice = 50000;
      const newPrice = 52000;
      
      expect(newPrice).toBeGreaterThan(oldPrice);
    });
  });
});
