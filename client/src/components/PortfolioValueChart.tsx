import {
  eachDayOfInterval,
  format,
  getMonth,
  startOfDay,
  subDays,
} from "date-fns";
import { useCallback, useRef, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

import type { TooltipProps } from "recharts";

type TimeRange = "7d" | "30d" | "1y" | "all";
type AxisLabelMode = "auto" | "compact" | "precise";

interface Props {
  onAssetHover?: (assetId?: number) => void;
  highlightedAssetId?: number;
}

export default function PortfolioValueChart({
  onAssetHover,
  highlightedAssetId,
}: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [axisLabelMode, setAxisLabelMode] = useState<AxisLabelMode>("auto");
  const [selectedDataPoint, setSelectedDataPoint] = useState<number | null>(
    null
  );
  const lastHoveredIndexRef = useRef<number | null>(null);

  // Get portfolio value history
  const historyQuery = trpc.portfolioHistory.get.useQuery({
    days:
      timeRange === "7d"
        ? 7
        : timeRange === "30d"
          ? 30
          : timeRange === "1y"
            ? 365
            : 3650,
  });

  void onAssetHover;
  void highlightedAssetId;

  const rawHistory = historyQuery.data || [];
  const byDay = new Map<string, { timestamp: Date; totalValue: number }>();
  for (const item of rawHistory) {
    const d = new Date(item.timestamp);
    const key = format(startOfDay(d), "yyyy-MM-dd");
    const existing = byDay.get(key);
    if (!existing || d.getTime() >= existing.timestamp.getTime()) {
      byDay.set(key, { timestamp: d, totalValue: parseFloat(item.totalValue) });
    }
  }
  const firstDataDateKey =
    byDay.size > 0 ? Array.from(byDay.keys()).sort()[0] : null;
  const firstDataDate = firstDataDateKey
    ? startOfDay(new Date(`${firstDataDateKey}T00:00:00`))
    : null;

  const daysCount =
    timeRange === "7d"
      ? 7
      : timeRange === "30d"
        ? 30
        : timeRange === "1y"
          ? 365
          : 3650;
  const rangeEnd = startOfDay(new Date());
  const rangeStart = startOfDay(subDays(rangeEnd, daysCount - 1));

  let chartData: {
    timestamp: Date;
    totalValue: number;
    formattedDate: string;
    dateKey: string;
  }[];

  if (timeRange === "1y") {
    const byMonth = new Map<string, number>();
    for (const [dateKey, { totalValue }] of Array.from(byDay.entries())) {
      const monthKey = dateKey.slice(0, 7);
      byMonth.set(monthKey, totalValue);
    }
    const effectiveStart =
      firstDataDate && firstDataDate > rangeStart ? firstDataDate : rangeStart;
    const allDays = eachDayOfInterval({ start: effectiveStart, end: rangeEnd });
    const monthKeys = new Map<string, Date>();
    for (const day of allDays) {
      const monthKey = format(day, "yyyy-MM");
      if (!monthKeys.has(monthKey)) monthKeys.set(monthKey, day);
    }
    const sortedMonths = Array.from(monthKeys.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    chartData = sortedMonths.map(([monthKey, day]) => {
      const v = byMonth.get(monthKey) ?? 0;
      return {
        timestamp: day,
        totalValue: v,
        formattedDate: String(getMonth(day) + 1),
        dateKey: monthKey,
      };
    });
  } else {
    const effectiveStart =
      firstDataDate && firstDataDate > rangeStart ? firstDataDate : rangeStart;
    const allDays = eachDayOfInterval({ start: effectiveStart, end: rangeEnd });
    let lastKnownValue = 0;
    chartData = allDays.map(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      const record = byDay.get(dateKey);
      const totalValue = record ? record.totalValue : lastKnownValue;
      if (record) lastKnownValue = record.totalValue;
      const formattedDate = format(day, "M/d");
      return {
        timestamp: day,
        totalValue,
        formattedDate,
        dateKey,
      };
    });
  }

  const assetAddDayFormatted = firstDataDateKey
    ? (chartData.find(
        d =>
          d.dateKey === firstDataDateKey ||
          d.dateKey.startsWith(firstDataDateKey.slice(0, 7))
      )?.formattedDate ?? chartData[0]?.formattedDate)
    : chartData[0]?.formattedDate;
  const assetAddDayValue = firstDataDateKey
    ? byDay.get(firstDataDateKey)?.totalValue
    : undefined;

  // Calculate statistics
  const stats = {
    current:
      chartData.length > 0 ? chartData[chartData.length - 1].totalValue : 0,
    highest:
      chartData.length > 0 ? Math.max(...chartData.map(d => d.totalValue)) : 0,
    lowest:
      chartData.length > 0 ? Math.min(...chartData.map(d => d.totalValue)) : 0,
    average:
      chartData.length > 0
        ? chartData.reduce((sum, d) => sum + d.totalValue, 0) / chartData.length
        : 0,
    change:
      chartData.length > 1
        ? chartData[chartData.length - 1].totalValue - chartData[0].totalValue
        : 0,
    dataPoints: chartData.length,
  };

  const values = chartData.map(d => d.totalValue);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const span = maxValue - minValue;
  const padding =
    span > 0 ? span * 0.15 : maxValue > 0 ? Math.max(maxValue * 0.02, 10) : 10;
  const yDomainMin = Math.max(0, minValue - padding);
  const yDomainMax = maxValue + padding;
  const trendColor = stats.change >= 0 ? "#22c55e" : "#ef4444";
  const formatYAxisTick = (value: number) => {
    if (value === 0) return "$0";
    const absVal = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (axisLabelMode === "precise") {
      return `${sign}$${Math.round(absVal).toLocaleString("en-US")}`;
    }

    if (axisLabelMode === "auto" && span < 50000) {
      return `${sign}$${Math.round(absVal).toLocaleString("en-US")}`;
    }

    if (absVal >= 1000000) {
      return `${sign}$${(absVal / 1000000).toFixed(1)}M`;
    }

    if (absVal >= 1000) {
      const precision =
        axisLabelMode === "compact" ? 0 : absVal < 100000 ? 1 : 0;
      const compact = (absVal / 1000).toFixed(precision).replace(/\.0$/, "");
      return `${sign}$${compact}k`;
    }

    return `${sign}$${Math.round(absVal)}`;
  };

  const formatUSD = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 dark:text-green-400";
    if (change < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  // Get data point info
  const getDataPointInfo = (index: number) => {
    if (index < 0 || index >= chartData.length) return null;
    const point = chartData[index];
    const prevPoint = index > 0 ? chartData[index - 1] : null;
    const dayChange = prevPoint ? point.totalValue - prevPoint.totalValue : 0;
    const dayChangePercent = prevPoint
      ? ((dayChange / prevPoint.totalValue) * 100).toFixed(2)
      : "0.00";

    return {
      date: point.formattedDate,
      value: point.totalValue,
      dayChange,
      dayChangePercent,
    };
  };

  const selectedPointInfo =
    selectedDataPoint !== null ? getDataPointInfo(selectedDataPoint) : null;

  const handleChartClick = useCallback(
    (state: { activeTooltipIndex?: number }) => {
      const index = state?.activeTooltipIndex ?? lastHoveredIndexRef.current;
      if (typeof index === "number" && index >= 0) {
        setSelectedDataPoint(index);
      }
    },
    []
  );

  const handleChartMouseMove = useCallback(
    (state: { activeTooltipIndex?: number }) => {
      if (typeof state?.activeTooltipIndex === "number") {
        lastHoveredIndexRef.current = state.activeTooltipIndex;
      }
    },
    []
  );

  const CustomTooltip = useCallback(
    ({ active, payload, label }: TooltipProps<number, string>) => {
      if (!active || !payload?.length) return null;
      return (
        <div
          className="rounded-lg border bg-background px-3 py-2 shadow-md"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <p className="text-xs text-muted-foreground">日期: {label}</p>
          <p className="font-semibold">{formatUSD(payload[0]?.value ?? 0)}</p>
          <p className="text-xs text-muted-foreground">
            点击图表可固定查看该点详情
          </p>
        </div>
      );
    },
    [formatUSD]
  );

  return (
    <div className="space-y-6">
      {/* Chart Description */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>图表说明：</strong>{" "}
          此图表展示您的投资组合总价值随时间的变化趋势。每一天只展示当天最后一次记录下来的资产总和，
          因此同一天新增多个资产时，图上会显示当天新增后的总资产值。点击图表上的数据点可查看该日期的详细信息。
          下方表格中的资产与此图表联动 -
          当您修改持仓时，下次数据记录将反映这些变化。
        </p>
      </div>

      {/* Selected Data Point Info */}
      {selectedPointInfo && (
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
              选中日期详情
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
              onClick={() => setSelectedDataPoint(null)}
            >
              取消选择
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  日期
                </p>
                <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  {selectedPointInfo.date}
                </p>
              </div>
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  组合价值
                </p>
                <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  {formatUSD(selectedPointInfo.value)}
                </p>
              </div>
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  较前日
                </p>
                <p
                  className={`text-lg font-semibold ${getChangeColor(selectedPointInfo.dayChange)}`}
                >
                  {selectedPointInfo.dayChange >= 0 ? "+" : ""}
                  {formatUSD(selectedPointInfo.dayChange)} (
                  {selectedPointInfo.dayChangePercent}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {isZh ? "组合价值走势" : "Portfolio Value Trend"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isZh
                ? `${stats.dataPoints} 个数据点 · 点击图表查看详情`
                : `${stats.dataPoints} data points • Click on chart to see details`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2">
              {(["7d", "30d", "1y", "all"] as TimeRange[]).map(range => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setTimeRange(range);
                    setSelectedDataPoint(null);
                  }}
                >
                  {range === "7d"
                    ? isZh ? "7天" : "7D"
                    : range === "30d"
                      ? isZh ? "30天" : "30D"
                      : range === "1y"
                        ? isZh ? "1年" : "1Y"
                        : isZh ? "全部" : "All"}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {(
                [
                  ["auto", isZh ? "Y: 自动" : "Y: Auto"],
                  ["compact", isZh ? "Y: 紧凑" : "Y: Compact"],
                  ["precise", isZh ? "Y: 精确" : "Y: Precise"],
                ] as const
              ).map(([mode, label]) => (
                <Button
                  key={mode}
                  variant={axisLabelMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAxisLabelMode(mode)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              {isZh ? "正在加载图表数据..." : "Loading chart data..."}
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="mb-2">
                  {isZh ? "暂无组合价值历史" : "No portfolio value history available"}
                </p>
                <p className="text-xs">
                  {isZh
                    ? "添加资产后，系统将开始记录并在此展示组合价值走势。"
                    : "Start adding assets to your portfolio and the chart will begin tracking your progress."}
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={chartData}
                onClick={handleChartClick}
                onMouseMove={handleChartMouseMove}
                margin={{ top: 52, right: 20, bottom: 20, left: 64 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={trendColor}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={trendColor}
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                {chartData.length > 0 &&
                  firstDataDateKey &&
                  assetAddDayFormatted && (
                    <ReferenceLine
                      x={assetAddDayFormatted}
                      stroke="#059669"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                    />
                  )}
                {assetAddDayFormatted != null &&
                  typeof assetAddDayValue === "number" && (
                    <ReferenceDot
                      x={assetAddDayFormatted}
                      y={assetAddDayValue}
                      r={6}
                      fill="#059669"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      label={{
                        value: formatUSD(assetAddDayValue),
                        position: "top",
                        fill: "#047857",
                        fontSize: 11,
                        offset: 22,
                      }}
                    />
                  )}
                <XAxis
                  dataKey="formattedDate"
                  minTickGap={28}
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  domain={[yDomainMin, yDomainMax]}
                  tickFormatter={formatYAxisTick}
                />
                <Tooltip
                  content={CustomTooltip}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke={trendColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  isAnimationActive={true}
                  dot={{
                    r: 4,
                    fill: trendColor,
                    strokeWidth: 2,
                    stroke: "hsl(var(--background))",
                  }}
                  activeDot={{
                    r: 6,
                    fill: trendColor,
                    strokeWidth: 2,
                    stroke: "hsl(var(--background))",
                    cursor: "pointer",
                  }}
                />
                {selectedDataPoint !== null && chartData[selectedDataPoint] && (
                  <ReferenceDot
                    x={chartData[selectedDataPoint].formattedDate}
                    y={chartData[selectedDataPoint].totalValue}
                    r={8}
                    fill="#2563eb"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Data Recording Note */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>数据记录说明：</strong>{" "}
          系统会自动记录您的投资组合价值。每次添加、修改或删除持仓时，下次数据记录将反映最新的投资组合价值。
          建议定期查看此图表以监控您的投资表现。
        </p>
      </div>
    </div>
  );
}
