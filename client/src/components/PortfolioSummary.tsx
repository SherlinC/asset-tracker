import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { getLocalizedAssetName } from "@/lib/assetLocalization";

interface PortfolioData {
  totalValueUSD: number;
  totalValueCNY: number;
  exchangeRate: number;
  assets: Array<{
    id: number;
    symbol: string;
    name: string;
    type: string;
    quantity: number;
    priceUSD: number;
    valueUSD: number;
    holding: unknown;
  }>;
}

interface Props {
  data?: PortfolioData;
  onCategoryClick?: (type: string) => void;
}

const TYPE_PALETTES: Record<string, string[]> = {
  currency: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
  crypto: ["#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a"],
  stock: ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"],
  fund: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
};
const GRAY_PALETTE = ["#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"];

const TYPE_ORDER: Record<string, number> = {
  currency: 0,
  crypto: 1,
  stock: 2,
  fund: 3,
};

const TYPE_LABELS_ZH: Record<string, string> = {
  currency: "货币",
  crypto: "虚拟货币",
  stock: "股票",
  fund: "基金",
};

function getTypeOrder(type: string): number {
  return TYPE_ORDER[type] ?? 4;
}

function getColorByTypeAndIndex(type: string, index: number): string {
  const palette = TYPE_PALETTES[type] ?? GRAY_PALETTE;
  return palette[Math.min(index, palette.length - 1)];
}

function getColorByType(type: string): string {
  return getColorByTypeAndIndex(type, 0);
}

export default function PortfolioSummary({ data, onCategoryClick }: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");

  const exchangeRate =
    data?.exchangeRate && data.exchangeRate > 0 ? data.exchangeRate : 6.9444;

  const bySymbol = new Map<
    string,
    { symbol: string; valueUSD: number; type: string; name: string }
  >();
  for (const asset of data?.assets ?? []) {
    const existing = bySymbol.get(asset.symbol);
    if (existing) {
      existing.valueUSD += asset.valueUSD;
    } else {
      bySymbol.set(asset.symbol, {
        symbol: asset.symbol,
        valueUSD: asset.valueUSD,
        type: asset.type,
        name: getLocalizedAssetName(asset.symbol, asset.name, isZh),
      });
    }
  }
  const aggregatedAssets = Array.from(bySymbol.values());

  const typeAllocation: Record<string, number> = {};
  (data?.assets ?? []).forEach(asset => {
    if (!typeAllocation[asset.type]) {
      typeAllocation[asset.type] = 0;
    }
    typeAllocation[asset.type] += asset.valueUSD;
  });

  const pieChartData = (Object.entries(typeAllocation) as [string, number][])
    .filter(([, value]) => value > 0)
    .sort(([a], [b]) => getTypeOrder(a) - getTypeOrder(b))
    .map(([type, value]) => ({
      name: isZh
        ? (TYPE_LABELS_ZH[type] ?? type)
        : type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(value * 100) / 100,
      type,
    }));

  if (!data || data.assets.length === 0) {
    return null;
  }

  const displayValue =
    currencyDisplay === "CNY" ? data.totalValueCNY : data.totalValueUSD;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isZh ? "组合总价值" : "Total Portfolio Value"}
          </CardTitle>
          <Select
            value={currencyDisplay}
            onValueChange={value => setCurrencyDisplay(value as "USD" | "CNY")}
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
            {(displayValue || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {isZh
              ? `共 ${aggregatedAssets.length} 个资产（${data.assets.length} 条持仓）`
              : `${aggregatedAssets.length} assets (${data.assets.length} holdings) tracked`}
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
                {Object.keys(typeAllocation).length}
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
                        currencyDisplay === "CNY"
                          ? value * exchangeRate
                          : value;
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
                      {`${((value / data.totalValueUSD) * 100).toFixed(2)}%`}
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
    </div>
  );
}
