/**
 * Price Service: Fetches real-time prices from external APIs
 * Supports: Exchange rates (USD/HKD to CNY), Crypto (Binance/CoinGecko), Stocks (Finnhub 优先 / Yahoo 兜底)
 */

import { ENV } from "./_core/env";

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
const mockExchangeRates: Record<string, number> = {
  USD: 7.2,
  HKD: 0.92,
  JPY: 0.048,
  CNY: 1,
};

const mockCryptoPrices: Record<string, CryptoPrice> = {
  BTC: {
    id: "bitcoin",
    symbol: "btc",
    current_price: 68973,
    market_cap: 1378720128791.6052,
    market_cap_change_percentage_24h: -1.86,
    price_change_percentage_24h: -1.86,
  },
  ETH: {
    id: "ethereum",
    symbol: "eth",
    current_price: 2026.34,
    market_cap: 244588032962.79095,
    market_cap_change_percentage_24h: -4.18,
    price_change_percentage_24h: -4.18,
  },
};

const mockStockPrices: Record<string, StockQuote> = {
  AAPL: { symbol: "AAPL", price: 255.42, change: 7.38, changePercent: 2.98 },
  GOOGL: { symbol: "GOOGL", price: 195.5, change: 2.15, changePercent: 1.11 },
  TSLA: { symbol: "TSLA", price: 402.75, change: -5.25, changePercent: -1.29 },
  MSFT: { symbol: "MSFT", price: 470.29, change: 4.34, changePercent: 0.93 },
  AMZN: { symbol: "AMZN", price: 238.43, change: -1.0, changePercent: -0.31 },
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
 * Returns rates for USD and HKD against CNY
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    // Try to fetch from ExchangeRate-API (free tier available)
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/CNY",
      {
        headers: { Accept: "application/json" },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as { rates: Record<string, number> };
      const r = data.rates;
      const result: Record<string, number> = {
        USD: 1 / (r.USD || 7.2),
        HKD: 1 / (r.HKD || 0.92),
        JPY: r.JPY != null ? 1 / r.JPY : 0.048,
        CNY: 1,
      };
      console.log(
        `[ExchangeRate-API] USD/CNY: ${result.USD.toFixed(4)}, HKD/CNY: ${result.HKD.toFixed(4)}`
      );
      return result;
    }
  } catch (error) {
    console.error("Error fetching exchange rates from API:", error);
  }

  // Fallback to mock data
  console.warn("[ExchangeRate-API] Using mock exchange rates");
  return mockExchangeRates;
}

/**
 * Fetch cryptocurrency prices: Binance (primary) -> CoinGecko (fallback) -> mock
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
    // Got some from Binance; fill missing from CoinGecko
    const geckoResult = await fetchCryptoPricesFromCoinGecko(missing);
    return { ...binanceResult, ...geckoResult };
  }

  // 2) Fallback to CoinGecko
  const geckoResult = await fetchCryptoPricesFromCoinGecko(symbols);
  if (Object.keys(geckoResult).length > 0) return geckoResult;

  // 3) Mock only when both APIs fail
  console.warn("[Crypto] Both Binance and CoinGecko failed, using mock prices");
  const result: Record<string, CryptoPrice> = {};
  for (const symbol of symbols) {
    if (mockCryptoPrices[symbol]) result[symbol] = mockCryptoPrices[symbol];
  }
  return result;
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
 * 股票价格：Finnhub(可选) -> Yahoo（美股/港股/日股/A股）-> mock 兜底
 * 配置 FINNHUB_API_KEY 后优先用 Finnhub（国内更稳定）；Yahoo 支持 0700.HK、7203.T、000001.SZ 等
 */
export async function fetchStockPrices(
  symbols: string[] = ["AAPL", "GOOGL", "TSLA"]
): Promise<Record<string, StockQuote>> {
  if (symbols.length === 0) return {};
  let quotes: Record<string, StockQuote> = {};
  if (ENV.finnhubApiKey) {
    quotes = await fetchStockPricesFromFinnhub(symbols, ENV.finnhubApiKey);
  }
  const missing = symbols.filter(s => !quotes[s]);
  if (missing.length > 0) {
    const yahooQuotes = await fetchStockPricesFromYahoo(missing);
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
 * Fetch a single asset price (for currency or crypto)
 * Returns price in USD and CNY
 */
export async function fetchAssetPrice(
  symbol: string,
  type: string
): Promise<{ priceUSD: number; priceCNY: number; change24h: number }> {
  try {
    if (type === "crypto") {
      const prices = await fetchCryptoPrices([symbol]);
      if (prices[symbol]) {
        const exchangeRates = await fetchExchangeRates();
        const priceUSD = prices[symbol].current_price;
        const priceCNY = priceUSD * (exchangeRates.USD || 7.2);
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
      const exchangeRates = await fetchExchangeRates();
      if (symbol === "USD") {
        return {
          priceUSD: 1,
          priceCNY: exchangeRates.USD || 7.2,
          change24h: 0,
        };
      } else if (symbol === "HKD") {
        return {
          priceUSD: 1 / (exchangeRates.HKD || 0.92),
          priceCNY: exchangeRates.HKD || 0.92,
          change24h: 0,
        };
      }
    } else if (type === "stock") {
      const prices = await fetchStockPrices([symbol]);
      if (prices[symbol]) {
        const exchangeRates = await fetchExchangeRates();
        const q = prices[symbol];
        const cur = q.currency ?? "USD";
        const cnyPerUnit =
          exchangeRates[cur] ?? (cur === "USD" ? exchangeRates.USD! : 0);
        const usdToCny = exchangeRates.USD || 7.2;
        const priceUSD =
          cur === "USD"
            ? q.price
            : cnyPerUnit
              ? (q.price * cnyPerUnit) / usdToCny
              : q.price;
        const priceCNY = priceUSD * usdToCny;
        console.log(
          `[fetchAssetPrice] stock ${symbol}: $${priceUSD.toFixed(2)} USD / ¥${priceCNY.toFixed(2)} CNY (raw: ${q.price} ${cur})`
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
