import { afterEach, describe, expect, it, vi } from "vitest";

const EXCHANGE_RATES = {
  USD: 7.2,
  HKD: 0.92,
  EUR: 7.8,
  JPY: 0.05,
  RUB: 0.08,
  CNY: 1,
};

describe("stock provider routing", () => {
  const originalFinnhubApiKey = process.env.FINNHUB_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();

    if (originalFinnhubApiKey === undefined) {
      delete process.env.FINNHUB_API_KEY;
    } else {
      process.env.FINNHUB_API_KEY = originalFinnhubApiKey;
    }
  });

  async function importPriceService() {
    process.env.FINNHUB_API_KEY = "test-key";
    vi.resetModules();

    return import("./priceService");
  }

  it("routes A-share/BJ symbols to EastMoney, HK symbols to Yahoo, and US stock-like tickers to Finnhub", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);

      if (
        url ===
        "https://push2.eastmoney.com/api/qt/stock/get?secid=1.600519&fields=f43%2Cf57%2Cf58%2Cf169%2Cf170"
      ) {
        return {
          ok: true,
          json: async () => ({
            data: {
              f43: 148800,
              f57: "600519",
              f58: "贵州茅台",
              f169: 1800,
              f170: 122,
            },
          }),
        };
      }

      if (
        url ===
        "https://push2.eastmoney.com/api/qt/stock/get?secid=0.830799&fields=f43%2Cf57%2Cf58%2Cf169%2Cf170"
      ) {
        return {
          ok: true,
          json: async () => ({
            data: {
              f43: 3250,
              f57: "830799",
              f58: "艾融软件",
              f169: 70,
              f170: 220,
            },
          }),
        };
      }

      if (
        url === "https://api.finnhub.io/api/v1/quote?symbol=AAPL&token=test-key"
      ) {
        return {
          ok: true,
          json: async () => ({ c: 210, d: 5, dp: 2.44 }),
        };
      }

      if (
        url === "https://api.finnhub.io/api/v1/quote?symbol=VOO&token=test-key"
      ) {
        return {
          ok: true,
          json: async () => ({ c: 520, d: 3, dp: 0.58 }),
        };
      }

      if (
        url ===
        "https://query1.finance.yahoo.com/v8/finance/chart/0700.HK?interval=1d&range=5d"
      ) {
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 400,
                    chartPreviousClose: 390,
                    currency: "HKD",
                  },
                },
              ],
            },
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchStockPrices } = await importPriceService();
    const quotes = await fetchStockPrices([
      "AAPL",
      "600519.SS",
      "830799.BJ",
      "0700.HK",
      "VOO",
    ]);

    expect(quotes.AAPL?.price).toBe(210);
    expect(quotes.VOO?.price).toBe(520);
    expect(quotes["600519.SS"]?.price).toBe(1488);
    expect(quotes["600519.SS"]?.currency).toBe("CNY");
    expect(quotes["830799.BJ"]?.price).toBe(32.5);
    expect(quotes["830799.BJ"]?.currency).toBe("CNY");
    expect(quotes["0700.HK"]?.currency).toBe("HKD");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    const finnhubCalls = urls.filter(url => url.includes("api.finnhub.io"));
    const eastMoneyCalls = urls.filter(url =>
      url.includes("push2.eastmoney.com")
    );

    expect(finnhubCalls).toEqual([
      "https://api.finnhub.io/api/v1/quote?symbol=AAPL&token=test-key",
      "https://api.finnhub.io/api/v1/quote?symbol=VOO&token=test-key",
    ]);
    expect(eastMoneyCalls).toEqual([
      "https://push2.eastmoney.com/api/qt/stock/get?secid=1.600519&fields=f43%2Cf57%2Cf58%2Cf169%2Cf170",
      "https://push2.eastmoney.com/api/qt/stock/get?secid=0.830799&fields=f43%2Cf57%2Cf58%2Cf169%2Cf170",
    ]);
    expect(
      finnhubCalls.some(
        url =>
          url.includes("600519.SS") ||
          url.includes("830799.BJ") ||
          url.includes("0700.HK")
      )
    ).toBe(false);
  });

  it("preserves HKD conversion when HK stocks go through Yahoo pricing", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);

      if (url.includes("api.finnhub.io")) {
        throw new Error(`Finnhub should not be called: ${url}`);
      }

      if (
        url ===
        "https://query1.finance.yahoo.com/v8/finance/chart/0700.HK?interval=1d&range=5d"
      ) {
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 400,
                    chartPreviousClose: 380,
                    currency: "HKD",
                  },
                },
              ],
            },
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchAssetPrice } = await importPriceService();
    const result = await fetchAssetPrice("0700.HK", "stock", EXCHANGE_RATES);

    expect(result.priceUSD).toBeCloseTo((400 * 0.92) / 7.2, 6);
    expect(result.priceCNY).toBeCloseTo(400 * 0.92, 6);
    expect(result.change24h).toBeCloseTo(((400 - 380) / 380) * 100, 6);
  });

  it("falls back to EastMoney kline data when quote endpoint fails for A-shares", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);

      if (url.includes("push2.eastmoney.com/api/qt/stock/get")) {
        throw new Error("socket hang up");
      }

      if (
        url ===
        "https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.600519&fields1=f1%2Cf2%2Cf3&fields2=f51%2Cf52%2Cf53&klt=101&fqt=1&end=20500101&lmt=2"
      ) {
        return {
          ok: true,
          json: async () => ({
            data: {
              klines: [
                "2026-03-20,1452.96,1445.00",
                "2026-03-23,1433.33,1408.07",
              ],
            },
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchStockPrices } = await importPriceService();
    const quotes = await fetchStockPrices(["600519.SS"]);

    expect(quotes["600519.SS"]?.price).toBeCloseTo(1408.07, 2);
    expect(quotes["600519.SS"]?.changePercent).toBeCloseTo(
      ((1408.07 - 1445.0) / 1445.0) * 100,
      6
    );
    expect(quotes["600519.SS"]?.currency).toBe("CNY");
  });

  it("keeps dotted US tickers on Finnhub-first routing", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);

      if (
        url ===
        "https://api.finnhub.io/api/v1/quote?symbol=BRK.B&token=test-key"
      ) {
        return {
          ok: true,
          json: async () => ({ c: 470, d: 2, dp: 0.43 }),
        };
      }

      if (url.includes("finance.yahoo.com")) {
        throw new Error(`Yahoo should not be called: ${url}`);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchStockPrices } = await importPriceService();
    const quotes = await fetchStockPrices(["BRK.B"]);

    expect(quotes["BRK.B"]?.price).toBe(470);

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toEqual([
      "https://api.finnhub.io/api/v1/quote?symbol=BRK.B&token=test-key",
    ]);
  });

  it("falls back to Stooq for plain US tickers when Finnhub key is unavailable and Yahoo is blocked", async () => {
    delete process.env.FINNHUB_API_KEY;
    vi.resetModules();

    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);

      if (url === "https://stooq.com/q/l/?s=tsla.us&i=d") {
        return {
          ok: true,
          text: async () =>
            "TSLA.US,20260319,164150,387.27,387.27,379.7232,381.715,21574966,",
        };
      }

      if (url.includes("finance.yahoo.com")) {
        return {
          ok: false,
          text: async () => "Too Many Requests",
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchStockPrices } = await import("./priceService");
    const quotes = await fetchStockPrices(["TSLA"]);

    expect(quotes.TSLA?.price).toBeCloseTo(381.715, 6);
    expect(quotes.TSLA?.currency).toBe("USD");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toContain("https://stooq.com/q/l/?s=tsla.us&i=d");
  });
});
