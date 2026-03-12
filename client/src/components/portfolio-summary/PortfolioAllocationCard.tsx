import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getColorByType, getTypeOrder, TYPE_LABELS_ZH } from "./constants";

import type { CurrencyDisplay, PieChartDatum, TypeAllocation } from "./types";

type Props = {
  isZh: boolean;
  currencyDisplay: CurrencyDisplay;
  exchangeRate: number;
  totalValueUSD: number;
  typeAllocation: TypeAllocation;
  pieChartData: PieChartDatum[];
  onCategoryClick?: (type: string) => void;
};

export function PortfolioAllocationCard({
  isZh,
  currencyDisplay,
  exchangeRate,
  totalValueUSD,
  typeAllocation,
  pieChartData,
  onCategoryClick,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {isZh ? "资产配置" : "Asset Allocation"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pieChartData.length > 0 && (
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(payload: unknown) => {
                    const detail = payload as { type?: string };
                    if (detail?.type) onCategoryClick?.(detail.type);
                  }}
                  style={{ cursor: onCategoryClick ? "pointer" : undefined }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColorByType(entry.type)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => {
                    const amount =
                      currencyDisplay === "CNY" ? value * exchangeRate : value;
                    return `${currencyDisplay === "CNY" ? "¥" : "$"}${amount.toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`;
                  }}
                  labelFormatter={label => `${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                  className="rounded-lg border border-transparent p-3 text-center transition-colors hover:border-border hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className="mx-auto mb-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: getColorByType(type) }}
                  />
                  <p className="text-xs font-medium capitalize text-muted-foreground">
                    {isZh ? (TYPE_LABELS_ZH[type] ?? type) : type}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {`${((value / totalValueUSD) * 100).toFixed(2)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currencyDisplay === "CNY" ? "¥" : "$"}
                    {converted.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </button>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
