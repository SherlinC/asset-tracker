import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getColorByType } from "./constants";

import type { CurrencyDisplay, PieChartDatum } from "./types";

type Props = {
  isZh: boolean;
  currencyDisplay: CurrencyDisplay;
  exchangeRate: number;
  pieChartData: PieChartDatum[];
  onCategoryClick?: (type: string) => void;
};

export function PortfolioAllocationCard({
  isZh,
  currencyDisplay,
  exchangeRate,
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
          <div className="flex flex-col gap-6 items-center">
            <div className="w-full">
              <ResponsiveContainer width="100%" height={200}>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
