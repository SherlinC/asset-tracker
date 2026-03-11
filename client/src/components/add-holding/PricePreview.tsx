import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PriceData = {
  priceUSD: number;
  priceCNY: number;
  change24h: number;
};

type Props = {
  selectedAssetSymbol: string;
  isLoading: boolean;
  priceData: PriceData | undefined;
  currencyDisplay: "USD" | "CNY";
  setCurrencyDisplay: (value: "USD" | "CNY") => void;
  currentPrice: number | undefined;
  quantity: string;
  totalValue: number;
};

export function PricePreview({
  selectedAssetSymbol,
  isLoading,
  priceData,
  currencyDisplay,
  setCurrencyDisplay,
  currentPrice,
  quantity,
  totalValue,
}: Props) {
  if (!selectedAssetSymbol) {
    return null;
  }

  return (
    <>
      <Card className="bg-muted/50 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Fetching real-time price...</span>
          </div>
        ) : priceData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Price</p>
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
                  onClick={() => setCurrencyDisplay("USD")}
                >
                  USD
                </Button>
                <Button
                  type="button"
                  variant={currencyDisplay === "CNY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrencyDisplay("CNY")}
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
                24h Change: {priceData.change24h >= 0 ? "+" : ""}
                {priceData.change24h.toFixed(2)}%
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to fetch price</p>
        )}
      </Card>

      {currentPrice && quantity && (
        <Card className="border-accent/20 bg-accent/10 p-3">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-xl font-semibold">
            {currencyDisplay === "USD" ? "$" : "¥"}
            {totalValue.toFixed(2)}
          </p>
        </Card>
      )}
    </>
  );
}
