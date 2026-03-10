import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseNasdaqEtfDirectory,
  parseOtherListedEtfDirectory,
  searchNasdaqEtfs,
} from "./nasdaqEtf";

const NASDAQ_LISTED_SAMPLE = `Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
AAXJ|iShares MSCI All Country Asia ex Japan ETF|G|N||100|Y|N
AAPL|Apple Inc. Common Stock|Q|N|N|100|N|N
ZVZZT|Nasdaq Test Issue|Q|Y|N|100|Y|N
File Creation Time: 0309202610:30|||||||`;

const OTHER_LISTED_SAMPLE = `ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
AGG|iShares Core U.S. Aggregate Bond ETF|P|AGG|Y|100|N|AGG
VOO|Vanguard S&P 500 ETF|P|VOO|Y|100|N|VOO
TEST|Test ETF|P|TEST|Y|100|Y|TEST
File Creation Time: 0309202610:30|||||||`;

describe("nasdaqEtf", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses nasdaq-listed ETF rows and ignores test/footer rows", () => {
    expect(parseNasdaqEtfDirectory(NASDAQ_LISTED_SAMPLE)).toEqual([
      {
        symbol: "AAXJ",
        name: "iShares MSCI All Country Asia ex Japan ETF",
        issuer: "iShares / BlackRock",
        exchange: "NASDAQ",
        market: "US ETF",
        keywords: expect.arrayContaining(["aaxj", "ishares", "blackrock"]),
      },
    ]);
  });

  it("parses other-listed ETF rows and maps exchange names", () => {
    expect(parseOtherListedEtfDirectory(OTHER_LISTED_SAMPLE)).toEqual([
      {
        symbol: "AGG",
        name: "iShares Core U.S. Aggregate Bond ETF",
        issuer: "iShares / BlackRock",
        exchange: "NYSE Arca",
        market: "US ETF",
        keywords: expect.arrayContaining(["agg", "ishares", "blackrock"]),
      },
      {
        symbol: "VOO",
        name: "Vanguard S&P 500 ETF",
        issuer: "Vanguard",
        exchange: "NYSE Arca",
        market: "US ETF",
        keywords: expect.arrayContaining(["voo", "vanguard"]),
      },
    ]);
  });

  it("supports issuer alias matching such as BlackRock -> iShares", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => NASDAQ_LISTED_SAMPLE,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => OTHER_LISTED_SAMPLE,
        })
    );

    const result = await searchNasdaqEtfs("blackrock", 10);

    expect(result.map(item => item.symbol)).toEqual(["AAXJ", "AGG"]);
  });
});
