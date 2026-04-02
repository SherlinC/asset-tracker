import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

import { ENV } from "./_core/env";
import * as db from "./db";
import {
  isInternationalFundSymbol,
  type PriceIssueCode,
} from "./internationalFundUtils";
import * as priceService from "./priceService";

export type AssetPriceResult = {
  priceUSD: number;
  priceCNY: number;
  change24h: number;
  source: "live" | "cache" | "empty";
  marketDataSource?:
    | "onvista"
    | "jpm_official"
    | "jpm_factsheet"
    | "eodhd"
    | "morningstar"
    | "yahoo";
  issueCode?: PriceIssueCode;
};

const MAX_PRICE_CACHE_AGE_MS = ENV.priceCacheMaxAgeMinutes * 60 * 1000;

function parseCachedNumber(value: string | null | undefined): number {
  if (value == null) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFreshPriceCache(updatedAt: Date) {
  return Date.now() - updatedAt.getTime() <= MAX_PRICE_CACHE_AGE_MS;
}

function getPriceIssueCode(
  symbol: string,
  type: string
): PriceIssueCode | undefined {
  if (
    type === "fund" &&
    isInternationalFundSymbol(symbol) &&
    !ENV.eodhdApiKey
  ) {
    return "missing_eodhd_api_key";
  }

  return undefined;
}

export async function fetchAssetPriceWithFallback(
  assetId: number | null | undefined,
  symbol: string,
  type: string,
  exchangeRates?: Record<string, number>
): Promise<AssetPriceResult> {
  const livePrice = await priceService.fetchAssetPrice(
    symbol,
    type,
    exchangeRates
  );
  const issueCode = getPriceIssueCode(symbol, type);

  if (livePrice.priceUSD > 0) {
    if (assetId != null) {
      await db.upsertPrice(
        assetId,
        livePrice.priceUSD.toString(),
        livePrice.change24h.toString()
      );
    }

    return {
      ...livePrice,
      source: "live",
    };
  }

  if (assetId == null) {
    return {
      ...livePrice,
      source: "empty",
      issueCode,
    };
  }

  const cached = await db.getPriceByAssetId(assetId);
  if (!cached) {
    return {
      ...livePrice,
      source: "empty",
      issueCode,
    };
  }

  const cachedPriceUSD = parseCachedNumber(cached.price);
  const cachedChange24h = parseCachedNumber(cached.change24h);

  if (cachedPriceUSD <= 0 || !isFreshPriceCache(cached.updatedAt)) {
    if (cachedPriceUSD > 0) {
      console.warn(
        `[Price Cache] ${symbol}: stale cache ignored (${Math.round((Date.now() - cached.updatedAt.getTime()) / 60000)} min old)`
      );
    }

    return {
      ...livePrice,
      source: "empty",
      issueCode,
    };
  }

  const rates = exchangeRates ?? (await priceService.fetchExchangeRates());
  const usdToCny = rates.USD || DEFAULT_USD_CNY_RATE;

  return {
    priceUSD: cachedPriceUSD,
    priceCNY: cachedPriceUSD * usdToCny,
    change24h: cachedChange24h,
    source: "cache",
    issueCode,
  };
}
