import {
  CATEGORY_ORDER,
  STOCK_CATEGORY_KEYS,
  getAssetCategoryKey,
} from "./constants";

import type {
  AggregatedHolding,
  Holding,
  HoldingCategoryKey,
  PortfolioAssetSummary,
} from "./types";

export function formatQuantity(value: number) {
  return value.toFixed(8).replace(/\.?0+$/, "");
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatMoney(value: number, symbol: string) {
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildAggregatedHoldings(
  holdings: Holding[],
  portfolioAssets: PortfolioAssetSummary[]
): AggregatedHolding[] {
  const grouped = new Map<number, Holding[]>();

  for (const item of holdings) {
    const existing = grouped.get(item.asset.id) ?? [];
    existing.push(item);
    grouped.set(item.asset.id, existing);
  }

  return Array.from(grouped.values())
    .map(records => {
      const asset = records[0].asset;
      const assetSummary = portfolioAssets.find(item => item.id === asset.id);
      const currentPriceUSD = assetSummary?.priceUSD ?? 0;
      const totalQuantity = records.reduce(
        (sum, record) => sum + parseFloat(record.holding.quantity),
        0
      );
      const totalValueUSD = totalQuantity * currentPriceUSD;
      const allHaveCostBasis = records.every(
        record => record.holding.costBasis !== null
      );
      const totalCostBasisUSD = allHaveCostBasis
        ? records.reduce((sum, record) => {
            const quantity = parseFloat(record.holding.quantity);
            const costBasis = parseFloat(record.holding.costBasis ?? "0");
            return sum + quantity * costBasis;
          }, 0)
        : null;
      const profitLossUSD =
        totalCostBasisUSD !== null ? totalValueUSD - totalCostBasisUSD : null;
      const profitLossPercent =
        totalCostBasisUSD && totalCostBasisUSD !== 0 && profitLossUSD !== null
          ? (profitLossUSD / totalCostBasisUSD) * 100
          : null;

      return {
        asset,
        records: [...records].sort(
          (a, b) =>
            new Date(b.holding.createdAt).getTime() -
            new Date(a.holding.createdAt).getTime()
        ),
        totalQuantity,
        currentPriceUSD,
        totalValueUSD,
        totalCostBasisUSD,
        profitLossUSD,
        profitLossPercent,
        change24h: assetSummary?.change24h ?? 0,
      };
    })
    .sort((a, b) => b.totalValueUSD - a.totalValueUSD);
}

export function groupHoldingsByCategory(
  aggregatedHoldings: AggregatedHolding[]
) {
  const holdingsByCategory = new Map<HoldingCategoryKey, AggregatedHolding[]>();

  for (const group of aggregatedHoldings) {
    const key = getAssetCategoryKey(group.asset);
    const list = holdingsByCategory.get(key) ?? [];
    list.push(group);
    holdingsByCategory.set(key, list);
  }

  const orderedCategories = CATEGORY_ORDER.filter(
    category => (holdingsByCategory.get(category)?.length ?? 0) > 0
  ) as HoldingCategoryKey[];

  return { holdingsByCategory, orderedCategories };
}

export function resolveScrollTarget(
  scrollToCategory: string | null | undefined,
  orderedCategories: HoldingCategoryKey[]
) {
  if (scrollToCategory == null || orderedCategories.length === 0) {
    return null;
  }

  if (scrollToCategory === "currency") {
    return "currency";
  }

  if (scrollToCategory === "crypto") {
    return "crypto";
  }

  if (scrollToCategory === "fund") {
    return "fund";
  }

  if (scrollToCategory === "stock") {
    return (
      STOCK_CATEGORY_KEYS.find(category =>
        orderedCategories.includes(category)
      ) ?? null
    );
  }

  return null;
}
