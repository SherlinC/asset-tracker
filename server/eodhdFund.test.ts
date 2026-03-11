import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: {
    eodhdApiKey: "test-key",
  },
}));

import { searchInternationalFunds } from "./eodhdFund";

describe("searchInternationalFunds", () => {
  afterEach(() => {
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
        symbol: "0P00016JWY.HK",
        isin: "0P00016JWY.HK",
        name: "Fidelity Asian High Yield Y-MD-HKD",
        market: "Hong Kong",
        currency: "USD",
        externalSymbol: "0P00016JWY.HK",
      },
    ]);
  });
});
