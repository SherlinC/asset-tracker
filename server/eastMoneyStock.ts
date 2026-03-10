const STOCK_SUGGEST_URL = "https://searchapi.eastmoney.com/api/suggest/get";
const STOCK_SUGGEST_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";

type EastMoneyStockSuggestItem = {
  Code?: string;
  Name?: string;
  PinYin?: string;
  QuoteID?: string;
  Classify?: string;
  SecurityTypeName?: string;
};

type EastMoneyStockSuggestResponse = {
  QuotationCodeTable?: {
    Data?: EastMoneyStockSuggestItem[];
  };
};

export type EastMoneyStockSearchResult = {
  symbol: string;
  code: string;
  name: string;
  pinyin: string;
  market: string;
};

function isAStock(item: EastMoneyStockSuggestItem) {
  const classify = item.Classify ?? "";
  const securityTypeName = item.SecurityTypeName ?? "";

  return classify === "AStock" || /[沪深京北]A/.test(securityTypeName);
}

function normalizeAStockSymbol(item: EastMoneyStockSuggestItem) {
  const code = item.Code?.trim() ?? "";
  const quoteId = item.QuoteID?.trim() ?? "";
  const market = item.SecurityTypeName?.trim() ?? "";

  if (!code) {
    return "";
  }

  if (quoteId.startsWith("1.")) {
    return `${code}.SS`;
  }

  if (quoteId.startsWith("0.")) {
    if (/^[489]/.test(code) || /[京北]A/.test(market)) {
      return `${code}.BJ`;
    }

    return `${code}.SZ`;
  }

  if (/^(60|68)/.test(code) || market.includes("沪")) {
    return `${code}.SS`;
  }

  if (/^(00|30)/.test(code) || market.includes("深")) {
    return `${code}.SZ`;
  }

  if (/^[489]/.test(code) || /[京北]/.test(market)) {
    return `${code}.BJ`;
  }

  return code;
}

export async function searchEastMoneyStocks(
  q: string,
  limit: number = 50
): Promise<EastMoneyStockSearchResult[]> {
  const keyword = q.trim();

  if (!keyword) {
    return [];
  }

  try {
    const url = new URL(STOCK_SUGGEST_URL);
    url.searchParams.set("input", keyword);
    url.searchParams.set("type", "14");
    url.searchParams.set("token", STOCK_SUGGEST_TOKEN);
    url.searchParams.set(
      "count",
      String(Math.min(Math.max(limit * 3, 20), 100))
    );

    const res = await fetch(url, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        Referer: "https://quote.eastmoney.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as EastMoneyStockSuggestResponse;
    const items = data.QuotationCodeTable?.Data ?? [];

    return items
      .filter(item => isAStock(item))
      .map(item => ({
        symbol: normalizeAStockSymbol(item),
        code: item.Code?.trim() ?? "",
        name: item.Name?.trim() ?? item.Code?.trim() ?? "",
        pinyin: item.PinYin?.trim() ?? "",
        market: item.SecurityTypeName?.trim() ?? "A股",
      }))
      .filter(item => item.symbol && item.code)
      .slice(0, limit);
  } catch (err) {
    console.warn(
      "[EastMoney Stock] Failed to search stocks:",
      (err as Error).message
    );
    return [];
  }
}
