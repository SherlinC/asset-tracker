import { useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

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
  allocation?: Record<string, number>;
  totalValue?: number;
}

interface Props {
  data?: PortfolioData;
}

const COLORS = {
  currency: "#3b82f6",
  crypto: "#f59e0b",
  stock: "#10b981",
  BTC: "#f7931a",
  ETH: "#627eea",
  USDT: "#26a17b",
  BNB: "#f3ba2f",
  XRP: "#23292f",
  ADA: "#0033ad",
  SOL: "#9945ff",
  DOGE: "#ba9f33",
  MATIC: "#8247e5",
};

export default function PortfolioSummary({ data }: Props) {
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");

  // 城市 → 一碗面均价（元），用于趣味换算
  const LOCATIONS = [
    { id: "chengdu", name: "成都", priceCNY: 15 },
    { id: "beijing", name: "北京", priceCNY: 22 },
    { id: "shanghai", name: "上海", priceCNY: 20 },
    { id: "shenzhen", name: "深圳", priceCNY: 18 },
  ] as const;
  const [locationId, setLocationId] = useState<string>("chengdu");
  const BOWLS_PER_DAY = 3;
  const BOWLS_PER_YEAR = BOWLS_PER_DAY * 365;
  const noodlePriceCNY =
    LOCATIONS.find(l => l.id === locationId)?.priceCNY ?? 15;
  // 年通胀率（如 0.03 = 3%），用于计算考虑涨价后实际可吃碗数与年数
  const INFLATION_RATE = 0.03;

  const { data: priceData, isLoading: isPriceLoading } =
    trpc.prices.fetchSingle.useQuery(
      { symbol: "USD", type: "currency" },
      { enabled: true, refetchInterval: 5 * 60 * 1000 }
    );
  const exchangeRate =
    priceData?.priceCNY && priceData.priceCNY > 0
      ? priceData.priceCNY
      : data?.exchangeRate && data.exchangeRate > 0
        ? data.exchangeRate
        : 6.9444;
  const isLoadingRate = isPriceLoading;

  if (!data || data.assets.length === 0) {
    return null;
  }

  // Aggregate same asset (e.g. multiple ETH holdings) by symbol: one row per symbol with summed value
  const bySymbol = new Map<
    string,
    { symbol: string; valueUSD: number; type: string; name: string }
  >();
  for (const asset of data.assets) {
    const key = asset.symbol;
    const existing = bySymbol.get(key);
    if (existing) {
      existing.valueUSD += asset.valueUSD;
    } else {
      bySymbol.set(key, {
        symbol: asset.symbol,
        valueUSD: asset.valueUSD,
        type: asset.type,
        name: asset.name,
      });
    }
  }
  const aggregatedAssets = Array.from(bySymbol.values());

  const allocationByAsset = aggregatedAssets.map(asset => ({
    name: asset.symbol,
    value: asset.valueUSD,
    type: asset.type,
    displayName: asset.symbol,
  }));

  const pieChartData = allocationByAsset.map(item => ({
    name: item.displayName,
    value: Math.round(item.value * 100) / 100,
  }));

  // Calculate type-based allocation for summary cards
  const typeAllocation: Record<string, number> = {};
  data.assets.forEach(asset => {
    if (!typeAllocation[asset.type]) {
      typeAllocation[asset.type] = 0;
    }
    typeAllocation[asset.type] += asset.valueUSD;
  });

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Total value in USD from API, convert to display currency
  const displayValue =
    currencyDisplay === "CNY" ? data?.totalValueCNY : data?.totalValueUSD;

  // Get color for asset
  const getAssetColor = (symbol: string) => {
    return COLORS[symbol as keyof typeof COLORS] || "#6b7280";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Value Card */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Portfolio Value
          </CardTitle>
          <Select
            value={currencyDisplay}
            onValueChange={value => setCurrencyDisplay(value as "USD" | "CNY")}
          >
            <SelectTrigger className="w-20 h-8">
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
          <p className="text-xs text-muted-foreground mt-2">
            {aggregatedAssets.length} assets ({data.assets.length} holdings)
            tracked
          </p>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Exchange Rate (USD to CNY)
            </p>
            <p className="text-sm font-semibold text-foreground">
              1 USD = {exchangeRate.toFixed(4)} CNY
            </p>
            {isLoadingRate && (
              <p className="text-xs text-muted-foreground mt-1">Updating...</p>
            )}
          </div>
          {/* 一碗面趣味换算 - Linear/Notion 风格居中 */}
          {(() => {
            const totalCNY = (data?.totalValueUSD ?? 0) * exchangeRate;
            const bowls = noodlePriceCNY > 0 ? totalCNY / noodlePriceCNY : 0;
            const years = BOWLS_PER_YEAR > 0 ? bowls / BOWLS_PER_YEAR : 0;
            const bowlsLabel =
              bowls >= 1e6
                ? `${(bowls / 1e6).toFixed(1)} 百万碗`
                : bowls >= 1e4
                  ? `${(bowls / 1e4).toFixed(1)} 万碗`
                  : `${bowls.toFixed(0)} 碗`;
            const yearsLabel =
              years >= 1 ? `${years.toFixed(1)} 年` : `${years.toFixed(2)} 年`;

            // 考虑通胀：每年面价涨 (1+r)，可吃年数 N 满足 totalCNY = BOWLS_PER_YEAR * P * ((1+r)^N - 1) / r
            const annualSpendBase = BOWLS_PER_YEAR * noodlePriceCNY;
            let yearsWithInfl = 0;
            let bowlsWithInfl = 0;
            if (annualSpendBase > 0) {
              if (INFLATION_RATE <= 0) {
                yearsWithInfl = totalCNY / annualSpendBase;
                bowlsWithInfl = yearsWithInfl * BOWLS_PER_YEAR;
              } else {
                const ratio = (totalCNY * INFLATION_RATE) / annualSpendBase;
                yearsWithInfl =
                  Math.log(1 + ratio) / Math.log(1 + INFLATION_RATE);
                bowlsWithInfl = yearsWithInfl * BOWLS_PER_YEAR;
              }
            }
            const bowlsWithInflLabel =
              bowlsWithInfl >= 1e6
                ? `${(bowlsWithInfl / 1e6).toFixed(1)} 百万碗`
                : bowlsWithInfl >= 1e4
                  ? `${(bowlsWithInfl / 1e4).toFixed(1)} 万碗`
                  : `${Math.round(bowlsWithInfl)} 碗`;
            const yearsWithInflLabel =
              yearsWithInfl >= 1
                ? `${yearsWithInfl.toFixed(1)} 年`
                : `${yearsWithInfl.toFixed(2)} 年`;

            return (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="rounded-lg bg-muted/40 border border-border/60 p-4">
                  <h3 className="text-sm font-medium text-foreground tracking-tight mb-4 pb-2 border-b border-border/60">
                    坐吃山空
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        一碗面约 ¥{noodlePriceCNY}
                      </span>
                      <Select value={locationId} onValueChange={setLocationId}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {LOCATIONS.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} ¥{loc.priceCNY}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-1">
                      <span
                        className="text-5xl leading-none select-none"
                        aria-hidden
                      >
                        🍜
                      </span>
                      <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                        {bowlsLabel}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        每天 {BOWLS_PER_DAY} 碗
                      </span>
                      <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                        {yearsLabel}
                      </span>
                    </div>
                    <div className="mt-2 pt-3 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground">
                          考虑通胀后约可吃
                        </span>
                        <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                          {bowlsWithInflLabel}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          约
                        </span>
                        <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                          {yearsWithInflLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-1">
                        假设通胀率 {(INFLATION_RATE * 100).toFixed(0)}
                        %/年，仅供参考
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Asset Allocation */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Type-based allocation summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Object.entries(typeAllocation).map(([type, value]) => {
              const displayValue =
                currencyDisplay === "CNY" ? value * exchangeRate : value;
              return (
                <div key={type} className="text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{
                      backgroundColor:
                        COLORS[type as keyof typeof COLORS] || "#6b7280",
                    }}
                  />
                  <p className="text-xs font-medium text-muted-foreground capitalize">
                    {type}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatPercent(value / data.totalValueUSD)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currencyDisplay === "CNY" ? "¥" : "$"}
                    {displayValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Pie chart showing individual assets */}
          {pieChartData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Individual Asset Breakdown
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getAssetColor(entry.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => {
                      const displayValue =
                        currencyDisplay === "CNY"
                          ? value * exchangeRate
                          : value;
                      return `${currencyDisplay === "CNY" ? "¥" : "$"}${displayValue.toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}`;
                    }}
                    labelFormatter={label => `${label}`}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={value => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Individual asset details (aggregated by symbol) */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Asset Details:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {aggregatedAssets.map(asset => {
                    const displayValue =
                      currencyDisplay === "CNY"
                        ? asset.valueUSD * exchangeRate
                        : asset.valueUSD;
                    const percentage =
                      (asset.valueUSD / data.totalValueUSD) * 100;
                    return (
                      <div
                        key={asset.symbol}
                        className="text-xs p-2 bg-muted rounded"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: getAssetColor(asset.symbol),
                              }}
                            />
                            <span className="font-medium">{asset.symbol}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {currencyDisplay === "CNY" ? "¥" : "$"}
                          {displayValue.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
