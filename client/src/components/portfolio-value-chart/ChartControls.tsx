import { Button } from "@/components/ui/button";

import {
  AXIS_LABEL_MODES,
  TIME_RANGE_VALUES,
  getAxisModeLabel,
  getTimeRangeLabel,
} from "./constants";

import type { AxisLabelMode, TimeRange } from "./types";

type Props = {
  isZh: boolean;
  timeRange: TimeRange;
  axisLabelMode: AxisLabelMode;
  onTimeRangeChange: (range: TimeRange) => void;
  onAxisLabelModeChange: (mode: AxisLabelMode) => void;
};

export function ChartControls({
  isZh,
  timeRange,
  axisLabelMode,
  onTimeRangeChange,
  onAxisLabelModeChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex gap-2">
        {TIME_RANGE_VALUES.map(range => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeRangeChange(range)}
          >
            {getTimeRangeLabel(range, isZh)}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        {AXIS_LABEL_MODES.map(mode => (
          <Button
            key={mode}
            variant={axisLabelMode === mode ? "default" : "outline"}
            size="sm"
            onClick={() => onAxisLabelModeChange(mode)}
          >
            {getAxisModeLabel(mode, isZh)}
          </Button>
        ))}
      </div>
    </div>
  );
}
