import { describe, it, expect, beforeEach, vi } from "vitest";

import * as db from "./db";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserAssets: vi.fn(),
  getUserHoldings: vi.fn(),
  addHolding: vi.fn(),
  updateHolding: vi.fn(),
  deleteHolding: vi.fn(),
  getOrCreateAsset: vi.fn(),
  upsertPrice: vi.fn(),
  getPrices: vi.fn(),
  getPriceByAssetId: vi.fn(),
}));

describe("Holdings Management", () => {
  const mockUserId = 1;
  const mockAssetId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addHolding", () => {
    it("should add a new holding with quantity", async () => {
      const mockHolding = {
        id: 1,
        userId: mockUserId,
        assetId: mockAssetId,
        quantity: "10",
        costBasis: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.addHolding).mockResolvedValue(mockHolding);

      const result = await db.addHolding(mockUserId, mockAssetId, "10");

      expect(result).toEqual(mockHolding);
      expect(db.addHolding).toHaveBeenCalledWith(mockUserId, mockAssetId, "10");
    });

    it("should add a holding with cost basis", async () => {
      const mockHolding = {
        id: 1,
        userId: mockUserId,
        assetId: mockAssetId,
        quantity: "5.5",
        costBasis: "45000",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.addHolding).mockResolvedValue(mockHolding);

      const result = await db.addHolding(mockUserId, mockAssetId, "5.5", "45000");

      expect(result.costBasis).toBe("45000");
      expect(db.addHolding).toHaveBeenCalledWith(mockUserId, mockAssetId, "5.5", "45000");
    });
  });

  describe("updateHolding", () => {
    it("should update holding quantity", async () => {
      const mockHolding = {
        id: 1,
        userId: mockUserId,
        assetId: mockAssetId,
        quantity: "20",
        costBasis: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.updateHolding).mockResolvedValue(mockHolding);

      const result = await db.updateHolding(1, "20");

      expect(result.quantity).toBe("20");
      expect(db.updateHolding).toHaveBeenCalledWith(1, "20");
    });

    it("should update holding with cost basis", async () => {
      const mockHolding = {
        id: 1,
        userId: mockUserId,
        assetId: mockAssetId,
        quantity: "15",
        costBasis: "50000",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.updateHolding).mockResolvedValue(mockHolding);

      const result = await db.updateHolding(1, "15", "50000");

      expect(result.quantity).toBe("15");
      expect(result.costBasis).toBe("50000");
    });
  });

  describe("deleteHolding", () => {
    it("should delete a holding", async () => {
      vi.mocked(db.deleteHolding).mockResolvedValue(undefined);

      await db.deleteHolding(1);

      expect(db.deleteHolding).toHaveBeenCalledWith(1);
    });
  });

  describe("getUserHoldings", () => {
    it("should return user holdings with asset details", async () => {
      const mockHoldings = [
        {
          holding: {
            id: 1,
            userId: mockUserId,
            assetId: 1,
            quantity: "10",
            costBasis: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          asset: {
            id: 1,
            userId: mockUserId,
            symbol: "BTC",
            type: "crypto",
            name: "Bitcoin",
            baseCurrency: "CNY",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      vi.mocked(db.getUserHoldings).mockResolvedValue(mockHoldings);

      const result = await db.getUserHoldings(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].asset.symbol).toBe("BTC");
      expect(result[0].holding.quantity).toBe("10");
    });

    it("should return empty array if user has no holdings", async () => {
      vi.mocked(db.getUserHoldings).mockResolvedValue([]);

      const result = await db.getUserHoldings(mockUserId);

      expect(result).toHaveLength(0);
    });
  });
});

describe("Asset Management", () => {
  const mockUserId = 1;

  describe("getOrCreateAsset", () => {
    it("should create a new currency asset", async () => {
      const mockAsset = {
        id: 1,
        userId: mockUserId,
        symbol: "USD",
        type: "currency" as const,
        name: "US Dollar",
        baseCurrency: "CNY",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getOrCreateAsset).mockResolvedValue(mockAsset);

      const result = await db.getOrCreateAsset(mockUserId, "USD", "currency", "US Dollar");

      expect(result.symbol).toBe("USD");
      expect(result.type).toBe("currency");
      expect(result.name).toBe("US Dollar");
    });

    it("should create a new crypto asset", async () => {
      const mockAsset = {
        id: 2,
        userId: mockUserId,
        symbol: "BTC",
        type: "crypto" as const,
        name: "Bitcoin",
        baseCurrency: "CNY",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getOrCreateAsset).mockResolvedValue(mockAsset);

      const result = await db.getOrCreateAsset(mockUserId, "BTC", "crypto", "Bitcoin");

      expect(result.symbol).toBe("BTC");
      expect(result.type).toBe("crypto");
    });

    it("should create a new stock asset", async () => {
      const mockAsset = {
        id: 3,
        userId: mockUserId,
        symbol: "AAPL",
        type: "stock" as const,
        name: "Apple Inc.",
        baseCurrency: "CNY",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getOrCreateAsset).mockResolvedValue(mockAsset);

      const result = await db.getOrCreateAsset(mockUserId, "AAPL", "stock", "Apple Inc.");

      expect(result.symbol).toBe("AAPL");
      expect(result.type).toBe("stock");
    });
  });

  describe("getUserAssets", () => {
    it("should return all user assets", async () => {
      const mockAssets = [
        {
          id: 1,
          userId: mockUserId,
          symbol: "USD",
          type: "currency",
          name: "US Dollar",
          baseCurrency: "CNY",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: mockUserId,
          symbol: "BTC",
          type: "crypto",
          name: "Bitcoin",
          baseCurrency: "CNY",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getUserAssets).mockResolvedValue(mockAssets);

      const result = await db.getUserAssets(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe("USD");
      expect(result[1].symbol).toBe("BTC");
    });
  });
});

describe("Price Management", () => {
  describe("upsertPrice", () => {
    it("should update price for existing asset", async () => {
      const mockPrice = {
        id: 1,
        assetId: 1,
        price: "88409.99",
        change24h: "0.18",
        marketCap: "1750000000000",
        updatedAt: new Date(),
      };

      vi.mocked(db.upsertPrice).mockResolvedValue(mockPrice);

      const result = await db.upsertPrice(1, "88409.99", "0.18", "1750000000000");

      expect(result.price).toBe("88409.99");
      expect(result.change24h).toBe("0.18");
    });

    it("should insert new price for asset", async () => {
      const mockPrice = {
        id: 2,
        assetId: 2,
        price: "2933.17",
        change24h: "0.22",
        marketCap: "350000000000",
        updatedAt: new Date(),
      };

      vi.mocked(db.upsertPrice).mockResolvedValue(mockPrice);

      const result = await db.upsertPrice(2, "2933.17", "0.22", "350000000000");

      expect(result.assetId).toBe(2);
      expect(result.price).toBe("2933.17");
    });
  });

  describe("getPrices", () => {
    it("should return prices for multiple assets", async () => {
      const mockPrices = [
        {
          id: 1,
          assetId: 1,
          price: "88409.99",
          change24h: "0.18",
          marketCap: "1750000000000",
          updatedAt: new Date(),
        },
        {
          id: 2,
          assetId: 2,
          price: "2933.17",
          change24h: "0.22",
          marketCap: "350000000000",
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getPrices).mockResolvedValue(mockPrices);

      const result = await db.getPrices([1, 2]);

      expect(result).toHaveLength(2);
      expect(result[0].assetId).toBe(1);
      expect(result[1].assetId).toBe(2);
    });

    it("should return empty array for empty asset ids", async () => {
      vi.mocked(db.getPrices).mockResolvedValue([]);

      const result = await db.getPrices([]);

      expect(result).toHaveLength(0);
    });
  });

  describe("getPriceByAssetId", () => {
    it("should return price for specific asset", async () => {
      const mockPrice = {
        id: 1,
        assetId: 1,
        price: "88409.99",
        change24h: "0.18",
        marketCap: "1750000000000",
        updatedAt: new Date(),
      };

      vi.mocked(db.getPriceByAssetId).mockResolvedValue(mockPrice);

      const result = await db.getPriceByAssetId(1);

      expect(result).not.toBeNull();
      expect(result?.price).toBe("88409.99");
    });

    it("should return null if price not found", async () => {
      vi.mocked(db.getPriceByAssetId).mockResolvedValue(null);

      const result = await db.getPriceByAssetId(999);

      expect(result).toBeNull();
    });
  });
});
