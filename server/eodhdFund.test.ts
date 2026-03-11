import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: {
    eodhdApiKey: "test-key",
  },
}));

import { ENV } from "./_core/env";
import { searchInternationalFunds } from "./eodhdFund";

describe("searchInternationalFunds", () => {
  afterEach(() => {
    ENV.eodhdApiKey = "test-key";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normalizes EODHD fund search results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            Code: "LU0633140727",
            Name: "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
            Exchange: "EUFUND",
            Currency: "USD",
            ISIN: "LU0633140727",
          },
        ],
      })
    );

    const result = await searchInternationalFunds("LU0633140727", 10);

    expect(result).toEqual([
      {
        symbol: "LU0633140727.EUFUND",
        isin: "LU0633140727",
        name: "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
        market: "EUFUND",
        currency: "USD",
        externalSymbol: "LU0633140727",
      },
    ]);
  });

  it("falls back to Yahoo mutual fund search when EODHD search fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.startsWith("https://eodhd.com/api/search/fidelity")) {
          return {
            ok: false,
            status: 402,
          };
        }

        if (
          url.startsWith("https://query2.finance.yahoo.com/v1/finance/search")
        ) {
          return {
            ok: true,
            json: async () => ({
              quotes: [
                {
                  symbol: "0P00016JWY.HK",
                  quoteType: "MUTUALFUND",
                  longname: "Fidelity Asian High Yield Y-MD-HKD",
                  exchDisp: "Hong Kong",
                },
                {
                  symbol: "AAPL",
                  quoteType: "EQUITY",
                  longname: "Apple Inc.",
                  exchDisp: "NASDAQ",
                },
              ],
            }),
          };
        }

        throw new Error(`Unexpected URL: ${url}`);
      })
    );

    const result = await searchInternationalFunds("fidelity", 10);

    expect(result).toEqual([
      {
        symbol: "LU0205439572.EUFUND",
        isin: "LU0205439572",
        name: "Fidelity Funds - Asian High Yield Fund A USD",
        market: "EUFUND",
        currency: "USD",
        externalSymbol: "LU0205439572",
      },
      {
        symbol: "0P00016JWY.HK",
        isin: "0P00016JWY.HK",
        name: "Fidelity Asian High Yield Y-MD-HKD",
        market: "Hong Kong",
        currency: "USD",
        externalSymbol: "0P00016JWY.HK",
      },
    ]);
  });

  it("falls back to Yahoo mutual fund search when EODHD key is unavailable", async () => {
    ENV.eodhdApiKey = "";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (
        url.startsWith("https://query2.finance.yahoo.com/v1/finance/search")
      ) {
        return {
          ok: true,
          json: async () => ({
            quotes: [
              {
                symbol: "LU0633140727.EUFUND",
                quoteType: "MUTUALFUND",
                longname:
                  "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
                exchDisp: "International Fund",
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await searchInternationalFunds("LU0633140727", 10);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        symbol: "LU0633140727.EUFUND",
        isin: "LU0633140727",
        name: "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
        market: "International Fund",
        currency: "USD",
        externalSymbol: "LU0633140727.EUFUND",
      },
    ]);
  });

  it("falls back to Yahoo when EODHD returns no ISIN results", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://eodhd.com/api/id-mapping")) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        };
      }

      if (url.startsWith("https://eodhd.com/api/search/LU0633140727")) {
        return {
          ok: true,
          json: async () => [],
        };
      }

      if (
        url.startsWith("https://query2.finance.yahoo.com/v1/finance/search")
      ) {
        return {
          ok: true,
          json: async () => ({
            quotes: [
              {
                symbol: "LU0633140727.EUFUND",
                quoteType: "MUTUALFUND",
                longname:
                  "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
                exchDisp: "International Fund",
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await searchInternationalFunds("LU0633140727", 10);

    expect(result).toEqual([
      {
        symbol: "LU0633140727.EUFUND",
        isin: "LU0633140727",
        name: "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
        market: "EUFUND",
        currency: "USD",
        externalSymbol: "LU0633140727",
      },
    ]);
  });

  it("falls back to local known funds when providers are unavailable", async () => {
    ENV.eodhdApiKey = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.startsWith("https://query2.finance.yahoo.com/v1/finance/search")
        ) {
          return {
            ok: false,
            status: 403,
          };
        }

        throw new Error(`Unexpected URL: ${url}`);
      })
    );

    const result = await searchInternationalFunds("LU0633140727", 10);

    expect(result).toEqual([
      {
        symbol: "LU0633140727.EUFUND",
        isin: "LU0633140727",
        name: "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
        market: "EUFUND",
        currency: "USD",
        externalSymbol: "LU0633140727",
      },
    ]);
  });
});
