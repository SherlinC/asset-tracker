import { useMemo, useState } from "react";

import { PortfolioValueCard } from "@/components/portfolio-summary/PortfolioValueCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CurrencyDisplay,
  PortfolioData,
} from "@/components/portfolio-summary/types";
import { aggregateAssets } from "@/components/portfolio-summary/utils";
import PortfolioValueChart from "@/components/PortfolioValueChart";
import { useLanguage } from "@/hooks/useLanguage";

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";
import type { TimeRange } from "./portfolio-value-chart/types";

interface Props {
  data?: PortfolioData;
}

export default function PortfolioSummary({ data }: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [currencyDisplay, setCurrencyDisplay] =
    useState<CurrencyDisplay>("USD");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const assets = useMemo(() => data?.assets ?? [], [data?.assets]);

  const aggregatedAssets = useMemo(
    () => aggregateAssets(assets, isZh),
    [assets, isZh]
  );

  if (!data || assets.length === 0) {
    return null;
  }

  const exchangeRate =
    data.exchangeRate > 0 ? data.exchangeRate : DEFAULT_USD_CNY_RATE;

  const displayValue =
    currencyDisplay === "CNY" ? data.totalValueCNY : data.totalValueUSD;

  const timeRangeOptions: Array<{ value: TimeRange; label: string }> = isZh
    ? [
        { value: "24h", label: "1日" },
        { value: "7d", label: "1周" },
        { value: "30d", label: "1月" },
        { value: "1y", label: "1年" },
      ]
    : [
        { value: "24h", label: "1D" },
        { value: "7d", label: "1W" },
        { value: "30d", label: "1M" },
        { value: "1y", label: "1Y" },
      ];

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
          <div className="flex justify-end">
            <Select
              value={timeRange}
              onValueChange={value => setTimeRange(value as TimeRange)}
            >
              <SelectTrigger className="h-8 w-[92px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PortfolioValueChart isZh={isZh} timeRange={timeRange} />
        </div>
      </PortfolioValueCard>
    </div>
  );
}
