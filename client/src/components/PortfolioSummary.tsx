import { useMemo, useState } from "react";

import { PortfolioAllocationCard } from "@/components/portfolio-summary/PortfolioAllocationCard";
import { PortfolioValueCard } from "@/components/portfolio-summary/PortfolioValueCard";
import type {
  CurrencyDisplay,
  PortfolioData,
} from "@/components/portfolio-summary/types";
import {
  aggregateAssets,
  buildPieChartData,
  buildTypeAllocation,
} from "@/components/portfolio-summary/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  data?: PortfolioData;
  onCategoryClick?: (type: string) => void;
}

export default function PortfolioSummary({ data, onCategoryClick }: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [currencyDisplay, setCurrencyDisplay] =
    useState<CurrencyDisplay>("USD");
  const assets = useMemo(() => data?.assets ?? [], [data?.assets]);

  const aggregatedAssets = useMemo(
    () => aggregateAssets(assets, isZh),
    [assets, isZh]
  );
  const typeAllocation = useMemo(() => buildTypeAllocation(assets), [assets]);
  const pieChartData = useMemo(
    () => buildPieChartData(typeAllocation, isZh),
    [typeAllocation, isZh]
  );

  if (!data || assets.length === 0) {
    return null;
  }

  const exchangeRate = data.exchangeRate > 0 ? data.exchangeRate : 6.9444;

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
        holdingCount={assets.length}
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
