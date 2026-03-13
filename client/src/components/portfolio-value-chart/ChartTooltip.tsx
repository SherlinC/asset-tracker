import type { ChartTooltipProps } from "./types";

type Props = {
  active?: ChartTooltipProps["active"];
  payload?: ChartTooltipProps["payload"];
  label?: ChartTooltipProps["label"];
  formatUSD: (value: number) => string;
  isZh: boolean;
};

export function ChartTooltip({
  active,
  payload,
  label,
  formatUSD,
  isZh,
}: Props) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-lg border bg-background px-3 py-2 shadow-md"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <p className="text-xs text-muted-foreground">
        {isZh ? "时间" : "Time"}:{" "}
        {String(payload[0]?.payload?.tooltipDate ?? label ?? "")}
      </p>
      <p className="font-semibold">{formatUSD(payload[0]?.value ?? 0)}</p>
      <p className="text-xs text-muted-foreground">
        {isZh
          ? "点击图表可固定查看该点详情"
          : "Click on chart to pin this point"}
      </p>
    </div>
  );
}
