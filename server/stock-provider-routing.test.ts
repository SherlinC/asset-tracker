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

  it("routes A-share, BJ, and HK symbols to Yahoo while keeping US stock-like tickers on Finnhub", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);

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
        "https://query1.finance.yahoo.com/v8/finance/chart/600519.SS?interval=1d&range=5d"
      ) {
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 1488,
                    chartPreviousClose: 1470,
                    currency: "CNY",
                  },
                },
              ],
            },
          }),
        };
      }

      if (
        url ===
        "https://query1.finance.yahoo.com/v8/finance/chart/830799.BJ?interval=1d&range=5d"
      ) {
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 32.5,
                    chartPreviousClose: 31.8,
                    currency: "CNY",
                  },
                },
              ],
            },
          }),
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
    expect(quotes["600519.SS"]?.currency).toBe("CNY");
    expect(quotes["830799.BJ"]?.currency).toBe("CNY");
    expect(quotes["0700.HK"]?.currency).toBe("HKD");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    const finnhubCalls = urls.filter(url => url.includes("api.finnhub.io"));

    expect(finnhubCalls).toEqual([
      "https://api.finnhub.io/api/v1/quote?symbol=AAPL&token=test-key",
      "https://api.finnhub.io/api/v1/quote?symbol=VOO&token=test-key",
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
});
