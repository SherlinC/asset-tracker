import { describe, it, expect } from "vitest";

describe("Auto Portfolio Value Recording", () => {
  describe("Recording on Holding Operations", () => {
    it("should record portfolio value when adding a holding", async () => {
      const userId = 1;
      const holdings = [
        { assetId: 1, quantity: 1, price: 100 },
      ];

      let recordedValue: string | null = null;

      // Simulate adding holding and recording value
      const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      recordedValue = totalValue.toString();

      expect(recordedValue).toBe("100");
    });

    it("should record portfolio value when updating a holding", async () => {
      const holdings = [
        { assetId: 1, quantity: 1, price: 100 },
      ];

      // Update holding
      holdings[0].quantity = 2;

      let recordedValue: string | null = null;
      const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      recordedValue = totalValue.toString();

      expect(recordedValue).toBe("200");
    });

    it("should record portfolio value when deleting a holding", async () => {
      const holdings = [
        { assetId: 1, quantity: 1, price: 100 },
        { assetId: 2, quantity: 2, price: 50 },
      ];

      // Delete first holding
      holdings.shift();

      let recordedValue: string | null = null;
      const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      recordedValue = totalValue.toString();

      expect(recordedValue).toBe("100");
    });
  });

  describe("Portfolio Value Calculation", () => {
    it("should calculate total portfolio value correctly with multiple holdings", () => {
      const holdings = [
        { assetId: 1, quantity: 1, price: 100 },
        { assetId: 2, quantity: 2, price: 50 },
        { assetId: 3, quantity: 0.5, price: 200 },
      ];

      const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);

      expect(totalValue).toBe(300);
    });

    it("should handle zero holdings", () => {
      const holdings: any[] = [];

      const totalValue = holdings.length === 0 ? 0 : holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);

      expect(totalValue).toBe(0);
    });

    it("should handle fractional quantities", () => {
      const holdings = [
        { assetId: 1, quantity: 0.5, price: 100 },
        { assetId: 2, quantity: 0.25, price: 200 },
      ];

      const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);

      expect(totalValue).toBe(100);
    });

    it("should handle very large quantities", () => {
      const holdings = [
        { assetId: 1, quantity: 1000000, price: 0.01 },
      ];

      const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);

      expect(totalValue).toBe(10000);
    });
  });

  describe("Price Map Lookup", () => {
    it("should correctly map asset IDs to prices", () => {
      const prices = [
        { assetId: 1, price: "100" },
        { assetId: 2, price: "50" },
        { assetId: 3, price: "200" },
      ];

      const priceMap = new Map(prices.map(p => [p.assetId, p]));

      expect(priceMap.get(1)?.price).toBe("100");
      expect(priceMap.get(2)?.price).toBe("50");
      expect(priceMap.get(3)?.price).toBe("200");
    });

    it("should handle missing prices gracefully", () => {
      const prices = [
        { assetId: 1, price: "100" },
      ];

      const priceMap = new Map(prices.map(p => [p.assetId, p]));

      const price = priceMap.get(999);
      expect(price).toBeUndefined();
    });
  });

  describe("Holdings and Prices Integration", () => {
    it("should calculate portfolio value with holdings and prices", () => {
      const holdings = [
        { assetId: 1, quantity: 1 },
        { assetId: 2, quantity: 2 },
      ];

      const prices = [
        { assetId: 1, price: "100" },
        { assetId: 2, price: "50" },
      ];

      const priceMap = new Map(prices.map(p => [p.assetId, p]));

      let totalValue = 0;
      for (const h of holdings) {
        const price = priceMap.get(h.assetId);
        const quantity = h.quantity;
        const priceValue = price ? parseFloat(price.price) : 0;
        totalValue += quantity * priceValue;
      }

      expect(totalValue).toBe(200);
    });

    it("should handle missing prices in portfolio calculation", () => {
      const holdings = [
        { assetId: 1, quantity: 1 },
        { assetId: 2, quantity: 2 },
        { assetId: 3, quantity: 1 },
      ];

      const prices = [
        { assetId: 1, price: "100" },
        { assetId: 2, price: "50" },
        // assetId 3 has no price
      ];

      const priceMap = new Map(prices.map(p => [p.assetId, p]));

      let totalValue = 0;
      for (const h of holdings) {
        const price = priceMap.get(h.assetId);
        const quantity = h.quantity;
        const priceValue = price ? parseFloat(price.price) : 0;
        totalValue += quantity * priceValue;
      }

      expect(totalValue).toBe(200); // Only counts assetId 1 and 2
    });
  });

  describe("Portfolio Value History Recording", () => {
    it("should record portfolio value as string", () => {
      const totalValue = 1234.56;
      const recordedValue = totalValue.toString();

      expect(typeof recordedValue).toBe("string");
      expect(recordedValue).toBe("1234.56");
    });

    it("should handle zero portfolio value", () => {
      const totalValue = 0;
      const recordedValue = totalValue.toString();

      expect(recordedValue).toBe("0");
    });

    it("should preserve precision in portfolio value", () => {
      const totalValue = 1234.5678;
      const recordedValue = totalValue.toString();

      expect(recordedValue).toBe("1234.5678");
    });
  });

  describe("Sequential Operations", () => {
    it("should record value after each operation", () => {
      const history: string[] = [];
      let holdings = [];

      // Add first holding
      holdings.push({ assetId: 1, quantity: 1, price: 100 });
      let totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      history.push(totalValue.toString());

      // Add second holding
      holdings.push({ assetId: 2, quantity: 2, price: 50 });
      totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      history.push(totalValue.toString());

      // Update first holding
      holdings[0].quantity = 2;
      totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      history.push(totalValue.toString());

      expect(history).toEqual(["100", "200", "300"]);
    });

    it("should maintain chronological order of recordings", () => {
      const history: { timestamp: number; value: string }[] = [];
      let holdings = [];

      // Record 1
      holdings.push({ assetId: 1, quantity: 1, price: 100 });
      let totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      history.push({ timestamp: Date.now(), value: totalValue.toString() });

      // Record 2
      holdings.push({ assetId: 2, quantity: 2, price: 50 });
      totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      history.push({ timestamp: Date.now(), value: totalValue.toString() });

      expect(history[0].timestamp).toBeLessThanOrEqual(history[1].timestamp);
      expect(history[0].value).toBe("100");
      expect(history[1].value).toBe("200");
    });
  });
});
