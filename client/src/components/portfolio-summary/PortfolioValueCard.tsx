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
  typeCount: number;
};

export function PortfolioValueCard({
  isZh,
  currencyDisplay,
  onCurrencyChange,
  displayValue,
  assetCount,
  holdingCount,
  exchangeRate,
  typeCount,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {isZh ? "组合总价值" : "Total Portfolio Value"}
        </CardTitle>
        <Select
          value={currencyDisplay}
          onValueChange={value =>
            onCurrencyChange(value === "CNY" ? "CNY" : "USD")
          }
        >
          <SelectTrigger className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="CNY">CNY</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {currencyDisplay === "CNY" ? "¥" : "$"}
          {displayValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {isZh
            ? `共 ${assetCount} 个资产（${holdingCount} 条持仓）`
            : `${assetCount} assets (${holdingCount} holdings) tracked`}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isZh ? "美元兑人民币" : "USD to CNY"}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {exchangeRate.toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isZh ? "资产类别" : "Asset classes"}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {typeCount}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isZh ? "主要用途" : "Mode"}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {isZh ? "资产监控" : "Asset monitoring"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
