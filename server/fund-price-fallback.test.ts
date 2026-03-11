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

  it("falls back to Morningstar for international funds when EODHD is unavailable", async () => {
    const originalApiKey = process.env.EODHD_API_KEY;
    process.env.EODHD_API_KEY = "test-key";

    vi.resetModules();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://eodhd.com/api/search/LU0633140727")) {
        return {
          ok: false,
          json: async () => ({}),
          text: async () => "limit exceeded",
        };
      }

      if (
        url.startsWith(
          "https://global.morningstar.com/api/v1/en-gb/tools/screener/_data"
        )
      ) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                meta: {
                  securityID: "F00000PQ4C",
                },
              },
            ],
          }),
        };
      }

      if (
        url.startsWith(
          "https://api-global.morningstar.com/sal-service/v1/fund/quote/v7/F00000PQ4C/data"
        )
      ) {
        return {
          ok: true,
          json: async () => ({
            latestPrice: 13.63,
            trailing1DayReturn: 1.03781,
            currency: "USD",
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

    const { fetchAssetPrice: fetchInternationalAssetPrice } = await import(
      "./priceService"
    );
    const result = await fetchInternationalAssetPrice(
      "LU0633140727.EUFUND",
      "fund"
    );

    expect(result.priceUSD).toBeCloseTo(13.63, 2);
    expect(result.priceCNY).toBeCloseTo(98.136, 3);
    expect(result.change24h).toBeCloseTo(1.03781, 4);

    if (originalApiKey === undefined) {
      delete process.env.EODHD_API_KEY;
    } else {
      process.env.EODHD_API_KEY = originalApiKey;
    }
  });
});
