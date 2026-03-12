import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

export type InternationalFundSearchResult = {
  symbol: string;
  name: string;
  isin: string;
  market: string;
  currency: string;
  externalSymbol?: string;
};

export type InternationalFundQuote = {
  price: number;
  changePercent: number;
  currency: string;
};

export function isIsin(query: string) {
  return /^[A-Z]{2}[A-Z0-9]{10}$/.test(query.trim().toUpperCase());
}

export function dedupeInternationalFundResults(
  items: InternationalFundSearchResult[],
  limit: number
) {
  return Array.from(
    new Map(items.map(item => [item.symbol, item])).values()
  ).slice(0, limit);
}

export async function getFirstSuccessfulFundQuote(
  fetchers: Array<() => Promise<InternationalFundQuote | null>>
) {
  for (const fetcher of fetchers) {
    const result = await fetcher();
    if (result) {
      return result;
    }
  }

  return null;
}

export function getUsdToCnyRate(exchangeRates: Record<string, number>) {
  return exchangeRates.USD || DEFAULT_USD_CNY_RATE;
}

export function convertForeignPriceToUsdAndCny(
  price: number,
  currency: string,
  exchangeRates: Record<string, number>
) {
  const cur = currency || "USD";
  const usdToCny = getUsdToCnyRate(exchangeRates);
  const cnyPerUnit =
    cur === "USD" ? usdToCny : cur === "CNY" ? 1 : exchangeRates[cur];
  const priceUSD =
    cur === "USD"
      ? price
      : cur === "CNY"
        ? price / usdToCny
        : cnyPerUnit
          ? (price * cnyPerUnit) / usdToCny
          : price;

  return {
    priceUSD,
    priceCNY: priceUSD * usdToCny,
  };
}

export function convertCnyPriceToUsdAndCny(
  priceCNY: number,
  exchangeRates: Record<string, number>
) {
  const usdToCny = getUsdToCnyRate(exchangeRates);

  return {
    priceUSD: priceCNY / usdToCny,
    priceCNY,
  };
}
