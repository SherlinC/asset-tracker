import { ENV } from "./_core/env";

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

export type InternationalFundSearchResult = {
  symbol: string;
  name: string;
  isin: string;
  market: string;
  currency: string;
  externalSymbol?: string;
};

function isIsin(query: string) {
  return /^[A-Z]{2}[A-Z0-9]{10}$/.test(query.trim().toUpperCase());
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

export async function searchInternationalFunds(
  q: string,
  limit: number = 20
): Promise<InternationalFundSearchResult[]> {
  const keyword = q.trim();

  if (!keyword || !ENV.eodhdApiKey) {
    return [];
  }

  try {
    const exact = isIsin(keyword) ? await searchByIsin(keyword) : [];
    const fuzzy = await searchByQuery(keyword, limit);

    return Array.from(
      new Map([...exact, ...fuzzy].map(item => [item.symbol, item])).values()
    ).slice(0, limit);
  } catch (err) {
    console.warn("[EODHD Fund] Search failed:", (err as Error).message);
    return [];
  }
}
