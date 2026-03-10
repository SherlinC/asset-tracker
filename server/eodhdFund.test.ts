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
});
