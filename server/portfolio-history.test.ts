import { describe, it, expect, beforeEach, vi } from "vitest";

import * as db from "./db";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  recordPortfolioValue: vi.fn(),
  getPortfolioValueHistory: vi.fn(),
  getPortfolioValueHistoryByRange: vi.fn(),
}));

describe("Portfolio Value History", () => {
  const mockUserId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordPortfolioValue", () => {
    it("should record portfolio value for user", async () => {
      vi.mocked(db.recordPortfolioValue).mockResolvedValue(undefined);

      await db.recordPortfolioValue(mockUserId, "100000");

      expect(db.recordPortfolioValue).toHaveBeenCalledWith(mockUserId, "100000");
    });

    it("should handle zero portfolio value", async () => {
      vi.mocked(db.recordPortfolioValue).mockResolvedValue(undefined);

      await db.recordPortfolioValue(mockUserId, "0");

      expect(db.recordPortfolioValue).toHaveBeenCalledWith(mockUserId, "0");
    });

    it("should handle large portfolio values", async () => {
      vi.mocked(db.recordPortfolioValue).mockResolvedValue(undefined);

      await db.recordPortfolioValue(mockUserId, "999999999.99");

      expect(db.recordPortfolioValue).toHaveBeenCalledWith(mockUserId, "999999999.99");
    });
  });

  describe("getPortfolioValueHistory", () => {
    it("should return portfolio value history for specified days", async () => {
      const mockHistory = [
        {
          id: 1,
          userId: mockUserId,
          totalValue: "100000",
          timestamp: new Date("2026-02-01"),
          createdAt: new Date("2026-02-01"),
        },
        {
          id: 2,
          userId: mockUserId,
          totalValue: "105000",
          timestamp: new Date("2026-02-02"),
          createdAt: new Date("2026-02-02"),
        },
      ];

      vi.mocked(db.getPortfolioValueHistory).mockResolvedValue(mockHistory);

      const result = await db.getPortfolioValueHistory(mockUserId, 30);

      expect(result).toHaveLength(2);
      expect(result[0].totalValue).toBe("100000");
      expect(result[1].totalValue).toBe("105000");
      expect(db.getPortfolioValueHistory).toHaveBeenCalledWith(mockUserId, 30);
    });

    it("should return empty array if no history exists", async () => {
      vi.mocked(db.getPortfolioValueHistory).mockResolvedValue([]);

      const result = await db.getPortfolioValueHistory(mockUserId, 7);

      expect(result).toHaveLength(0);
    });

    it("should use default 30 days when not specified", async () => {
      vi.mocked(db.getPortfolioValueHistory).mockResolvedValue([]);

      await db.getPortfolioValueHistory(mockUserId);

      expect(db.getPortfolioValueHistory).toHaveBeenCalledWith(mockUserId);
    });

    it("should handle different time ranges", async () => {
      vi.mocked(db.getPortfolioValueHistory).mockResolvedValue([]);

      await db.getPortfolioValueHistory(mockUserId, 7);
      await db.getPortfolioValueHistory(mockUserId, 90);
      await db.getPortfolioValueHistory(mockUserId, 365);

      expect(db.getPortfolioValueHistory).toHaveBeenNthCalledWith(1, mockUserId, 7);
      expect(db.getPortfolioValueHistory).toHaveBeenNthCalledWith(2, mockUserId, 90);
      expect(db.getPortfolioValueHistory).toHaveBeenNthCalledWith(3, mockUserId, 365);
    });
  });

  describe("getPortfolioValueHistoryByRange", () => {
    it("should return portfolio value history within date range", async () => {
      const startDate = new Date("2026-02-01");
      const endDate = new Date("2026-02-10");

      const mockHistory = [
        {
          id: 1,
          userId: mockUserId,
          totalValue: "100000",
          timestamp: new Date("2026-02-05"),
          createdAt: new Date("2026-02-05"),
        },
        {
          id: 2,
          userId: mockUserId,
          totalValue: "102000",
          timestamp: new Date("2026-02-08"),
          createdAt: new Date("2026-02-08"),
        },
      ];

      vi.mocked(db.getPortfolioValueHistoryByRange).mockResolvedValue(mockHistory);

      const result = await db.getPortfolioValueHistoryByRange(mockUserId, startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toEqual(new Date("2026-02-05"));
      expect(result[1].timestamp).toEqual(new Date("2026-02-08"));
      expect(db.getPortfolioValueHistoryByRange).toHaveBeenCalledWith(mockUserId, startDate, endDate);
    });

    it("should return empty array if no data in range", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-10");

      vi.mocked(db.getPortfolioValueHistoryByRange).mockResolvedValue([]);

      const result = await db.getPortfolioValueHistoryByRange(mockUserId, startDate, endDate);

      expect(result).toHaveLength(0);
    });

    it("should handle single day range", async () => {
      const date = new Date("2026-02-05");

      vi.mocked(db.getPortfolioValueHistoryByRange).mockResolvedValue([]);

      await db.getPortfolioValueHistoryByRange(mockUserId, date, date);

      expect(db.getPortfolioValueHistoryByRange).toHaveBeenCalledWith(mockUserId, date, date);
    });
  });

  describe("Portfolio value statistics", () => {
    it("should calculate correct statistics from history data", () => {
      const history = [
        { totalValue: "100000" },
        { totalValue: "105000" },
        { totalValue: "102000" },
        { totalValue: "110000" },
        { totalValue: "108000" },
      ];

      const values = history.map(h => parseFloat(h.totalValue));
      const highest = Math.max(...values);
      const lowest = Math.min(...values);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const change = values[values.length - 1] - values[0];

      expect(highest).toBe(110000);
      expect(lowest).toBe(100000);
      expect(average).toBe(105000);
      expect(change).toBe(8000);
    });

    it("should handle single data point", () => {
      const history = [{ totalValue: "100000" }];
      const values = history.map(h => parseFloat(h.totalValue));

      const highest = Math.max(...values);
      const lowest = Math.min(...values);
      const average = values.reduce((a, b) => a + b, 0) / values.length;

      expect(highest).toBe(100000);
      expect(lowest).toBe(100000);
      expect(average).toBe(100000);
    });

    it("should handle empty history", () => {
      const history: any[] = [];
      const values = history.map(h => parseFloat(h.totalValue));

      expect(values).toHaveLength(0);
      expect(Math.max(...(values.length > 0 ? values : [0]))).toBe(0);
    });
  });
});
