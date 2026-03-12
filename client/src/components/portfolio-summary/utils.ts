import { getLocalizedAssetName } from "@/lib/assetLocalization";

import { getTypeOrder, TYPE_LABELS_ZH } from "./constants";

import type {
  AggregatedAsset,
  PieChartDatum,
  PortfolioData,
  TypeAllocation,
} from "./types";

export function aggregateAssets(
  assets: PortfolioData["assets"],
  isZh: boolean
): AggregatedAsset[] {
  const bySymbol = new Map<string, AggregatedAsset>();

  for (const asset of assets) {
    const existing = bySymbol.get(asset.symbol);

    if (existing) {
      existing.valueUSD += asset.valueUSD;
      continue;
    }

    bySymbol.set(asset.symbol, {
      symbol: asset.symbol,
      valueUSD: asset.valueUSD,
      type: asset.type,
      name: getLocalizedAssetName(asset.symbol, asset.name, isZh),
    });
  }

  return Array.from(bySymbol.values());
}

export function buildTypeAllocation(
  assets: PortfolioData["assets"]
): TypeAllocation {
  const typeAllocation: TypeAllocation = {};

  for (const asset of assets) {
    if (!typeAllocation[asset.type]) {
      typeAllocation[asset.type] = 0;
    }

    typeAllocation[asset.type] += asset.valueUSD;
  }

  return typeAllocation;
}

export function buildPieChartData(
  typeAllocation: TypeAllocation,
  isZh: boolean
): PieChartDatum[] {
  return (Object.entries(typeAllocation) as [string, number][])
    .filter(([, value]) => value > 0)
    .sort(([a], [b]) => getTypeOrder(a) - getTypeOrder(b))
    .map(([type, value]) => ({
      name: isZh
        ? (TYPE_LABELS_ZH[type] ?? type)
        : type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(value * 100) / 100,
      type,
    }));
}
