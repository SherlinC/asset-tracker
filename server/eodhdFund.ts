import { ENV } from "./_core/env";
import {
  dedupeInternationalFundResults,
  isIsin,
  type InternationalFundSearchResult,
} from "./internationalFundUtils";

type EodhdSearchResult = {
  Code?: string;
  Name?: string;
  Exchange?: string;
  Type?: string;
  Currency?: string;
  ISIN?: string;
};

type EodhdIdMappingResult = {
  symbol?: string;
  isin?: string;
};

type YahooSearchResponse = {
  quotes?: Array<{
    symbol?: string;
    quoteType?: string;
    longname?: string;
    shortname?: string;
    exchDisp?: string;
    exchange?: string;
  }>;
};

const KNOWN_INTERNATIONAL_FUNDS: InternationalFundSearchResult[] = [
  {
    symbol: "LU0124384867.EUFUND",
    isin: "LU0124384867",
    name: "BlackRock Global Funds - Sustainable Energy Fund A2",
    market: "EUFUND",
    currency: "USD",
    externalSymbol: "LU0124384867",
  },
  {
    symbol: "LU0157308031.EUFUND",
    isin: "LU0157308031",
    name: "AB - American Income Portfolio AT Inc",
    market: "EUFUND",
    currency: "USD",
    externalSymbol: "LU0157308031",
  },
  {
    symbol: "LU0205439572.EUFUND",
    isin: "LU0205439572",
    name: "Fidelity Funds - Asian High Yield Fund A USD",
    market: "EUFUND",
    currency: "USD",
    externalSymbol: "LU0205439572",
  },
  {
    symbol: "LU0266512127.EUFUND",
    isin: "LU0266512127",
    name: "JPMorgan Funds - Global Natural Resources Fund A USD",
    market: "EUFUND",
    currency: "USD",
    externalSymbol: "LU0266512127",
  },
  {
    symbol: "LU0633140727.EUFUND",
    isin: "LU0633140727",
    name: "AB - Emerging Markets Multi-Asset Portfolio AD USD Inc",
    market: "EUFUND",
    currency: "USD",
    externalSymbol: "LU0633140727",
  },
  {
    symbol: "LU1128926489.EUFUND",
    isin: "LU1128926489",
    name: "JPMorgan Funds - Income Fund A Mth USD",
    market: "EUFUND",
    currency: "USD",
    externalSymbol: "LU1128926489",
  },
];

function searchKnownFunds(
  query: string,
  limit: number
): InternationalFundSearchResult[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) {
    return [];
  }

  return KNOWN_INTERNATIONAL_FUNDS.filter(fund => {
    const haystack = [fund.symbol, fund.isin, fund.name, fund.externalSymbol]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  }).slice(0, limit);
}

function isLikelyPriceableWithoutEodhd(item: InternationalFundSearchResult) {
  const symbol = item.symbol.trim().toUpperCase();

  if (!symbol) {
    return false;
  }

  if (symbol.endsWith(".EUFUND")) {
    return false;
  }

  return symbol.startsWith("0P") || symbol.includes(".");
}

function normalizeYahooFundResult(
  item: NonNullable<YahooSearchResponse["quotes"]>[number],
  query: string
): InternationalFundSearchResult | null {
  const symbol = item.symbol?.trim();
  if (!symbol || item.quoteType !== "MUTUALFUND") {
    return null;
  }

  const normalizedQuery = query.trim().toUpperCase();

  return {
    symbol,
    isin: isIsin(normalizedQuery) ? normalizedQuery : symbol,
    name: item.longname?.trim() || item.shortname?.trim() || symbol,
    market: item.exchDisp?.trim() || item.exchange?.trim() || "Yahoo Finance",
    currency: "USD",
    externalSymbol: symbol,
  };
}

function normalizeFundResult(
  item: EodhdSearchResult
): InternationalFundSearchResult | null {
  const isin = item.ISIN?.trim().toUpperCase() ?? "";
  const code = item.Code?.trim() ?? "";
  const exchange = item.Exchange?.trim() ?? "";

  if (!isin) {
    return null;
  }

  return {
    symbol: code && exchange ? `${code}.${exchange}` : isin,
    isin,
    name: item.Name?.trim() || isin,
    market: exchange || "International Fund",
    currency: item.Currency?.trim() || "USD",
    externalSymbol: code || undefined,
  };
}

async function searchByQuery(
  query: string,
  limit: number
): Promise<InternationalFundSearchResult[]> {
  const url = new URL(
    `https://eodhd.com/api/search/${encodeURIComponent(query)}`
  );
  url.searchParams.set("api_token", ENV.eodhdApiKey);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("type", "fund");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search HTTP ${res.status}`);
  }

  const data = (await res.json()) as EodhdSearchResult[];
  return data
    .map(normalizeFundResult)
    .filter((item): item is InternationalFundSearchResult => item !== null);
}

async function searchByIsin(
  query: string
): Promise<InternationalFundSearchResult[]> {
  const url = new URL("https://eodhd.com/api/id-mapping");
  url.searchParams.set("api_token", ENV.eodhdApiKey);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("filter[isin]", query.trim().toUpperCase());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ID mapping HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    data?: EodhdIdMappingResult[];
  };

  const exactIsin = query.trim().toUpperCase();
  return (data.data ?? [])
    .map(item => ({
      symbol:
        item.symbol?.trim() || item.isin?.trim().toUpperCase() || exactIsin,
      isin: item.isin?.trim().toUpperCase() || exactIsin,
      name: item.symbol?.trim() || exactIsin,
      market: "International Fund",
      currency: "USD",
      externalSymbol: item.symbol?.trim() || undefined,
    }))
    .filter(item => item.symbol);
}

async function searchByYahooQuery(
  query: string,
  limit: number
): Promise<InternationalFundSearchResult[]> {
  const url = new URL("https://query2.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", query.trim());

  const res = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo search HTTP ${res.status}`);
  }

  const data = (await res.json()) as YahooSearchResponse;
  return (data.quotes ?? [])
    .map(item => normalizeYahooFundResult(item, query))
    .filter((item): item is InternationalFundSearchResult => item !== null)
    .slice(0, limit);
}

export async function searchInternationalFunds(
  q: string,
  limit: number = 20
): Promise<InternationalFundSearchResult[]> {
  const keyword = q.trim();
  const knownMatches = searchKnownFunds(keyword, limit);
  const publicKnownMatches = knownMatches.filter(isLikelyPriceableWithoutEodhd);

  if (!keyword) {
    return [];
  }

  if (ENV.eodhdApiKey) {
    try {
      const exact = isIsin(keyword) ? await searchByIsin(keyword) : [];
      const fuzzy = await searchByQuery(keyword, limit);
      const results = dedupeInternationalFundResults(
        [...knownMatches, ...exact, ...fuzzy],
        limit
      );

      if (results.length > 0) {
        return results;
      }
    } catch (err) {
      console.warn("[EODHD Fund] Search failed:", (err as Error).message);
    }
  }

  try {
    const yahooResults = await searchByYahooQuery(keyword, limit);
    return dedupeInternationalFundResults(
      ENV.eodhdApiKey
        ? [...knownMatches, ...yahooResults]
        : [...yahooResults, ...publicKnownMatches],
      limit
    );
  } catch (yahooErr) {
    console.warn("[Yahoo Fund] Search failed:", (yahooErr as Error).message);
    return ENV.eodhdApiKey ? knownMatches : publicKnownMatches;
  }
}
