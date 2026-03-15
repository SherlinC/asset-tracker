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

import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

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

type Props = {
  onAssetHover?: (assetId?: number) => void;
  highlightedAssetId?: number;
  isZh?: boolean;
  timeRange?: TimeRange;
};

export default function PortfolioValueChart({
  onAssetHover,
  highlightedAssetId,
  isZh,
  timeRange,
}: Props) {
  const { language } = useLanguage();
  const resolvedIsZh = isZh ?? language === "zh";
  const resolvedTimeRange: TimeRange = timeRange ?? "24h";
  const axisLabelMode: AxisLabelMode = "compact";
  const [selectedDataPoint, setSelectedDataPoint] = useState<number | null>(
    null
  );
  const lastHoveredIndexRef = useRef<number | null>(null);

  const historyQuery = trpc.portfolioHistory.get.useQuery({
    days: getHistoryDays(resolvedTimeRange),
  });

  void onAssetHover;
  void highlightedAssetId;

  const {
    chartData,
    firstDataDateKey,
    assetAddDayFormatted,
    assetAddDayValue,
  } = useMemo(
    () => buildChartData(historyQuery.data ?? [], resolvedTimeRange),
    [historyQuery.data, resolvedTimeRange]
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
    <>
      <SelectedPointDetails
        selectedPointInfo={selectedPointInfo}
        formatUSD={formatUSD}
        onClear={() => setSelectedDataPoint(null)}
        isZh={resolvedIsZh}
      />

      {historyQuery.isLoading || chartData.length === 0 ? null : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            onClick={handleChartClick}
            onMouseMove={handleChartMouseMove}
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
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
            {resolvedTimeRange !== "24h" &&
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
              width={50}
              dx={-5}
            />
            <Tooltip
              content={<ChartTooltip formatUSD={formatUSD} isZh={resolvedIsZh} />}
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
                resolvedTimeRange === "24h"
                  ? false
                  : {
                      r: 5,
                      fill: trendColor,
                      strokeWidth: 2,
                      stroke: "hsl(var(--background))",
                    }
              }
            />
            {resolvedTimeRange !== "24h" &&
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
    </>
  );
}
