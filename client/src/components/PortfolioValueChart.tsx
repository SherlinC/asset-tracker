import { useCallback, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

import { ChartControls } from "./portfolio-value-chart/ChartControls";
import { ChartTooltip } from "./portfolio-value-chart/ChartTooltip";
import { SelectedPointDetails } from "./portfolio-value-chart/SelectedPointDetails";
import {
  buildChartData,
  buildChartStats,
  buildYAxisDomain,
  formatYAxisTick,
  getDataPointInfo,
  getHistoryDays,
} from "./portfolio-value-chart/utils";

import type { AxisLabelMode, TimeRange } from "./portfolio-value-chart/types";

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
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [axisLabelMode, setAxisLabelMode] = useState<AxisLabelMode>("auto");
  const [selectedDataPoint, setSelectedDataPoint] = useState<number | null>(
    null
  );
  const lastHoveredIndexRef = useRef<number | null>(null);

  const historyQuery = trpc.portfolioHistory.get.useQuery({
    days: getHistoryDays(timeRange),
  });

  void onAssetHover;
  void highlightedAssetId;

  const {
    chartData,
    firstDataDateKey,
    assetAddDayFormatted,
    assetAddDayValue,
  } = useMemo(
    () => buildChartData(historyQuery.data ?? [], timeRange),
    [historyQuery.data, timeRange]
  );
  const stats = useMemo(() => buildChartStats(chartData), [chartData]);
  const { span, yDomainMin, yDomainMax } = useMemo(
    () => buildYAxisDomain(chartData),
    [chartData]
  );
  const trendColor = stats.change >= 0 ? "#22c55e" : "#ef4444";

  const formatUSD = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  const selectedPointInfo =
    selectedDataPoint !== null
      ? getDataPointInfo(chartData, selectedDataPoint)
      : null;

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

  return (
    <div className="space-y-6">
      <SelectedPointDetails
        selectedPointInfo={selectedPointInfo}
        formatUSD={formatUSD}
        onClear={() => setSelectedDataPoint(null)}
        isZh={isZh}
      />

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
          <ChartControls
            isZh={isZh}
            timeRange={timeRange}
            axisLabelMode={axisLabelMode}
            onTimeRangeChange={range => {
              setTimeRange(range);
              setSelectedDataPoint(null);
            }}
            onAxisLabelModeChange={setAxisLabelMode}
          />
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
                  {isZh
                    ? "暂无组合价值历史"
                    : "No portfolio value history available"}
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
                  vertical={false}
                  strokeDasharray="0"
                  stroke="hsl(var(--border) / 0.4)"
                />
                {chartData.length > 0 &&
                  firstDataDateKey &&
                  assetAddDayFormatted && (
                    <ReferenceLine
                      x={assetAddDayFormatted}
                      stroke="hsl(var(--primary) / 0.5)"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  )}
                {timeRange !== "24h" &&
                  assetAddDayFormatted != null &&
                  typeof assetAddDayValue === "number" && (
                    <ReferenceDot
                      x={assetAddDayFormatted}
                      y={assetAddDayValue}
                      r={4}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  )}
                <XAxis
                  dataKey="formattedDate"
                  minTickGap={40}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[yDomainMin, yDomainMax]}
                  tickFormatter={value =>
                    formatYAxisTick(value, axisLabelMode, span)
                  }
                  dx={-10}
                />
                <Tooltip
                  content={<ChartTooltip formatUSD={formatUSD} isZh={isZh} />}
                  cursor={{
                    stroke: trendColor,
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke={trendColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  isAnimationActive={true}
                  dot={false}
                  activeDot={
                    timeRange === "24h"
                      ? false
                      : {
                          r: 5,
                          fill: trendColor,
                          strokeWidth: 2,
                          stroke: "hsl(var(--background))",
                        }
                  }
                />
                {timeRange !== "24h" &&
                  selectedDataPoint !== null &&
                  chartData[selectedDataPoint] && (
                    <ReferenceDot
                      x={chartData[selectedDataPoint].formattedDate}
                      y={chartData[selectedDataPoint].totalValue}
                      r={5}
                      fill={trendColor}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
