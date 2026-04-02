import { AlertTriangle, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { CurrencyDisplay, PriceData } from "./types";

type Props = {
  isZh: boolean;
  selectedAssetSymbol: string;
  isLoading: boolean;
  priceData: PriceData | undefined;
  currencyDisplay: CurrencyDisplay;
  onCurrencyDisplayChange: (value: CurrencyDisplay) => void;
  currentPrice: number | undefined;
  quantity: string;
  totalValue: number;
};

export function PricePreview({
  isZh,
  selectedAssetSymbol,
  isLoading,
  priceData,
  currencyDisplay,
  onCurrencyDisplayChange,
  currentPrice,
  quantity,
  totalValue,
}: Props) {
  const text = isZh
    ? {
        fetchingPrice: "正在获取实时价格...",
        currentPrice: "当前价格",
        change24h: "24小时涨跌",
        source: "行情源",
        unableToFetchPrice: "无法获取价格",
        missingConfigTitle: "缺少行情源配置",
        missingConfigEmpty:
          "当前环境未配置 EODHD_API_KEY，且 Morningstar / Yahoo 的公开回退在当前网络环境不可用，国际基金价格暂时无法获取。",
        missingConfigCache:
          "当前环境未配置 EODHD_API_KEY，实时国际基金价格不可用，当前正在显示缓存价格。",
        totalValue: "总价值",
      }
    : {
        fetchingPrice: "Fetching real-time price...",
        currentPrice: "Current Price",
        change24h: "24h Change",
        source: "Source",
        unableToFetchPrice: "Unable to fetch price",
        missingConfigTitle: "Missing market data configuration",
        missingConfigEmpty:
          "EODHD_API_KEY is not configured, and the public Morningstar / Yahoo fallbacks are unavailable in this network environment, so international fund prices are unavailable.",
        missingConfigCache:
          "EODHD_API_KEY is not configured, so live international fund prices are unavailable and cached prices are shown instead.",
        totalValue: "Total Value",
      };
  const hasPrice =
    priceData != null && (priceData.priceUSD > 0 || priceData.priceCNY > 0);
  const showMissingConfig = priceData?.issueCode === "missing_eodhd_api_key";
  const sourceLabelMap = isZh
    ? {
        onvista: "Onvista",
        jpm_official: "JPM Official",
        jpm_factsheet: "JPM Factsheet",
        eodhd: "EODHD",
        morningstar: "Morningstar",
        yahoo: "Yahoo",
        cache: "缓存",
      }
    : {
        onvista: "Onvista",
        jpm_official: "JPM Official",
        jpm_factsheet: "JPM Factsheet",
        eodhd: "EODHD",
        morningstar: "Morningstar",
        yahoo: "Yahoo",
        cache: "Cache",
      };
  const resolvedSourceLabel = priceData?.marketDataSource
    ? sourceLabelMap[priceData.marketDataSource]
    : priceData?.source === "cache"
      ? sourceLabelMap.cache
      : null;

  if (!selectedAssetSymbol) {
    return null;
  }

  return (
    <>
      <Card className="bg-muted/50 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{text.fetchingPrice}</span>
          </div>
        ) : hasPrice ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {text.currentPrice}
                </p>
                <p className="text-2xl font-bold">
                  {currencyDisplay === "USD" ? "$" : "¥"}
                  {currentPrice?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={currencyDisplay === "USD" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCurrencyDisplayChange("USD")}
                >
                  USD
                </Button>
                <Button
                  type="button"
                  variant={currencyDisplay === "CNY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCurrencyDisplayChange("CNY")}
                >
                  CNY
                </Button>
              </div>
            </div>
            {priceData.change24h !== undefined && (
              <p
                className={`text-sm ${
                  priceData.change24h >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {text.change24h}: {priceData.change24h >= 0 ? "+" : ""}
                {priceData.change24h.toFixed(2)}%
              </p>
            )}
            {resolvedSourceLabel ? (
              <p className="text-sm text-muted-foreground">
                {text.source}: {resolvedSourceLabel}
              </p>
            ) : null}
          </div>
        ) : showMissingConfig ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{text.missingConfigTitle}</AlertTitle>
            <AlertDescription>
              {priceData?.source === "cache"
                ? text.missingConfigCache
                : text.missingConfigEmpty}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">
            {text.unableToFetchPrice}
          </p>
        )}
      </Card>

      {showMissingConfig && hasPrice && priceData?.source === "cache" ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{text.missingConfigTitle}</AlertTitle>
          <AlertDescription>{text.missingConfigCache}</AlertDescription>
        </Alert>
      ) : null}

      {currentPrice && quantity && (
        <Card className="border-accent/20 bg-accent/10 p-3">
          <p className="text-sm text-muted-foreground">{text.totalValue}</p>
          <p className="text-xl font-semibold">
            {currencyDisplay === "USD" ? "$" : "¥"}
            {totalValue.toFixed(2)}
          </p>
        </Card>
      )}
    </>
  );
}
