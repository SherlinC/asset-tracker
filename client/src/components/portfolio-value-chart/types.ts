import type { TooltipProps } from "recharts";

export type TimeRange = "24h" | "7d" | "30d" | "1y" | "all";
export type AxisLabelMode = "auto" | "compact" | "precise";

export type PortfolioHistoryRecord = {
  timestamp: Date | string;
  totalValue: string | number;
};

export type ChartDataPoint = {
  timestamp: Date;
  totalValue: number;
  formattedDate: string;
  tooltipDate: string;
  detailDate: string;
  dateKey: string;
};

export type ChartStats = {
  current: number;
  highest: number;
  lowest: number;
  average: number;
  change: number;
  dataPoints: number;
};

export type SelectedPointInfo = {
  date: string;
  value: number;
  dayChange: number;
  dayChangePercent: string;
};

export type ChartTooltipProps = TooltipProps<number, string>;
