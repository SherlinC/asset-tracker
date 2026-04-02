import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CurrencyDisplay } from "./types";

type Props = {
  isZh: boolean;
  currencyDisplay: CurrencyDisplay;
  onCurrencyChange: (value: CurrencyDisplay) => void;
  displayValue: number;
  assetCount: number;
  holdingCount: number;
  exchangeRate: number;
  children?: React.ReactNode;
};

export function PortfolioValueCard({
  isZh,
  currencyDisplay,
  onCurrencyChange,
  displayValue,
  assetCount,
  holdingCount,
  exchangeRate,
  children,
}: Props) {
  const formatPrimaryValue = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {isZh ? "组合总价值" : "Total Portfolio Value"}
        </CardTitle>
        <Select
          value={currencyDisplay}
          onValueChange={value =>
            onCurrencyChange(value === "CNY" ? "CNY" : "USD")
          }
        >
          <SelectTrigger className="w-24 px-3 py-2 text-sm shadow-xs bg-transparent focus-visible:ring-[3px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="CNY">CNY</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-full max-w-[360px] rounded-[28px] border border-border/80 bg-background px-8 py-7">
              <p className="text-sm font-medium text-muted-foreground">
                {isZh ? "总资产" : "Total Assets"}
              </p>
              <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                {currencyDisplay === "CNY" ? "¥" : "$"}
                {formatPrimaryValue(displayValue)}
              </div>
              <div className="mt-4 text-muted-foreground">
                <p className="text-xs">
                  {isZh
                    ? `${assetCount} 个资产 · ${holdingCount} 条持仓`
                    : `${assetCount} assets · ${holdingCount} holdings`}
                </p>
              </div>
            </div>

            <div className="w-full max-w-[360px] rounded-[28px] border border-border/80 bg-background px-8 py-7">
              <p className="text-sm font-medium text-muted-foreground">
                {isZh ? "汇率基准" : "FX Baseline"}
              </p>
              <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                {`1 USD ≈ ¥${exchangeRate.toFixed(4)}`}
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {isZh
                  ? "看重点：权益权重、现金缓冲、是否过度分散。"
                  : "Focus on equity weight, cash buffer, and diversification."}
              </p>
            </div>
          </div>
          <div className="w-full">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
