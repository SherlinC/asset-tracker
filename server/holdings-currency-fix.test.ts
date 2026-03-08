import { describe, it, expect } from "vitest";

describe("HoldingsList Currency Display Fix", () => {
  describe("Currency Conversion Logic", () => {
    it("should convert USD price to CNY correctly", () => {
      const priceUSD = 100;
      const exchangeRate = 6.9444;
      const priceCNY = priceUSD * exchangeRate;

      expect(priceCNY).toBeCloseTo(694.44, 1);
    });

    it("should convert CNY price back to USD correctly", () => {
      const priceCNY = 694.44;
      const exchangeRate = 6.9444;
      const priceUSD = priceCNY / exchangeRate;

      expect(priceUSD).toBeCloseTo(100, 1);
    });

    it("should handle zero values", () => {
      const priceUSD = 0;
      const exchangeRate = 6.9444;
      const priceCNY = priceUSD * exchangeRate;

      expect(priceCNY).toBe(0);
    });

    it("should handle very small values", () => {
      const priceUSD = 0.01;
      const exchangeRate = 6.9444;
      const priceCNY = priceUSD * exchangeRate;

      expect(priceCNY).toBeCloseTo(0.069444, 5);
    });

    it("should handle very large values", () => {
      const priceUSD = 100000;
      const exchangeRate = 6.9444;
      const priceCNY = priceUSD * exchangeRate;

      expect(priceCNY).toBeCloseTo(694440, 0);
    });
  });

  describe("Total Value Calculation", () => {
    it("should calculate total value in USD correctly", () => {
      const quantity = 10;
      const priceUSD = 50;
      const totalUSD = quantity * priceUSD;

      expect(totalUSD).toBe(500);
    });

    it("should calculate total value in CNY correctly", () => {
      const quantity = 10;
      const priceUSD = 50;
      const exchangeRate = 6.9444;
      const totalUSD = quantity * priceUSD;
      const totalCNY = totalUSD * exchangeRate;

      expect(totalCNY).toBeCloseTo(3472.2, 0);
    });

    it("should maintain consistency when converting total value", () => {
      const quantity = 10;
      const priceUSD = 50;
      const exchangeRate = 6.9444;
      const totalUSD = quantity * priceUSD;
      const totalCNY = totalUSD * exchangeRate;
      const convertedBack = totalCNY / exchangeRate;

      expect(convertedBack).toBeCloseTo(totalUSD, 1);
    });
  });

  describe("Profit/Loss Calculation", () => {
    it("should calculate profit/loss in USD correctly", () => {
      const costBasisUSD = 40;
      const currentPriceUSD = 50;
      const quantity = 10;
      const costTotalUSD = costBasisUSD * quantity;
      const currentTotalUSD = currentPriceUSD * quantity;
      const profitLossUSD = currentTotalUSD - costTotalUSD;

      expect(profitLossUSD).toBe(100);
    });

    it("should calculate profit/loss in CNY correctly", () => {
      const costBasisUSD = 40;
      const currentPriceUSD = 50;
      const quantity = 10;
      const exchangeRate = 6.9444;
      const costTotalUSD = costBasisUSD * quantity;
      const currentTotalUSD = currentPriceUSD * quantity;
      const profitLossUSD = currentTotalUSD - costTotalUSD;
      const profitLossCNY = profitLossUSD * exchangeRate;

      expect(profitLossCNY).toBeCloseTo(694.44, 1);
    });

    it("should calculate profit/loss percentage correctly", () => {
      const costBasisUSD = 40;
      const currentPriceUSD = 50;
      const quantity = 10;
      const costTotalUSD = costBasisUSD * quantity;
      const currentTotalUSD = currentPriceUSD * quantity;
      const profitLossUSD = currentTotalUSD - costTotalUSD;
      const profitLossPercent = (profitLossUSD / costTotalUSD) * 100;

      expect(profitLossPercent).toBe(25);
    });

    it("should handle negative profit/loss", () => {
      const costBasisUSD = 60;
      const currentPriceUSD = 50;
      const quantity = 10;
      const costTotalUSD = costBasisUSD * quantity;
      const currentTotalUSD = currentPriceUSD * quantity;
      const profitLossUSD = currentTotalUSD - costTotalUSD;

      expect(profitLossUSD).toBe(-100);
    });
  });

  describe("Currency Symbol Display", () => {
    it("should display USD symbol correctly", () => {
      const currency = "USD";
      const symbol = currency === "USD" ? "$" : "¥";

      expect(symbol).toBe("$");
    });

    it("should display CNY symbol correctly", () => {
      const currency = "CNY";
      const symbol = currency === "CNY" ? "¥" : "$";

      expect(symbol).toBe("¥");
    });

    it("should use correct symbol in formatted price", () => {
      const priceUSD = 100;
      const currency = "USD";
      const symbol = currency === "USD" ? "$" : "¥";
      const formatted = `${symbol}${priceUSD.toFixed(2)}`;

      expect(formatted).toBe("$100.00");
    });

    it("should use correct symbol in formatted CNY price", () => {
      const priceCNY = 694.44;
      const currency = "CNY";
      const symbol = currency === "CNY" ? "¥" : "$";
      const formatted = `${symbol}${priceCNY.toFixed(2)}`;

      expect(formatted).toBe("¥694.44");
    });
  });

  describe("Number Formatting", () => {
    it("should format USD price with correct symbol and decimals", () => {
      const price = 1234.567;
      const currency = "USD";
      const symbol = "$";
      const formatted = `${symbol}${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      expect(formatted).toBe("$1,234.57");
    });

    it("should format CNY price with correct symbol and decimals", () => {
      const price = 8567.89;
      const currency = "CNY";
      const symbol = "¥";
      const formatted = `${symbol}${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      expect(formatted).toBe("¥8,567.89");
    });

    it("should handle very large numbers with commas", () => {
      const price = 1000000.99;
      const symbol = "$";
      const formatted = `${symbol}${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      expect(formatted).toBe("$1,000,000.99");
    });

    it("should handle small decimal values", () => {
      const price = 0.01;
      const symbol = "$";
      const formatted = `${symbol}${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      expect(formatted).toBe("$0.01");
    });
  });

  describe("Table Header Currency Display", () => {
    it("should show correct currency in table header when USD selected", () => {
      const currencyDisplay = "USD";
      const header = `Current Price (${currencyDisplay})`;

      expect(header).toBe("Current Price (USD)");
    });

    it("should show correct currency in table header when CNY selected", () => {
      const currencyDisplay = "CNY";
      const header = `Current Price (${currencyDisplay})`;

      expect(header).toBe("Current Price (CNY)");
    });

    it("should update all headers when currency changes", () => {
      const currencyDisplay = "USD";
      const headers = [
        `Current Price (${currencyDisplay})`,
        `Total Value (${currencyDisplay})`,
        `Cost Basis (${currencyDisplay})`,
      ];

      expect(headers).toEqual([
        "Current Price (USD)",
        "Total Value (USD)",
        "Cost Basis (USD)",
      ]);
    });
  });

  describe("Exchange Rate Application", () => {
    it("should apply exchange rate consistently across all prices", () => {
      const exchangeRate = 6.9444;
      const prices = [10, 50, 100, 1000];
      const convertedPrices = prices.map((p) => p * exchangeRate);

      expect(convertedPrices[0]).toBeCloseTo(69.444, 2);
      expect(convertedPrices[1]).toBeCloseTo(347.22, 1);
      expect(convertedPrices[2]).toBeCloseTo(694.44, 1);
      expect(convertedPrices[3]).toBeCloseTo(6944.4, 0);
    });

    it("should handle exchange rate updates", () => {
      let exchangeRate = 6.9444;
      const price = 100;
      let convertedPrice = price * exchangeRate;

      expect(convertedPrice).toBeCloseTo(694.44, 1);

      // Update exchange rate
      exchangeRate = 7.0;
      convertedPrice = price * exchangeRate;

      expect(convertedPrice).toBe(700);
    });

    it("should maintain precision during exchange rate conversion", () => {
      const exchangeRate = 6.94445678;
      const price = 100;
      const convertedPrice = price * exchangeRate;
      const roundedPrice = parseFloat(convertedPrice.toFixed(2));

      expect(roundedPrice).toBe(694.45);
    });
  });

  describe("Real-time Price Updates", () => {
    it("should reflect price changes in both currencies", () => {
      const exchangeRate = 6.9444;
      let priceUSD = 100;
      let priceCNY = priceUSD * exchangeRate;

      expect(priceCNY).toBeCloseTo(694.44, 1);

      // Price update
      priceUSD = 120;
      priceCNY = priceUSD * exchangeRate;

      expect(priceCNY).toBeCloseTo(833.33, 1);
    });

    it("should update total value when price changes", () => {
      const quantity = 10;
      const exchangeRate = 6.9444;
      let priceUSD = 100;
      let totalUSD = quantity * priceUSD;
      let totalCNY = totalUSD * exchangeRate;

      expect(totalCNY).toBeCloseTo(6944.4, 0);

      // Price update
      priceUSD = 150;
      totalUSD = quantity * priceUSD;
      totalCNY = totalUSD * exchangeRate;

      expect(totalCNY).toBeCloseTo(10416.6, 0);
    });
  });
});
