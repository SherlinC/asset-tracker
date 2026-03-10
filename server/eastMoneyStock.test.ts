import { afterEach, describe, expect, it, vi } from "vitest";

import { searchEastMoneyStocks } from "./eastMoneyStock";

describe("searchEastMoneyStocks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns normalized A-share symbols and filters non-A-share results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          QuotationCodeTable: {
            Data: [
              {
                Code: "600362",
                Name: "江西铜业",
                PinYin: "JXTY",
                QuoteID: "1.600362",
                Classify: "AStock",
                SecurityTypeName: "沪A",
              },
              {
                Code: "000001",
                Name: "平安银行",
                PinYin: "PAYH",
                QuoteID: "0.000001",
                Classify: "AStock",
                SecurityTypeName: "深A",
              },
              {
                Code: "00358",
                Name: "江西铜业股份",
                PinYin: "JXTYGF",
                QuoteID: "116.00358",
                Classify: "HK",
                SecurityTypeName: "港股",
              },
            ],
          },
        }),
      })
    );

    const result = await searchEastMoneyStocks("江西铜业", 10);

    expect(result).toEqual([
      {
        symbol: "600362.SS",
        code: "600362",
        name: "江西铜业",
        pinyin: "JXTY",
        market: "沪A",
      },
      {
        symbol: "000001.SZ",
        code: "000001",
        name: "平安银行",
        pinyin: "PAYH",
        market: "深A",
      },
    ]);
  });

  it("returns empty array for blank queries", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await searchEastMoneyStocks("   ", 10);

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
