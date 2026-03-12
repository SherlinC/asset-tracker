import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getChangeColor } from "./utils";

import type { SelectedPointInfo } from "./types";

type Props = {
  selectedPointInfo: SelectedPointInfo | null;
  formatUSD: (value: number) => string;
  onClear: () => void;
  isZh: boolean;
};

export function SelectedPointDetails({
  selectedPointInfo,
  formatUSD,
  onClear,
  isZh,
}: Props) {
  if (!selectedPointInfo) {
    return null;
  }

  return (
    <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
          {isZh ? "选中时间详情" : "Selected point details"}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          onClick={onClear}
        >
          {isZh ? "取消选择" : "Clear"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {isZh ? "时间" : "Time"}
            </p>
            <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              {selectedPointInfo.date}
            </p>
          </div>
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {isZh ? "组合价值" : "Portfolio value"}
            </p>
            <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              {formatUSD(selectedPointInfo.value)}
            </p>
          </div>
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {isZh ? "较前点" : "Vs previous point"}
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
  );
}
