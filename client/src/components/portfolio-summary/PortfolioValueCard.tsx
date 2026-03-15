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
          <SelectTrigger className="w-fit h-8 border-none shadow-none p-0 focus:ring-0 [&>svg]:opacity-100">
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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
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
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {isZh ? "美元兑人民币" : "USD to CNY"}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {exchangeRate.toFixed(4)}
              </p>
            </div>
          </div>
          <div className="w-full">
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
