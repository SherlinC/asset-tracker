import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAssetPrice } from "./priceService";

describe("fund price fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to EastMoney ETF quote when fundgz returns empty payload", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://fundgz.1234567.com.cn/js/513630.js")) {
        return {
          ok: true,
          text: async () => "jsonpgz();",
        };
      }

      if (url.startsWith("https://push2.eastmoney.com/api/qt/stock/get")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              f43: 1677,
              f170: -176,
            },
          }),
        };
      }

      if (url === "https://api.exchangerate-api.com/v4/latest/CNY") {
        return {
          ok: true,
          json: async () => ({
            rates: {
              USD: 0.1388888889,
              HKD: 1.0869565217,
              EUR: 0.1282051282,
              JPY: 20.8333333333,
            },
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAssetPrice("513630", "fund");

    expect(result.priceCNY).toBeCloseTo(1.677, 3);
    expect(result.priceUSD).toBeCloseTo(1.677 / 7.2, 4);
    expect(result.change24h).toBeCloseTo(-1.76, 2);
  });

  it("falls back to latest NAV for off-exchange funds when estimate is unavailable", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://fundgz.1234567.com.cn/js/005052.js")) {
        return {
          ok: true,
          text: async () => "jsonpgz();",
        };
      }

      if (url.startsWith("https://push2.eastmoney.com/api/qt/stock/get")) {
        return {
          ok: true,
          json: async () => ({ data: {} }),
        };
      }

      if (
        url.startsWith("http://api.fund.eastmoney.com/f10/lsjz?fundCode=005052")
      ) {
        return {
          ok: true,
          json: async () => ({
            Data: {
              LSJZList: [
                {
                  DWJZ: "0.8723",
                  JZZZL: "-0.84",
                },
              ],
            },
          }),
        };
      }

      if (url === "https://api.exchangerate-api.com/v4/latest/CNY") {
        return {
          ok: true,
          json: async () => ({
            rates: {
              USD: 0.1388888889,
              HKD: 1.0869565217,
              EUR: 0.1282051282,
              JPY: 20.8333333333,
            },
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAssetPrice("005052", "fund");

    expect(result.priceCNY).toBeCloseTo(0.8723, 4);
    expect(result.priceUSD).toBeCloseTo(0.8723 / 7.2, 4);
    expect(result.change24h).toBeCloseTo(-0.84, 2);
  });
});
