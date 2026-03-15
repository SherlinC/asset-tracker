import { useMemo, useState } from "react";

import {
  getColorByType,
  getTypeOrder,
  TYPE_LABELS_ZH,
} from "@/components/portfolio-summary/constants";
import { PortfolioValueCard } from "@/components/portfolio-summary/PortfolioValueCard";
import type {
  CurrencyDisplay,
  PortfolioData,
} from "@/components/portfolio-summary/types";
import {
  aggregateAssets,
  buildTypeAllocation,
} from "@/components/portfolio-summary/utils";
import PortfolioValueChart from "@/components/PortfolioValueChart";
import { useLanguage } from "@/hooks/useLanguage";

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

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

  if (!data || assets.length === 0) {
    return null;
  }

  const exchangeRate =
    data.exchangeRate > 0 ? data.exchangeRate : DEFAULT_USD_CNY_RATE;

  const displayValue =
    currencyDisplay === "CNY" ? data.totalValueCNY : data.totalValueUSD;

  return (
    <div>
      <PortfolioValueCard
        isZh={isZh}
        currencyDisplay={currencyDisplay}
        onCurrencyChange={setCurrencyDisplay}
        displayValue={displayValue}
        assetCount={aggregatedAssets.length}
        holdingCount={assets.length}
        exchangeRate={exchangeRate}
      >
        <div className="space-y-4">
          <PortfolioValueChart isZh={isZh} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(typeAllocation)
              .sort(([a], [b]) => getTypeOrder(a) - getTypeOrder(b))
              .map(([type, value]) => {
                const converted =
                  currencyDisplay === "CNY" ? value * exchangeRate : value;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onCategoryClick?.(type)}
                    className="rounded-lg border border-transparent p-3 text-center transition-colors hover:border-border hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col items-center justify-center gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getColorByType(type) }}
                      />
                      <p className="text-sm font-medium capitalize text-muted-foreground">
                        {isZh ? (TYPE_LABELS_ZH[type] ?? type) : type}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-foreground">
                        {`${((value / data.totalValueUSD) * 100).toFixed(2)}%`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currencyDisplay === "CNY" ? "¥" : "$"}
                        {converted.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </PortfolioValueCard>
    </div>
  );
}
