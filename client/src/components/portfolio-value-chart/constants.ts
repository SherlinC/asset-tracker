import type { AxisLabelMode, TimeRange } from "./types";

export const TIME_RANGE_VALUES: TimeRange[] = ["24h", "7d", "30d", "1y", "all"];

export const AXIS_LABEL_MODES: AxisLabelMode[] = ["auto", "compact", "precise"];

export function getTimeRangeLabel(range: TimeRange, isZh: boolean) {
  switch (range) {
    case "24h":
      return isZh ? "24小时" : "24H";
    case "7d":
      return isZh ? "7天" : "7D";
    case "30d":
      return isZh ? "30天" : "30D";
    case "1y":
      return isZh ? "1年" : "1Y";
    case "all":
      return isZh ? "全部" : "All";
  }
}

export function getAxisModeLabel(mode: AxisLabelMode, isZh: boolean) {
  switch (mode) {
    case "auto":
      return isZh ? "Y: 自动" : "Y: Auto";
    case "compact":
      return isZh ? "Y: 紧凑" : "Y: Compact";
    case "precise":
      return isZh ? "Y: 精确" : "Y: Precise";
  }
}
