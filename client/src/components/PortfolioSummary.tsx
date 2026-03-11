import { useMemo, useState } from "react";

import { PortfolioAllocationCard } from "@/components/portfolio-summary/PortfolioAllocationCard";
import {
  getTypeOrder,
  TYPE_LABELS_ZH,
} from "@/components/portfolio-summary/constants";
import { PortfolioValueCard } from "@/components/portfolio-summary/PortfolioValueCard";
import type {
  AggregatedAsset,
  PieChartDatum,
  PortfolioData,
} from "@/components/portfolio-summary/types";
import { useLanguage } from "@/hooks/useLanguage";
import { getLocalizedAssetName } from "@/lib/assetLocalization";

interface Props {
  data?: PortfolioData;
  onCategoryClick?: (type: string) => void;
}

function aggregateAssets(
  assets: PortfolioData["assets"],
  isZh: boolean
): AggregatedAsset[] {
  const bySymbol = new Map<string, AggregatedAsset>();

  for (const asset of assets) {
    const existing = bySymbol.get(asset.symbol);
    if (existing) {
      existing.valueUSD += asset.valueUSD;
    } else {
      bySymbol.set(asset.symbol, {
        symbol: asset.symbol,
        valueUSD: asset.valueUSD,
        type: asset.type,
        name: getLocalizedAssetName(asset.symbol, asset.name, isZh),
      });
    }
  }

  return Array.from(bySymbol.values());
}

function buildTypeAllocation(assets: PortfolioData["assets"]) {
  const typeAllocation: Record<string, number> = {};

  for (const asset of assets) {
    if (!typeAllocation[asset.type]) {
      typeAllocation[asset.type] = 0;
    }
    typeAllocation[asset.type] += asset.valueUSD;
  }

  return typeAllocation;
}

function buildPieChartData(
  typeAllocation: Record<string, number>,
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

export default function PortfolioSummary({ data, onCategoryClick }: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");

  if (!data || data.assets.length === 0) {
    return null;
  }

  const exchangeRate = data.exchangeRate > 0 ? data.exchangeRate : 6.9444;

  const aggregatedAssets = useMemo(
    () => aggregateAssets(data.assets, isZh),
    [data.assets, isZh]
  );
  const typeAllocation = useMemo(
    () => buildTypeAllocation(data.assets),
    [data.assets]
  );
  const pieChartData = useMemo(
    () => buildPieChartData(typeAllocation, isZh),
    [typeAllocation, isZh]
  );

  const displayValue =
    currencyDisplay === "CNY" ? data.totalValueCNY : data.totalValueUSD;

  return (
    <div className="space-y-6">
      <PortfolioValueCard
        isZh={isZh}
        currencyDisplay={currencyDisplay}
        onCurrencyChange={setCurrencyDisplay}
        displayValue={displayValue}
        assetCount={aggregatedAssets.length}
        holdingCount={data.assets.length}
        exchangeRate={exchangeRate}
        typeCount={Object.keys(typeAllocation).length}
      />
      <PortfolioAllocationCard
        isZh={isZh}
        currencyDisplay={currencyDisplay}
        exchangeRate={exchangeRate}
        totalValueUSD={data.totalValueUSD}
        typeAllocation={typeAllocation}
        pieChartData={pieChartData}
        onCategoryClick={onCategoryClick}
      />
    </div>
  );
}
