import {
  eachHourOfInterval,
  eachDayOfInterval,
  format,
  getMonth,
  isAfter,
  startOfDay,
  subDays,
  subHours,
} from "date-fns";

import type {
  AxisLabelMode,
  ChartDataPoint,
  ChartStats,
  PortfolioHistoryRecord,
  SelectedPointInfo,
  TimeRange,
} from "./types";

export function getHistoryDays(timeRange: TimeRange) {
  switch (timeRange) {
    case "24h":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "1y":
      return 365;
    case "all":
      return 3650;
  }
}

export function buildChartData(
  rawHistory: PortfolioHistoryRecord[],
  timeRange: TimeRange
) {
  if (timeRange === "24h") {
    const rangeEnd = new Date();
    const rangeStart = subHours(rangeEnd, 24);
    const sortedHistory = rawHistory
      .map(item => ({
        timestamp: new Date(item.timestamp),
        totalValue: parseFloat(String(item.totalValue)),
      }))
      .filter(item => !isAfter(rangeStart, item.timestamp))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const chartData =
      sortedHistory.length > 0
        ? sortedHistory.map(item => ({
            timestamp: item.timestamp,
            totalValue: item.totalValue,
            formattedDate: format(item.timestamp, "HH:mm"),
            dateKey: item.timestamp.toISOString(),
          }))
        : eachHourOfInterval({ start: rangeStart, end: rangeEnd }).map(
            hour => ({
              timestamp: hour,
              totalValue: 0,
              formattedDate: format(hour, "HH:mm"),
              dateKey: hour.toISOString(),
            })
          );

    return {
      chartData,
      firstDataDateKey: chartData[0]?.dateKey ?? null,
      assetAddDayFormatted: chartData[0]?.formattedDate,
      assetAddDayValue: chartData[0]?.totalValue,
    };
  }

  const byDay = new Map<string, { timestamp: Date; totalValue: number }>();

  for (const item of rawHistory) {
    const date = new Date(item.timestamp);
    const key = format(startOfDay(date), "yyyy-MM-dd");
    const existing = byDay.get(key);

    if (!existing || date.getTime() >= existing.timestamp.getTime()) {
      byDay.set(key, {
        timestamp: date,
        totalValue: parseFloat(String(item.totalValue)),
      });
    }
  }

  const firstDataDateKey =
    byDay.size > 0 ? Array.from(byDay.keys()).sort()[0] : null;
  const firstDataDate = firstDataDateKey
    ? startOfDay(new Date(`${firstDataDateKey}T00:00:00`))
    : null;

  const daysCount = getHistoryDays(timeRange);
  const rangeEnd = startOfDay(new Date());
  const rangeStart = startOfDay(subDays(rangeEnd, daysCount - 1));

  let chartData: ChartDataPoint[];

  if (timeRange === "1y") {
    const byMonth = new Map<string, number>();

    for (const [dateKey, { totalValue }] of Array.from(byDay.entries())) {
      byMonth.set(dateKey.slice(0, 7), totalValue);
    }

    const effectiveStart =
      firstDataDate && firstDataDate > rangeStart ? firstDataDate : rangeStart;
    const allDays = eachDayOfInterval({ start: effectiveStart, end: rangeEnd });
    const monthKeys = new Map<string, Date>();

    for (const day of allDays) {
      const monthKey = format(day, "yyyy-MM");
      if (!monthKeys.has(monthKey)) {
        monthKeys.set(monthKey, day);
      }
    }

    chartData = Array.from(monthKeys.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, day]) => ({
        timestamp: day,
        totalValue: byMonth.get(monthKey) ?? 0,
        formattedDate: String(getMonth(day) + 1),
        dateKey: monthKey,
      }));
  } else {
    const effectiveStart =
      firstDataDate && firstDataDate > rangeStart ? firstDataDate : rangeStart;
    const allDays = eachDayOfInterval({ start: effectiveStart, end: rangeEnd });
    let lastKnownValue = 0;

    chartData = allDays.map(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      const record = byDay.get(dateKey);
      const totalValue = record ? record.totalValue : lastKnownValue;

      if (record) {
        lastKnownValue = record.totalValue;
      }

      return {
        timestamp: day,
        totalValue,
        formattedDate: format(day, "M/d"),
        dateKey,
      };
    });
  }

  const assetAddDayFormatted = firstDataDateKey
    ? (chartData.find(
        point =>
          point.dateKey === firstDataDateKey ||
          point.dateKey.startsWith(firstDataDateKey.slice(0, 7))
      )?.formattedDate ?? chartData[0]?.formattedDate)
    : chartData[0]?.formattedDate;
  const assetAddDayValue = firstDataDateKey
    ? byDay.get(firstDataDateKey)?.totalValue
    : undefined;

  return {
    chartData,
    firstDataDateKey,
    assetAddDayFormatted,
    assetAddDayValue,
  };
}

export function buildChartStats(chartData: ChartDataPoint[]): ChartStats {
  return {
    current:
      chartData.length > 0 ? chartData[chartData.length - 1].totalValue : 0,
    highest:
      chartData.length > 0 ? Math.max(...chartData.map(d => d.totalValue)) : 0,
    lowest:
      chartData.length > 0 ? Math.min(...chartData.map(d => d.totalValue)) : 0,
    average:
      chartData.length > 0
        ? chartData.reduce((sum, point) => sum + point.totalValue, 0) /
          chartData.length
        : 0,
    change:
      chartData.length > 1
        ? chartData[chartData.length - 1].totalValue - chartData[0].totalValue
        : 0,
    dataPoints: chartData.length,
  };
}

export function buildYAxisDomain(chartData: ChartDataPoint[]) {
  const values = chartData.map(point => point.totalValue);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const span = maxValue - minValue;
  const padding =
    span > 0 ? span * 0.15 : maxValue > 0 ? Math.max(maxValue * 0.02, 10) : 10;

  return {
    minValue,
    maxValue,
    span,
    yDomainMin: Math.max(0, minValue - padding),
    yDomainMax: maxValue + padding,
  };
}

export function formatYAxisTick(
  value: number,
  axisLabelMode: AxisLabelMode,
  span: number
) {
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
    const precision = axisLabelMode === "compact" ? 0 : absVal < 100000 ? 1 : 0;
    const compact = (absVal / 1000).toFixed(precision).replace(/\.0$/, "");
    return `${sign}$${compact}k`;
  }

  return `${sign}$${Math.round(absVal)}`;
}

export function getChangeColor(change: number) {
  if (change > 0) return "text-green-600 dark:text-green-400";
  if (change < 0) return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
}

export function getDataPointInfo(
  chartData: ChartDataPoint[],
  index: number
): SelectedPointInfo | null {
  if (index < 0 || index >= chartData.length) {
    return null;
  }

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
}
