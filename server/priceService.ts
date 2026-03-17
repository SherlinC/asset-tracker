/**
 * Price Service: Fetches real-time prices from external APIs
 * Supports: Exchange rates (USD/HKD to CNY), Crypto (Binance/CoinGecko), Stocks (Finnhub 优先 / Yahoo 兜底)
 */

import { DEFAULT_EXCHANGE_RATES } from "@shared/exchangeRates";

import { ENV } from "./_core/env";
import {
  convertCnyPriceToUsdAndCny,
  convertForeignPriceToUsdAndCny,
  getFirstSuccessfulFundQuote,
  getUsdToCnyRate,
  type InternationalFundQuote,
} from "./internationalFundUtils";

// Type definitions
export interface ExchangeRateData {
  rates: Record<string, number>;
  base: string;
  date: string;
}

export interface CryptoPrice {
  id: string;
  symbol: string;
  current_price: number;
  market_cap: number | null;
  market_cap_change_percentage_24h: number | null;
  price_change_percentage_24h: number | null;
}

export interface StockPrice {
  c: number; // Current price
  h: number; // High price
  l: number; // Low price
  o: number; // Open price
  pc: number; // Previous close
  t: number; // Timestamp
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  /** 报价货币，如 USD、HKD、JPY、CNY */
  currency?: string;
}

// Fallback mock data for development/testing (only used when APIs are unavailable)
const mockExchangeRates: Record<string, number> = { ...DEFAULT_EXCHANGE_RATES };

function normalizeCnyBaseRates(rates: Record<string, number>) {
  return {
    USD: rates.USD != null ? 1 / rates.USD : mockExchangeRates.USD,
    HKD: rates.HKD != null ? 1 / rates.HKD : mockExchangeRates.HKD,
    EUR: rates.EUR != null ? 1 / rates.EUR : mockExchangeRates.EUR,
    JPY: rates.JPY != null ? 1 / rates.JPY : mockExchangeRates.JPY,
    RUB: rates.RUB != null ? 1 / rates.RUB : mockExchangeRates.RUB,
    CNY: 1,
  };
}

function getMedian(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function mergeExchangeRateCandidates(candidates: Record<string, number>[]) {
  const currencyKeys = ["USD", "HKD", "EUR", "JPY", "RUB", "CNY"];

  return Object.fromEntries(
    currencyKeys.map(currency => {
      const values = candidates
        .map(candidate => candidate[currency])
        .filter(
          (value): value is number => Number.isFinite(value) && value > 0
        );

      if (values.length === 0) {
        return [currency, mockExchangeRates[currency] ?? 1];
      }

      return [currency, getMedian(values)];
    })
  ) as Record<string, number>;
}

async function fetchExchangeRatesFromExchangeRateApi() {
  const response = await fetch(
    "https://api.exchangerate-api.com/v4/latest/CNY",
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { rates: Record<string, number> };
  return normalizeCnyBaseRates(data.rates);
}

async function fetchExchangeRatesFromOpenErApi() {
  const response = await fetch("https://open.er-api.com/v6/latest/CNY", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { rates: Record<string, number> };
  return normalizeCnyBaseRates(data.rates);
}

async function fetchExchangeRatesFromFrankfurter() {
  const response = await fetch(
    "https://api.frankfurter.app/latest?from=CNY&to=USD,HKD,EUR,JPY,RUB",
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { rates: Record<string, number> };
  return normalizeCnyBaseRates(data.rates);
}

const mockStockPrices: Record<string, StockQuote> = {
  AAPL: { symbol: "AAPL", price: 255.42, change: 7.38, changePercent: 2.98 },
  AMD: { symbol: "AMD", price: 167.25, change: 3.12, changePercent: 1.9 },
  GOOGL: { symbol: "GOOGL", price: 195.5, change: 2.15, changePercent: 1.11 },
  GOOG: { symbol: "GOOG", price: 197.2, change: 2.3, changePercent: 1.18 },
  TSLA: { symbol: "TSLA", price: 402.75, change: -5.25, changePercent: -1.29 },
  MSFT: { symbol: "MSFT", price: 470.29, change: 4.34, changePercent: 0.93 },
  AMZN: { symbol: "AMZN", price: 238.43, change: -1.0, changePercent: -0.31 },
  META: { symbol: "META", price: 620.5, change: 12.3, changePercent: 2.02 },
  BABA: { symbol: "BABA", price: 85.4, change: -1.2, changePercent: -1.39 },
  COIN: { symbol: "COIN", price: 248.6, change: 5.2, changePercent: 2.14 },
  DBB: { symbol: "DBB", price: 18.75, change: 0.12, changePercent: 0.64 },
  FIG: { symbol: "FIG", price: 10.25, change: 0.18, changePercent: 1.79 },
  JPM: { symbol: "JPM", price: 236.4, change: 1.45, changePercent: 0.62 },
  NFLX: { symbol: "NFLX", price: 982.3, change: 16.4, changePercent: 1.7 },
  NVDA: { symbol: "NVDA", price: 142.6, change: 4.1, changePercent: 2.96 },
  QQQ: { symbol: "QQQ", price: 520.8, change: 8.5, changePercent: 1.66 },
  USO: { symbol: "USO", price: 82.15, change: 0.45, changePercent: 0.55 },
};

// Binance symbol suffix (all against USDT)
const BINANCE_SYMBOL_SUFFIX = "USDT";

// Map symbols to CoinGecko IDs (fallback)
const coinGeckoIdMap: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  ADA: "cardano",
  SOL: "solana",
  DOGE: "dogecoin",
  OKB: "okb",
};

type CryptoComparePriceResponse = {
  RAW?: Record<
    string,
    Record<
      string,
      {
        PRICE?: number;
        MKTCAP?: number;
        CHANGEPCT24HOUR?: number;
      }
    >
  >;
};

/**
 * Fetch crypto prices from Binance (primary, no API key, very stable)
 * Uses ticker/24hr for price + 24h change in one request per symbol
 */
async function fetchCryptoPricesFromBinance(
  symbols: string[]
): Promise<Record<string, CryptoPrice>> {
  const result: Record<string, CryptoPrice> = {};
  for (const symbol of symbols) {
    const binanceSymbol = `${symbol}${BINANCE_SYMBOL_SUFFIX}`;
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) continue;
      const data = (await response.json()) as {
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        weightedAvgPrice?: string;
      };
      const price = parseFloat(data.lastPrice);
      const change24h = parseFloat(data.priceChangePercent || "0");
      if (Number.isFinite(price) && price > 0) {
        const id = coinGeckoIdMap[symbol] || symbol.toLowerCase();
        result[symbol] = {
          id,
          symbol: symbol.toLowerCase(),
          current_price: price,
          market_cap: null,
          market_cap_change_percentage_24h: change24h,
          price_change_percentage_24h: change24h,
        };
        console.log(
          `[Binance] ${symbol}: $${price.toFixed(2)} (24h: ${change24h.toFixed(2)}%)`
        );
      }
    } catch (err) {
      console.warn(`[Binance] Failed for ${symbol}:`, (err as Error).message);
    }
  }
  return result;
}

/**
 * Fetch exchange rates from real API or fallback to mock data
 * Returns rates: CNY per 1 unit of currency (USD, HKD, EUR, etc.)
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    const providers = [
      {
        name: "Frankfurter",
        fetchRates: fetchExchangeRatesFromFrankfurter,
      },
      {
        name: "ExchangeRate-API",
        fetchRates: fetchExchangeRatesFromExchangeRateApi,
      },
      {
        name: "Open ER API",
        fetchRates: fetchExchangeRatesFromOpenErApi,
      },
    ] as const;

    const settled = await Promise.allSettled(
      providers.map(async provider => {
        const result = await provider.fetchRates();

        if (result) {
          console.log(
            `[${provider.name}] USD/CNY: ${result.USD.toFixed(4)}, HKD/CNY: ${result.HKD.toFixed(4)}, EUR/CNY: ${result.EUR.toFixed(4)}, RUB/CNY: ${result.RUB.toFixed(4)}`
          );
        }

        return {
          name: provider.name,
          result,
        };
      })
    );

    const successfulResults = settled.flatMap(item => {
      if (item.status === "fulfilled" && item.value.result) {
        return [item.value.result];
      }

      if (item.status === "rejected") {
        console.warn("[ExchangeRates] Provider failed:", item.reason);
      }

      return [];
    });

    if (successfulResults.length === 1) {
      return successfulResults[0];
    }

    if (successfulResults.length > 1) {
      const merged = mergeExchangeRateCandidates(successfulResults);
      console.log(
        `[ExchangeRates] Consensus USD/CNY: ${merged.USD.toFixed(4)}, HKD/CNY: ${merged.HKD.toFixed(4)}, EUR/CNY: ${merged.EUR.toFixed(4)}, RUB/CNY: ${merged.RUB.toFixed(4)}`
      );
      return merged;
    }
  } catch (error) {
    console.error("Error fetching exchange rates from API:", error);
  }

  console.warn("[ExchangeRates] Using fallback exchange rates");
  return mockExchangeRates;
}

/**
 * Fetch cryptocurrency prices: Binance (primary) -> CoinGecko (fallback)
 * Binance is used first (no API key, very stable for BTC/ETH etc.)
 */
export async function fetchCryptoPrices(
  symbols: string[] = ["BTC", "ETH"]
): Promise<Record<string, CryptoPrice>> {
  // 1) Try Binance first (most stable for major pairs)
  const binanceResult = await fetchCryptoPricesFromBinance(symbols);
  const missing = symbols.filter(s => !binanceResult[s]);
  if (missing.length === 0) {
    return binanceResult;
  }
  if (Object.keys(binanceResult).length > 0) {
    const cryptoCompareResult =
      await fetchCryptoPricesFromCryptoCompare(missing);
    const stillMissing = missing.filter(s => !cryptoCompareResult[s]);
    const geckoResult =
      stillMissing.length > 0
        ? await fetchCryptoPricesFromCoinGecko(stillMissing)
        : {};
    return { ...binanceResult, ...cryptoCompareResult, ...geckoResult };
  }

  const cryptoCompareResult = await fetchCryptoPricesFromCryptoCompare(symbols);
  const stillMissing = symbols.filter(s => !cryptoCompareResult[s]);
  if (stillMissing.length === 0) {
    return cryptoCompareResult;
  }

  const geckoResult = await fetchCryptoPricesFromCoinGecko(stillMissing);
  if (
    Object.keys(cryptoCompareResult).length > 0 ||
    Object.keys(geckoResult).length > 0
  ) {
    return { ...cryptoCompareResult, ...geckoResult };
  }

  console.warn(
    "[Crypto] Binance, CryptoCompare, and CoinGecko failed, returning no live prices"
  );
  return {};
}

async function fetchCryptoPricesFromCryptoCompare(
  symbols: string[]
): Promise<Record<string, CryptoPrice>> {
  if (symbols.length === 0) return {};

  try {
    const response = await fetch(
      `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols.join(",")}&tsyms=USD`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return {};

    const data = (await response.json()) as CryptoComparePriceResponse;
    const raw = data.RAW ?? {};
    const result: Record<string, CryptoPrice> = {};

    for (const symbol of symbols) {
      const usdData = raw[symbol]?.USD;
      const price = usdData?.PRICE;
      if (price != null && Number.isFinite(price) && price > 0) {
        const change24h = usdData?.CHANGEPCT24HOUR ?? null;
        result[symbol] = {
          id: coinGeckoIdMap[symbol] || symbol.toLowerCase(),
          symbol: symbol.toLowerCase(),
          current_price: price,
          market_cap: usdData?.MKTCAP ?? null,
          market_cap_change_percentage_24h: change24h,
          price_change_percentage_24h: change24h,
        };
      }
    }

    return result;
  } catch (err) {
    console.warn("[CryptoCompare] Fallback failed:", (err as Error).message);
    return {};
  }
}

/**
 * CoinGecko API (fallback when Binance fails or for coins not on Binance)
 */
async function fetchCryptoPricesFromCoinGecko(
  symbols: string[]
): Promise<Record<string, CryptoPrice>> {
  try {
    const ids = symbols
      .map(s => coinGeckoIdMap[s] || s.toLowerCase())
      .join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return {};
    const data = (await response.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;
    const result: Record<string, CryptoPrice> = {};
    symbols.forEach(symbol => {
      const geckoId = coinGeckoIdMap[symbol] || symbol.toLowerCase();
      const priceData = data[geckoId];
      if (priceData?.usd != null) {
        result[symbol] = {
          id: geckoId,
          symbol: symbol.toLowerCase(),
          current_price: priceData.usd,
          market_cap: null,
          market_cap_change_percentage_24h: priceData.usd_24h_change ?? null,
          price_change_percentage_24h: priceData.usd_24h_change ?? null,
        };
      }
    });
    return result;
  } catch (err) {
    console.warn("[CoinGecko] Fallback failed:", (err as Error).message);
    return {};
  }
}

/**
 * Finnhub 免费股票 API（需注册拿 key：https://finnhub.io/register，60 次/分钟）
 * 主要支持美股；港股/日股/A 股可能需不同 symbol，未命中时走 Yahoo
 */
async function fetchStockPricesFromFinnhub(
  symbols: string[],
  apiKey: string
): Promise<Record<string, StockQuote>> {
  const quotes: Record<string, StockQuote> = {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  await Promise.all(
    symbols.map(async symbol => {
      try {
        const url = `https://api.finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          c?: number;
          d?: number;
          dp?: number;
          pc?: number;
        };
        const price = data.c;
        if (price != null && Number.isFinite(price) && price > 0) {
          const change = data.d ?? 0;
          const changePercent = data.dp ?? 0;
          quotes[symbol] = {
            symbol,
            price,
            change,
            changePercent,
            currency: "USD",
          };
          console.log(
            `[Finnhub] ${symbol}: USD ${price.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`
          );
        }
      } catch (err) {
        console.warn(`[Finnhub] ${symbol}:`, (err as Error).message);
      }
    })
  );

  clearTimeout(timeout);
  return quotes;
}

const YAHOO_FIRST_STOCK_SUFFIXES = [".SS", ".SZ", ".BJ", ".HK"];

function normalizeStockSymbolForRouting(symbol: string) {
  return symbol.trim().toUpperCase();
}

function shouldPreferYahooForStockSymbol(symbol: string) {
  const normalizedSymbol = normalizeStockSymbolForRouting(symbol);

  return YAHOO_FIRST_STOCK_SUFFIXES.some(suffix =>
    normalizedSymbol.endsWith(suffix)
  );
}

const YAHOO_CHART_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

type YahooChartJson = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        currency?: string;
      };
    }>;
  };
};

async function fetchOneSymbolFromYahoo(
  symbol: string,
  signal: AbortSignal
): Promise<StockQuote | null> {
  for (const base of YAHOO_CHART_HOSTS) {
    try {
      const url = `${base}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal,
      });
      if (!res.ok) continue;
      const data = (await res.json()) as YahooChartJson;
      const result = data.chart?.result?.[0];
      const meta = result?.meta;
      const price = meta?.regularMarketPrice;
      const prev = meta?.chartPreviousClose ?? price;
      const currency = meta?.currency ?? "USD";
      if (price != null && Number.isFinite(price) && price > 0) {
        const change = prev != null ? price - prev : 0;
        const changePercent = prev && prev !== 0 ? (change / prev) * 100 : 0;
        const quote: StockQuote = {
          symbol,
          price,
          change,
          changePercent,
          currency,
        };
        console.log(
          `[Yahoo] ${symbol}: ${currency} ${price.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`
        );
        return quote;
      }
    } catch (err) {
      console.warn(`[Yahoo] ${symbol} (${base}):`, (err as Error).message);
    }
  }
  return null;
}

/**
 * Yahoo Finance 行情（非官方接口，无需 key）
 * 支持：美股(AAPL)、港股(0700.HK)、日股(7203.T)、A股(000001.SZ/600519.SS)
 * 添加股票时 symbol 请用 Yahoo 格式，见 https://finance.yahoo.com
 */
async function fetchStockPricesFromYahoo(
  symbols: string[]
): Promise<Record<string, StockQuote>> {
  const quotes: Record<string, StockQuote> = {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  await Promise.all(
    symbols.map(async symbol => {
      const q = await fetchOneSymbolFromYahoo(symbol, controller.signal);
      if (q) quotes[symbol] = q;
    })
  );

  clearTimeout(timeout);
  return quotes;
}

/**
 * 股票价格：按市场路由到 Finnhub / Yahoo，再走 mock 兜底
 * 美股及美股类 ETF 优先 Finnhub；港股/A股/北交所优先 Yahoo，避免非美股误走 USD 路径
 */
export async function fetchStockPrices(
  symbols: string[] = ["AAPL", "GOOGL", "TSLA"]
): Promise<Record<string, StockQuote>> {
  if (symbols.length === 0) return {};

  let quotes: Record<string, StockQuote> = {};
  const yahooFirstSymbols = symbols.filter(shouldPreferYahooForStockSymbol);
  const finnhubFirstSymbols = symbols.filter(
    symbol => !shouldPreferYahooForStockSymbol(symbol)
  );

  if (ENV.finnhubApiKey && finnhubFirstSymbols.length > 0) {
    quotes = await fetchStockPricesFromFinnhub(
      finnhubFirstSymbols,
      ENV.finnhubApiKey
    );
  }

  const yahooSymbols = Array.from(
    new Set([
      ...yahooFirstSymbols,
      ...finnhubFirstSymbols.filter(symbol => !quotes[symbol]),
    ])
  );

  if (yahooSymbols.length > 0) {
    const yahooQuotes = await fetchStockPricesFromYahoo(yahooSymbols);
    for (const s of Object.keys(yahooQuotes)) quotes[s] = yahooQuotes[s];
  }

  const stillMissing = symbols.filter(s => !quotes[s]);
  if (stillMissing.length > 0) {
    const fallback = getStockPricesFallback(stillMissing);
    for (const s of stillMissing) {
      if (fallback[s]) {
        console.log(
          `[Stock 价格兜底] ${s}: 使用 mock ${fallback[s].price} ${fallback[s].currency ?? "USD"}（API 未返回）`
        );
        quotes[s] = fallback[s];
      }
    }
  }
  return quotes;
}

/**
 * Get fallback stock prices (mock data)
 */
function getStockPricesFallback(symbols: string[]): Record<string, StockQuote> {
  const result: Record<string, StockQuote> = {};
  for (const symbol of symbols) {
    if (mockStockPrices[symbol]) {
      result[symbol] = mockStockPrices[symbol];
    }
  }
  return result;
}

/**
 * 天天基金/东方财富 实时净值估算（人民币）
 * https://fundgz.1234567.com.cn/js/{code}.js 返回 jsonpgz({...});
 */
async function fetchFundPriceFromEastMoney(
  code: string
): Promise<{ priceCNY: number; changePercent: number } | null> {
  try {
    const url = `https://fundgz.1234567.com.cn/js/${encodeURIComponent(code)}.js?v=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/jsonpgz\(([\s\S]*)\)\s*;?\s*$/);
    if (!match) return null;
    const payload = match[1]?.trim();
    if (!payload) return null;
    const data = JSON.parse(payload) as {
      gsz?: string;
      dwjz?: string;
      gszzl?: string;
    };
    const priceStr = data.gsz || data.dwjz;
    const price = priceStr ? parseFloat(priceStr) : NaN;
    const changeStr = data.gszzl ?? "0";
    const changePercent = parseFloat(changeStr) || 0;
    if (!Number.isFinite(price) || price <= 0) return null;
    console.log(
      `[EastMoney Fund] ${code}: ¥${price.toFixed(4)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`
    );
    return { priceCNY: price, changePercent };
  } catch (err) {
    console.warn(`[EastMoney Fund] ${code}:`, (err as Error).message);
    return null;
  }
}

type EastMoneyEtfQuoteResponse = {
  data?: {
    f43?: number;
    f170?: number;
  };
};

type EastMoneyLatestNavResponse = {
  Data?: {
    LSJZList?: Array<{
      DWJZ?: string;
      JZZZL?: string;
    }>;
  };
};

type EodhdFundSearchItem = {
  Code?: string;
  Exchange?: string;
  Currency?: string;
};

type EodhdFundEodItem = {
  close?: number;
};

type MorningstarScreenerResponse = {
  results?: Array<{
    meta?: {
      securityID?: string;
    };
  }>;
};

type MorningstarFundQuoteResponse = {
  latestPrice?: number;
  latestPriceDate?: string;
  trailing1DayReturn?: number;
  currency?: string;
};

async function fetchInternationalFundPriceFromEodhd(
  symbol: string
): Promise<InternationalFundQuote | null> {
  if (!ENV.eodhdApiKey || !symbol.includes(".")) {
    return null;
  }

  try {
    const [code, exchange] = symbol.split(".");
    if (!code || !exchange) {
      return null;
    }

    const metaUrl = new URL(
      `https://eodhd.com/api/search/${encodeURIComponent(code)}`
    );
    metaUrl.searchParams.set("api_token", ENV.eodhdApiKey);
    metaUrl.searchParams.set("fmt", "json");
    metaUrl.searchParams.set("type", "fund");
    metaUrl.searchParams.set("limit", "10");

    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
      return null;
    }

    const meta = ((await metaRes.json()) as EodhdFundSearchItem[]).find(
      item =>
        item.Code?.trim().toUpperCase() === code.toUpperCase() &&
        item.Exchange?.trim().toUpperCase() === exchange.toUpperCase()
    );

    const eodUrl = new URL(
      `https://eodhd.com/api/eod/${encodeURIComponent(symbol)}`
    );
    eodUrl.searchParams.set("api_token", ENV.eodhdApiKey);
    eodUrl.searchParams.set("fmt", "json");
    eodUrl.searchParams.set(
      "from",
      new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
    );
    eodUrl.searchParams.set("to", new Date().toISOString().slice(0, 10));

    const eodRes = await fetch(eodUrl);
    if (!eodRes.ok) {
      return null;
    }

    const eod = (await eodRes.json()) as EodhdFundEodItem[];
    const latest = eod.at(-1);
    const previous = eod.length > 1 ? eod.at(-2) : undefined;
    const price = latest?.close;

    if (price == null || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    const changePercent =
      previous?.close && previous.close > 0
        ? ((price - previous.close) / previous.close) * 100
        : 0;

    return {
      price,
      changePercent,
      currency: meta?.Currency?.trim() || "USD",
    };
  } catch (err) {
    console.warn("[EODHD Fund Price]", symbol, (err as Error).message);
    return null;
  }
}

async function fetchInternationalFundPriceFromMorningstar(
  symbol: string
): Promise<InternationalFundQuote | null> {
  if (!symbol.includes(".")) {
    return null;
  }

  const [isin] = symbol.split(".");
  if (!isin || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin.toUpperCase())) {
    return null;
  }

  try {
    const screenerUrl = new URL(
      "https://global.morningstar.com/api/v1/en-gb/tools/screener/_data"
    );
    screenerUrl.searchParams.set("query", `_ ~= '${isin.toUpperCase()}'`);
    screenerUrl.searchParams.set("limit", "1");

    const screenerRes = await fetch(screenerUrl, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!screenerRes.ok) {
      return null;
    }

    const screenerData =
      (await screenerRes.json()) as MorningstarScreenerResponse;
    const securityId = screenerData.results?.[0]?.meta?.securityID;

    if (!securityId) {
      return null;
    }

    const quoteUrl = new URL(
      `https://api-global.morningstar.com/sal-service/v1/fund/quote/v7/${encodeURIComponent(
        securityId
      )}/data`
    );
    quoteUrl.searchParams.set("clientId", "MDC");
    quoteUrl.searchParams.set("version", "4.71.0");
    quoteUrl.searchParams.set("apikey", "lstzFDEOhfFNMLikKa0am9mgEKLBl49T");

    const quoteRes = await fetch(quoteUrl, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        Origin: "https://www.morningstar.com",
        Referer: "https://www.morningstar.com/",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!quoteRes.ok) {
      return null;
    }

    const quoteData = (await quoteRes.json()) as MorningstarFundQuoteResponse;
    const price = quoteData.latestPrice;

    if (price == null || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    return {
      price,
      changePercent:
        typeof quoteData.trailing1DayReturn === "number"
          ? quoteData.trailing1DayReturn
          : 0,
      currency: quoteData.currency?.trim() || "USD",
    };
  } catch (err) {
    console.warn("[Morningstar Fund Price]", symbol, (err as Error).message);
    return null;
  }
}

async function fetchInternationalFundPriceFromYahoo(
  symbol: string
): Promise<InternationalFundQuote | null> {
  const normalized = symbol.trim().toUpperCase();
  if (
    !normalized ||
    (!normalized.includes(".") && !normalized.startsWith("0P"))
  ) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const quote = await fetchOneSymbolFromYahoo(symbol, controller.signal);
    if (!quote) {
      return null;
    }

    return {
      price: quote.price,
      changePercent: quote.changePercent,
      currency: quote.currency ?? "USD",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getCnFundQuoteSecids(code: string) {
  if (!/^\d{6}$/.test(code)) {
    return [] as string[];
  }

  if (/^[56]/.test(code)) {
    return [`1.${code}`, `0.${code}`];
  }

  return [`0.${code}`, `1.${code}`];
}

async function fetchFundPriceFromEastMoneyEtfQuote(
  code: string
): Promise<{ priceCNY: number; changePercent: number } | null> {
  const secids = getCnFundQuoteSecids(code);

  for (const secid of secids) {
    try {
      const url = new URL("https://push2.eastmoney.com/api/qt/stock/get");
      url.searchParams.set("secid", secid);
      url.searchParams.set("fields", "f43,f170");

      const res = await fetch(url, {
        headers: {
          Accept: "application/json,text/plain,*/*",
          Referer: "https://quote.eastmoney.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        continue;
      }

      const data = (await res.json()) as EastMoneyEtfQuoteResponse;
      const rawPrice = data.data?.f43;
      const rawChangePercent = data.data?.f170;

      if (rawPrice == null || !Number.isFinite(rawPrice) || rawPrice <= 0) {
        continue;
      }

      const priceCNY = rawPrice / 1000;
      const changePercent =
        rawChangePercent != null && Number.isFinite(rawChangePercent)
          ? rawChangePercent / 100
          : 0;

      console.log(
        `[EastMoney ETF Quote] ${code} via ${secid}: ¥${priceCNY.toFixed(4)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`
      );

      return { priceCNY, changePercent };
    } catch (err) {
      console.warn(
        `[EastMoney ETF Quote] ${code} via ${secid}:`,
        (err as Error).message
      );
    }
  }

  return null;
}

async function fetchFundLatestNavFromEastMoney(
  code: string
): Promise<{ priceCNY: number; changePercent: number } | null> {
  try {
    const url = new URL("http://api.fund.eastmoney.com/f10/lsjz");
    url.searchParams.set("fundCode", code);
    url.searchParams.set("pageIndex", "1");
    url.searchParams.set("pageSize", "1");

    const res = await fetch(url, {
      headers: {
        Referer: "http://fundf10.eastmoney.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as EastMoneyLatestNavResponse;
    const latest = data.Data?.LSJZList?.[0];
    const priceCNY = latest?.DWJZ ? parseFloat(latest.DWJZ) : NaN;

    if (priceCNY == null || !Number.isFinite(priceCNY) || priceCNY <= 0) {
      return null;
    }

    const parsedChange = latest?.JZZZL ? parseFloat(latest.JZZZL) : NaN;
    const changePercent = Number.isFinite(parsedChange) ? parsedChange : 0;

    console.log(
      `[EastMoney Fund NAV] ${code}: ¥${priceCNY.toFixed(4)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`
    );

    return { priceCNY, changePercent };
  } catch (err) {
    console.warn(`[EastMoney Fund NAV] ${code}:`, (err as Error).message);
    return null;
  }
}

/**
 * Fetch a single asset price (for currency, crypto, stock, fund)
 * Returns price in USD and CNY
 */
export async function fetchAssetPrice(
  symbol: string,
  type: string,
  exchangeRates?: Record<string, number>
): Promise<{ priceUSD: number; priceCNY: number; change24h: number }> {
  try {
    if (type === "fund") {
      const internationalFundData = await getFirstSuccessfulFundQuote([
        () => fetchInternationalFundPriceFromEodhd(symbol),
        () => fetchInternationalFundPriceFromMorningstar(symbol),
        () => fetchInternationalFundPriceFromYahoo(symbol),
      ]);

      if (internationalFundData) {
        const rates = exchangeRates ?? (await fetchExchangeRates());
        const { priceUSD, priceCNY } = convertForeignPriceToUsdAndCny(
          internationalFundData.price,
          internationalFundData.currency,
          rates
        );

        return {
          priceUSD,
          priceCNY,
          change24h: internationalFundData.changePercent,
        };
      }

      const fundData =
        (await fetchFundPriceFromEastMoney(symbol)) ??
        (await fetchFundPriceFromEastMoneyEtfQuote(symbol)) ??
        (await fetchFundLatestNavFromEastMoney(symbol));
      if (fundData) {
        const rates = exchangeRates ?? (await fetchExchangeRates());
        const { priceUSD, priceCNY } = convertCnyPriceToUsdAndCny(
          fundData.priceCNY,
          rates
        );
        return {
          priceUSD,
          priceCNY,
          change24h: fundData.changePercent,
        };
      }
    } else if (type === "crypto") {
      const prices = await fetchCryptoPrices([symbol]);
      if (prices[symbol]) {
        const rates = exchangeRates ?? (await fetchExchangeRates());
        const priceUSD = prices[symbol].current_price;
        const priceCNY = priceUSD * getUsdToCnyRate(rates);
        console.log(
          `[fetchAssetPrice] ${symbol}: $${priceUSD.toFixed(2)} / ¥${priceCNY.toFixed(2)}`
        );
        return {
          priceUSD,
          priceCNY,
          change24h: prices[symbol].price_change_percentage_24h || 0,
        };
      }
    } else if (type === "currency") {
      const rates = exchangeRates ?? (await fetchExchangeRates());
      const usdToCny = getUsdToCnyRate(rates);
      // All rates are "CNY per 1 unit of currency"
      const cnyPerUnit =
        symbol === "USD" || symbol === "USDT"
          ? usdToCny
          : symbol === "CNY"
            ? 1
            : (rates[symbol] as number | undefined);
      if (cnyPerUnit != null && cnyPerUnit > 0) {
        const priceCNY = symbol === "CNY" ? 1 : cnyPerUnit;
        const priceUSD =
          symbol === "USD" || symbol === "USDT" ? 1 : priceCNY / usdToCny;
        return {
          priceUSD,
          priceCNY,
          change24h: 0,
        };
      }
    } else if (type === "stock") {
      const prices = await fetchStockPrices([symbol]);
      if (prices[symbol]) {
        const rates = exchangeRates ?? (await fetchExchangeRates());
        const q = prices[symbol];
        const { priceUSD, priceCNY } = convertForeignPriceToUsdAndCny(
          q.price,
          q.currency ?? "USD",
          rates
        );
        console.log(
          `[fetchAssetPrice] stock ${symbol}: $${priceUSD.toFixed(2)} USD / ¥${priceCNY.toFixed(2)} CNY (raw: ${q.price} ${q.currency ?? "USD"})`
        );
        return {
          priceUSD,
          priceCNY,
          change24h: q.changePercent,
        };
      }
    }
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
  }

  return { priceUSD: 0, priceCNY: 0, change24h: 0 };
}
