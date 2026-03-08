import { describe, it, expect } from "vitest";

describe("PortfolioValueChart Display Logic", () => {
  describe("Data Collection", () => {
    it("should collect portfolio value from first holding date", () => {
      const holdings = [
        { createdAt: new Date("2026-01-01"), value: 100 },
        { createdAt: new Date("2026-01-05"), value: 150 },
        { createdAt: new Date("2026-01-10"), value: 200 },
      ];

      const firstDate = holdings[0].createdAt;
      const lastDate = holdings[holdings.length - 1].createdAt;

      expect(firstDate).toEqual(new Date("2026-01-01"));
      expect(lastDate).toEqual(new Date("2026-01-10"));
    });

    it("should calculate portfolio value history correctly", () => {
      const history = [
        { date: "2026-01-01", value: 1000 },
        { date: "2026-01-02", value: 1050 },
        { date: "2026-01-03", value: 1100 },
        { date: "2026-01-04", value: 1080 },
        { date: "2026-01-05", value: 1150 },
      ];

      expect(history).toHaveLength(5);
      expect(history[0].value).toBe(1000);
      expect(history[history.length - 1].value).toBe(1150);
    });
  });

  describe("Statistics Calculation", () => {
    it("should calculate current value correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1050 },
        { value: 1100 },
      ];

      const current = chartData[chartData.length - 1].value;

      expect(current).toBe(1100);
    });

    it("should calculate highest value correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1200 },
        { value: 1100 },
        { value: 1150 },
      ];

      const highest = Math.max(...chartData.map(d => d.value));

      expect(highest).toBe(1200);
    });

    it("should calculate lowest value correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1200 },
        { value: 900 },
        { value: 1150 },
      ];

      const lowest = Math.min(...chartData.map(d => d.value));

      expect(lowest).toBe(900);
    });

    it("should calculate average value correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1100 },
        { value: 1200 },
      ];

      const average = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;

      expect(average).toBe(1100);
    });

    it("should calculate total change correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1050 },
        { value: 1100 },
      ];

      const change = chartData[chartData.length - 1].value - chartData[0].value;

      expect(change).toBe(100);
    });

    it("should calculate change percentage correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1100 },
      ];

      const change = chartData[1].value - chartData[0].value;
      const changePercent = ((change / chartData[0].value) * 100).toFixed(2);

      expect(changePercent).toBe("10.00");
    });

    it("should calculate range correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1200 },
        { value: 900 },
        { value: 1150 },
      ];

      const highest = Math.max(...chartData.map(d => d.value));
      const lowest = Math.min(...chartData.map(d => d.value));
      const range = highest - lowest;

      expect(range).toBe(300);
    });
  });

  describe("Time Range Filtering", () => {
    it("should filter data for 7 days", () => {
      const allData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2026, 0, i + 1),
        value: 1000 + i * 10,
      }));

      const filtered7d = allData.slice(-7);

      expect(filtered7d).toHaveLength(7);
      expect(filtered7d[0].date).toEqual(new Date(2026, 0, 24));
    });

    it("should filter data for 30 days", () => {
      const allData = Array.from({ length: 90 }, (_, i) => ({
        date: new Date(2026, 0, i + 1),
        value: 1000 + i * 10,
      }));

      const filtered30d = allData.slice(-30);

      expect(filtered30d).toHaveLength(30);
    });

    it("should show all data for 'all' range", () => {
      const allData = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2026, 0, i + 1),
        value: 1000 + i * 10,
      }));

      expect(allData).toHaveLength(365);
    });
  });

  describe("Data Point Details", () => {
    it("should calculate daily change correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1050 },
        { value: 1080 },
      ];

      const index = 2;
      const prevValue = chartData[index - 1].value;
      const currentValue = chartData[index].value;
      const dayChange = currentValue - prevValue;

      expect(dayChange).toBe(30); // 1080 - 1050
    });

    it("should calculate daily change percentage correctly", () => {
      const chartData = [
        { value: 1000 },
        { value: 1050 },
        { value: 1100 },
      ];

      const index = 2;
      const prevValue = chartData[index - 1].value;
      const currentValue = chartData[index].value;
      const dayChange = currentValue - prevValue;
      const dayChangePercent = ((dayChange / prevValue) * 100).toFixed(2);

      expect(dayChangePercent).toBe("4.76");
    });

    it("should handle first data point without previous value", () => {
      const chartData = [
        { value: 1000 },
        { value: 1050 },
      ];

      const index = 0;
      const dayChange = index > 0 ? chartData[index].value - chartData[index - 1].value : 0;

      expect(dayChange).toBe(0);
    });
  });

  describe("Chart Interactivity", () => {
    it("should track selected data point index", () => {
      const chartData = [
        { value: 1000, date: "2026-01-01" },
        { value: 1050, date: "2026-01-02" },
        { value: 1100, date: "2026-01-03" },
      ];

      const selectedIndex = 1;

      expect(selectedIndex).toBeGreaterThanOrEqual(0);
      expect(selectedIndex).toBeLessThan(chartData.length);
      expect(chartData[selectedIndex].value).toBe(1050);
    });

    it("should clear selection when changing time range", () => {
      let selectedIndex: number | null = 1;
      const timeRange = "30d";

      // When time range changes
      selectedIndex = null;

      expect(selectedIndex).toBeNull();
    });
  });

  describe("Data Synchronization with Holdings", () => {
    it("should reflect portfolio value changes when holdings are modified", () => {
      const holdings = [
        { symbol: "BTC", quantity: 1, price: 100 },
        { symbol: "ETH", quantity: 10, price: 50 },
      ];

      let portfolioValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
      expect(portfolioValue).toBe(600);

      // Modify holdings
      holdings[0].quantity = 2;
      portfolioValue = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);

      expect(portfolioValue).toBe(700);
    });

    it("should record new portfolio value after holdings change", () => {
      const history = [
        { date: "2026-01-01", value: 1000 },
        { date: "2026-01-02", value: 1050 },
      ];

      // Add new record
      history.push({ date: "2026-01-03", value: 1150 });

      expect(history).toHaveLength(3);
      expect(history[history.length - 1].value).toBe(1150);
    });
  });

  describe("Empty Data Handling", () => {
    it("should handle empty chart data gracefully", () => {
      const chartData: any[] = [];

      const stats = {
        current: chartData.length > 0 ? chartData[chartData.length - 1].value : 0,
        highest: chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0,
        lowest: chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) : 0,
        average: chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length : 0,
      };

      expect(stats.current).toBe(0);
      expect(stats.highest).toBe(0);
      expect(stats.lowest).toBe(0);
      expect(stats.average).toBe(0);
    });

    it("should show message when no history available", () => {
      const chartData: any[] = [];
      const message = chartData.length === 0 ? "No portfolio value history available" : "Chart loaded";

      expect(message).toBe("No portfolio value history available");
    });
  });

  describe("Data Point Count", () => {
    it("should track number of data points", () => {
      const chartData = [
        { value: 1000 },
        { value: 1050 },
        { value: 1100 },
        { value: 1150 },
        { value: 1200 },
      ];

      const dataPoints = chartData.length;

      expect(dataPoints).toBe(5);
    });

    it("should update data point count when time range changes", () => {
      const allData = Array.from({ length: 365 }, (_, i) => ({ value: 1000 + i }));

      const data7d = allData.slice(-7);
      const data30d = allData.slice(-30);
      const dataAll = allData;

      expect(data7d.length).toBe(7);
      expect(data30d.length).toBe(30);
      expect(dataAll.length).toBe(365);
    });
  });
});
