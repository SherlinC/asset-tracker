import type { Holding, HoldingCategoryKey } from "./types";

export const CATEGORY_ORDER: HoldingCategoryKey[] = [
  "a_stock",
  "hk_stock",
  "us_stock",
  "fund",
  "us_etf",
  "crypto",
  "currency",
  "other",
];

export const STOCK_CATEGORY_KEYS: HoldingCategoryKey[] = [
  "a_stock",
  "hk_stock",
  "us_stock",
];

export const TEMPLATE_CATEGORY_KEYS: HoldingCategoryKey[] = [
  "a_stock",
  "hk_stock",
  "us_stock",
  "fund",
  "us_etf",
  "crypto",
  "currency",
];

export const CATEGORY_LABELS: Record<HoldingCategoryKey, string> = {
  crypto: "虚拟货币",
  us_stock: "美股",
  a_stock: "A股",
  hk_stock: "港股",
  us_etf: "国际基金",
  fund: "中国基金",
  currency: "货币",
  other: "其他",
};

export const CATEGORY_LABELS_EN: Record<HoldingCategoryKey, string> = {
  crypto: "Crypto",
  us_stock: "US Stocks",
  a_stock: "A-Shares",
  hk_stock: "HK Stocks",
  us_etf: "International Fund",
  fund: "China Fund",
  currency: "Currency",
  other: "Other",
};

export const TYPE_LABELS_ZH: Record<string, string> = {
  currency: "货币",
  crypto: "虚拟货币",
  stock: "股票",
  fund: "基金",
};

export function getAssetSubTypeLabel(asset: Holding["asset"]) {
  const symbol = asset.symbol.toUpperCase();

  if (asset.type === "stock") {
    if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) {
      return "A股";
    }
    if (symbol.endsWith(".HK")) {
      return "港股";
    }
    return "美股";
  }

  if (asset.type === "fund") {
    if (
      symbol.endsWith(".EUFUND") ||
      /^[A-Z]{2}[A-Z0-9]{10}(\.[A-Z]+)?$/.test(symbol)
    ) {
      return "国际基金";
    }
    return "中国基金";
  }

  if (asset.type === "crypto") {
    return "加密货币";
  }

  if (asset.type === "currency") {
    return "货币";
  }

  return null;
}

export function getAssetCategoryKey(
  asset: Holding["asset"]
): HoldingCategoryKey {
  const label = getAssetSubTypeLabel(asset);

  switch (label) {
    case "加密货币":
      return "crypto";
    case "美股":
      return "us_stock";
    case "A股":
      return "a_stock";
    case "港股":
      return "hk_stock";
    case "国际基金":
      return "us_etf";
    case "中国基金":
      return "fund";
    case "货币":
      return "currency";
    default:
      return "other";
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case "currency":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "crypto":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    case "stock":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "fund":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
  }
}

export function getProfitLossColor(profitLoss: number) {
  if (profitLoss > 0) return "text-green-600 dark:text-green-400";
  if (profitLoss < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}
