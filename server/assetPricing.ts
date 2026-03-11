import * as db from "./db";
import * as priceService from "./priceService";

export type AssetPriceResult = {
  priceUSD: number;
  priceCNY: number;
  change24h: number;
};

function parseCachedNumber(value: string | null | undefined): number {
  if (value == null) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchAssetPriceWithFallback(
  assetId: number | null | undefined,
  symbol: string,
  type: string
): Promise<AssetPriceResult> {
  const livePrice = await priceService.fetchAssetPrice(symbol, type);

  if (livePrice.priceUSD > 0) {
    if (assetId != null) {
      await db.upsertPrice(
        assetId,
        livePrice.priceUSD.toString(),
        livePrice.change24h.toString()
      );
    }

    return livePrice;
  }

  if (assetId == null) {
    return livePrice;
  }

  const cached = await db.getPriceByAssetId(assetId);
  if (!cached) {
    return livePrice;
  }

  const cachedPriceUSD = parseCachedNumber(cached.price);
  const cachedChange24h = parseCachedNumber(cached.change24h);

  if (cachedPriceUSD <= 0) {
    return livePrice;
  }

  const exchangeRates = await priceService.fetchExchangeRates();
  const usdToCny = exchangeRates.USD || 7.2;

  return {
    priceUSD: cachedPriceUSD,
    priceCNY: cachedPriceUSD * usdToCny,
    change24h: cachedChange24h,
  };
}
