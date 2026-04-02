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

  it("falls back to EastMoney kline data when ETF quote endpoint fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://fundgz.1234567.com.cn/js/513630.js")) {
        return {
          ok: true,
          text: async () => "jsonpgz();",
        };
      }

      if (url.startsWith("https://push2.eastmoney.com/api/qt/stock/get")) {
        throw new Error("socket hang up");
      }

      if (
        url.startsWith(
          "https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.513630"
        )
      ) {
        return {
          ok: true,
          json: async () => ({
            data: {
              klines: ["2026-03-20,1.700,1.690", "2026-03-23,1.688,1.677"],
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
    expect(result.change24h).toBeCloseTo(((1.677 - 1.69) / 1.69) * 100, 6);
  });

  it("uses Onvista KVG pricing first for ISIN-based international funds", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://www.onvista.de/suche?searchValue=LU0633140727") {
        return {
          ok: true,
          text: async () => `
            <html><body>
              <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
                {
                  props: {
                    pageProps: {
                      quoteList: {
                        list: [
                          {
                            market: { name: "KVG" },
                            isoCurrency: "USD",
                            last: 13.04,
                            previousLast: 13.38,
                            performancePct: -2.5411,
                            datetimeLast: "2026-03-20T07:00:00.000+00:00",
                          },
                        ],
                      },
                    },
                  },
                }
              )}</script>
            </body></html>
          `,
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

    const result = await fetchAssetPrice("LU0633140727.EUFUND", "fund");

    expect(result.priceUSD).toBeCloseTo(13.04, 2);
    expect(result.priceCNY).toBeCloseTo(13.04 * 7.2, 3);
    expect(result.change24h).toBeCloseTo(-2.5411, 4);
  });

  it("uses JPM official product-data when Onvista has no price", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://www.onvista.de/suche?searchValue=LU1128926489") {
        return {
          ok: true,
          text: async () =>
            '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script></body></html>',
        };
      }

      if (
        url ===
        "https://am.jpmorgan.com/FundsMarketingHandler/product-data?cusip=LU1128926489&country=lu&role=adv&language=en"
      ) {
        return {
          ok: true,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type"
                ? "application/json;charset=UTF-8"
                : null,
          },
          json: async () => ({
            fundData: {
              currencyCode: "USD",
              shareClass: {
                currencyCode: "USD",
                nav: {
                  price: 7.65,
                  navEffectiveDate: "2026-03-23",
                  changePercentage: -0.13,
                  currencyCode: "USD",
                },
              },
            },
          }),
        };
      }

      if (
        url ===
        "https://jp.techrules.com/rebrandingPDF/LoadPdf.aspx?ShareClassId=11957&country=LU&lang=EN&paramMIFID=YES"
      ) {
        return {
          ok: true,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "text/plain" : null,
          },
          text: async () =>
            "MARKETING COMMUNICATION | Factsheet | 28 February 2026 NAV USD 7.76",
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

    const result = await fetchAssetPrice("LU1128926489.EUFUND", "fund");

    expect(result.priceUSD).toBeCloseTo(7.65, 2);
    expect(result.priceCNY).toBeCloseTo(7.65 * 7.2, 3);
    expect(result.change24h).toBeCloseTo(-0.13, 4);
  });

  it("falls back to JPM official factsheet when product-data is unavailable", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "https://www.onvista.de/suche?searchValue=LU1128926489") {
        return {
          ok: true,
          text: async () =>
            '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script></body></html>',
        };
      }

      if (
        url ===
        "https://am.jpmorgan.com/FundsMarketingHandler/product-data?cusip=LU1128926489&country=lu&role=adv&language=en"
      ) {
        return {
          ok: true,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "text/html" : null,
          },
          text: async () => "not json",
        };
      }

      if (
        url ===
        "https://jp.techrules.com/rebrandingPDF/LoadPdf.aspx?ShareClassId=11957&country=LU&lang=EN&paramMIFID=YES"
      ) {
        return {
          ok: true,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "text/plain" : null,
          },
          text: async () =>
            "MARKETING COMMUNICATION | Factsheet | 28 February 2026 NAV USD 7.76",
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

    const result = await fetchAssetPrice("LU1128926489.EUFUND", "fund");

    expect(result.priceUSD).toBeCloseTo(7.76, 2);
    expect(result.priceCNY).toBeCloseTo(7.76 * 7.2, 3);
    expect(result.change24h).toBe(0);
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

      if (url === "https://www.onvista.de/suche?searchValue=LU0633140727") {
        return {
          ok: true,
          text: async () =>
            '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script></body></html>',
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

  it("falls back to Yahoo chart pricing for Yahoo mutual fund symbols", async () => {
    const originalApiKey = process.env.EODHD_API_KEY;
    process.env.EODHD_API_KEY = "test-key";

    vi.resetModules();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://eodhd.com/api/search/0P00016JWY")) {
        return {
          ok: false,
          json: async () => ({}),
          text: async () => "limit exceeded",
        };
      }

      if (url === "https://www.onvista.de/suche?searchValue=0P00016JWY") {
        return {
          ok: true,
          text: async () =>
            '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script></body></html>',
        };
      }

      if (
        url.startsWith(
          "https://query1.finance.yahoo.com/v8/finance/chart/0P00016JWY.HK"
        ) ||
        url.startsWith(
          "https://query2.finance.yahoo.com/v8/finance/chart/0P00016JWY.HK"
        )
      ) {
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 6.136,
                    chartPreviousClose: 6.152,
                    currency: "HKD",
                  },
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

      if (
        url.startsWith(
          "https://global.morningstar.com/api/v1/en-gb/tools/screener/_data"
        )
      ) {
        return {
          ok: true,
          json: async () => ({ results: [] }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchAssetPrice: fetchInternationalAssetPrice } = await import(
      "./priceService"
    );
    const result = await fetchInternationalAssetPrice("0P00016JWY.HK", "fund");

    const expectedUsd = (6.136 * 0.92) / 7.2;
    expect(result.priceUSD).toBeCloseTo(expectedUsd, 4);
    expect(result.priceCNY).toBeCloseTo(6.136 * 0.92, 4);
    expect(result.change24h).toBeCloseTo(((6.136 - 6.152) / 6.152) * 100, 4);

    if (originalApiKey === undefined) {
      delete process.env.EODHD_API_KEY;
    } else {
      process.env.EODHD_API_KEY = originalApiKey;
    }
  });
});
