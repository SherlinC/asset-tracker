import { Loader2 } from "lucide-react";

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
        unableToFetchPrice: "无法获取价格",
        totalValue: "总价值",
      }
    : {
        fetchingPrice: "Fetching real-time price...",
        currentPrice: "Current Price",
        change24h: "24h Change",
        unableToFetchPrice: "Unable to fetch price",
        totalValue: "Total Value",
      };
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
        ) : priceData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text.currentPrice}</p>
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
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{text.unableToFetchPrice}</p>
        )}
      </Card>

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
