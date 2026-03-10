import { useMemo, useState } from "react";
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
import { useLanguage } from "@/hooks/useLanguage";
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
  /** When user clicks a category (type), scroll to holdings and focus that tab */
  onCategoryClick?: (type: string) => void;
}

// 同色系不同深浅：现金=蓝、虚拟货币=黄、股票=绿、其他=灰
const TYPE_PALETTES: Record<string, string[]> = {
  currency: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"], // 蓝 深→浅
  crypto: ["#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a"], // 黄 深→浅
  stock: ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"], // 绿 深→浅
  fund: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"], // 紫 深→浅 中国基金
};
const GRAY_PALETTE = ["#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"];

// 类型顺序：同色系排在一起，圆饼顺时针为 现金→虚拟货币→股票→其他
const TYPE_ORDER: Record<string, number> = {
  currency: 0,
  crypto: 1,
  stock: 2,
  fund: 3,
};
const TYPE_LABELS_ZH: Record<string, string> = {
  currency: "货币",
  crypto: "虚拟货币",
  stock: "股票",
  fund: "基金",
};
function getTypeOrder(type: string): number {
  return TYPE_ORDER[type] ?? 4;
}

function getColorByTypeAndIndex(type: string, index: number): string {
  const palette = TYPE_PALETTES[type] ?? GRAY_PALETTE;
  return palette[Math.min(index, palette.length - 1)];
}

function getColorByType(type: string): string {
  return getColorByTypeAndIndex(type, 0);
}

type NoodleVizProps = {
  isZh: boolean;
  locations: Array<{ id: string; name: string; priceCNY: number }>;
  noodlePriceCNY: number;
  bowlsToday: number;
  bowlsDeltaVsYesterday: number | null;
  totalValueCNY: number;
  exchangeRate: number;
  selectedLocationId: string;
  onLocationChange: (nextId: string) => void;
};

function formatBowlsZh(bowls: number): string {
  if (!Number.isFinite(bowls) || bowls <= 0) return "0 碗";
  if (bowls >= 1e6) return `${(bowls / 1e6).toFixed(1)} 百万碗`;
  if (bowls >= 1e4) return `${(bowls / 1e4).toFixed(1)} 万碗`;
  return `${bowls.toFixed(0)} 碗`;
}

function formatBowlsEn(bowls: number): string {
  if (!Number.isFinite(bowls) || bowls <= 0) return "0 bowls";
  if (bowls >= 1e6) return `${(bowls / 1e6).toFixed(1)}M bowls`;
  if (bowls >= 1e3) return `${(bowls / 1e3).toFixed(1)}K bowls`;
  return `${bowls.toFixed(0)} bowls`;
}

function NoodleViz({
  isZh,
  locations,
  noodlePriceCNY,
  bowlsToday,
  bowlsDeltaVsYesterday,
  totalValueCNY,
  exchangeRate,
  selectedLocationId,
  onLocationChange,
}: NoodleVizProps) {
  const selectedLocation =
    locations.find(location => location.id === selectedLocationId) ??
    locations[0];
  const bowlsPerWeek = bowlsToday / 7;
  const yearsAtThreeBowls = bowlsToday / 3 / 365;
  const bowlsInflationAdjusted = bowlsToday / Math.pow(1.03, 10);
  const detailCards = [
    {
      label: isZh ? "地区市场" : "Market node",
      value: selectedLocation?.name ?? (isZh ? "成都" : "Chengdu"),
      hint: isZh ? "当前面价基准" : "Current price anchor",
    },
    {
      label: isZh ? "单碗价格" : "Per bowl",
      value: `¥${noodlePriceCNY}`,
      hint: isZh ? "趣味换算单位" : "Conversion unit",
    },
    {
      label: isZh ? "总资产" : "Total capital",
      value: `¥${totalValueCNY.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })}`,
      hint: isZh ? "当前消费火力" : "Consumption power",
    },
    {
      label: isZh ? "USD/CNY" : "USD/CNY",
      value: exchangeRate.toFixed(4),
      hint: isZh ? "实时汇率" : "Live FX",
    },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(217,119,6,0.12),_transparent_22%),linear-gradient(135deg,_rgba(2,6,23,1),_rgba(15,10,5,0.98)_42%,_rgba(4,4,6,1))] p-4 text-slate-100 shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_24px_60px_-24px_rgba(217,119,6,0.3)] sm:p-5">
      <style>{`
        @keyframes noodle-globe-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes noodle-ring-drift { from { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.04); } to { transform: rotate(360deg) scale(1); } }
        @keyframes noodle-pulse { 0%, 100% { opacity: .45; transform: scale(1); } 50% { opacity: 1; transform: scale(1.16); } }
        @keyframes noodle-scan { 0% { transform: translateY(-130%); } 100% { transform: translateY(130%); } }
      `}</style>

      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-amber-300/80">
            {isZh ? "Consumption Singularity" : "Consumption Singularity"}
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {isZh ? "坐吃山空 · 赛博生存面板" : "Cyber Consumption Console"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300/85">
            {isZh
              ? "把总资产映射成城市生存半径。旋转地球会联动不同城市的面价节点，右侧面板展示你的实时消费火力与续航。"
              : "Map total assets into a city survival radius. The rotating globe links different city price nodes while the right panel shows your live consumption firepower and runway."}
          </p>
        </div>

        <Select value={selectedLocationId} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full border-amber-400/30 bg-slate-950/60 text-slate-100 shadow-[0_0_18px_rgba(245,158,11,0.12)] sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {locations.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name} ¥{loc.priceCNY}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(320px,1fr)_320px]">
        <div className="space-y-3">
          {locations.map((location, index) => {
            const selected = location.id === selectedLocationId;

            return (
              <button
                key={location.id}
                type="button"
                onClick={() => onLocationChange(location.id)}
                className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-300 ${
                  selected
                    ? "border-amber-300/50 bg-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                    : "border-white/10 bg-white/[0.03] hover:border-amber-400/30 hover:bg-white/[0.05]"
                }`}
              >
                <div
                  className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-amber-300/80 to-transparent"
                  style={{ opacity: selected ? 1 : 0.35 }}
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.9)]"
                      style={{
                        animation: `noodle-pulse ${1.5 + index * 0.18}s ease-in-out infinite`,
                      }}
                    />
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        {isZh ? "节点" : "Node"}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {location.name}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-amber-100">
                    ¥{location.priceCNY}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {selected
                    ? isZh
                      ? "当前主视角城市，地球轨道和统计面板已同步。"
                      : "Active city node. Globe orbit and metrics are synchronized."
                    : isZh
                      ? "点击切换到该城市，观察你的消费火力变化。"
                      : "Switch to this city to compare your consumption power."}
                </p>
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-amber-400/15 bg-[radial-gradient(circle_at_center,_rgba(180,83,9,0.1),_rgba(2,6,23,0.05)_42%,_transparent_70%)] px-4 py-6 sm:px-6">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(245,158,11,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center">
            <div
              className="absolute inset-[8%] rounded-full border border-amber-400/15"
              style={{ animation: "noodle-ring-drift 18s linear infinite" }}
            />
            <div
              className="absolute inset-[2%] rounded-full border border-amber-300/8"
              style={{
                animation: "noodle-ring-drift 24s linear infinite reverse",
              }}
            />
            <div className="absolute inset-[18%] rounded-full bg-amber-500/5 blur-3xl" />

            <div className="relative h-[76%] w-[76%] overflow-hidden rounded-full border border-amber-300/25 bg-[radial-gradient(circle_at_30%_30%,_rgba(253,230,138,0.06),_rgba(120,53,15,0.12)_28%,_rgba(30,15,5,0.6)_68%,_rgba(2,6,23,0.98)_100%)] shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 h-full w-full"
                style={{ animation: "noodle-globe-spin 28s linear infinite" }}
              >
                <defs>
                  <clipPath id="globeClip">
                    <circle cx="100" cy="100" r="98" />
                  </clipPath>
                </defs>
                <g clipPath="url(#globeClip)">
                  {[-60, -30, 0, 30, 60].map(lat => {
                    const y = 100 - lat * 0.9;
                    const rx = Math.cos((lat * Math.PI) / 180) * 90;
                    return (
                      <ellipse
                        key={`lat-${lat}`}
                        cx="100"
                        cy={y}
                        rx={rx}
                        ry={rx * 0.15}
                        fill="none"
                        stroke="rgba(252,211,77,0.18)"
                        strokeWidth="0.6"
                      />
                    );
                  })}
                  {[0, 30, 60, 90, 120, 150].map(lon => {
                    const rx = Math.sin((lon * Math.PI) / 180) * 90;
                    return (
                      <ellipse
                        key={`lon-${lon}`}
                        cx="100"
                        cy="100"
                        rx={Math.max(rx, 1)}
                        ry={90}
                        fill="none"
                        stroke="rgba(252,211,77,0.14)"
                        strokeWidth="0.6"
                      />
                    );
                  })}
                  <ellipse
                    cx="100"
                    cy="100"
                    rx={90}
                    ry={13}
                    fill="none"
                    stroke="rgba(245,158,11,0.3)"
                    strokeWidth="0.8"
                  />
                  {locations.map((location, index) => {
                    const coords = [
                      [116, 60],
                      [128, 76],
                      [140, 94],
                      [134, 118],
                    ][index] ?? [120, 84];
                    const selected = location.id === selectedLocationId;

                    return (
                      <g key={location.id}>
                        {selected && (
                          <circle
                            cx={coords[0]}
                            cy={coords[1]}
                            r={10}
                            fill="none"
                            stroke="rgba(245,158,11,0.25)"
                            strokeWidth="0.6"
                          />
                        )}
                        <circle
                          cx={coords[0]}
                          cy={coords[1]}
                          r={selected ? 3 : 1.8}
                          fill={selected ? "#f59e0b" : "#fcd34d"}
                          opacity={selected ? 1 : 0.6}
                        />
                        {selected && (
                          <circle
                            cx={coords[0]}
                            cy={coords[1]}
                            r={3}
                            fill="none"
                            stroke="rgba(245,158,11,0.6)"
                            strokeWidth="0.8"
                            style={{
                              animation: "noodle-pulse 2s ease-in-out infinite",
                            }}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
              <div className="absolute inset-y-0 left-[14%] w-[20%] rounded-full bg-gradient-to-r from-transparent via-amber-100/8 to-transparent blur-md" />
            </div>
          </div>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-4">
            {detailCards.map(card => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {card.value}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-amber-400/20 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300/80">
              {isZh ? "今日可吃" : "Today capacity"}
            </p>
            <div className="mt-4 text-[2.2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.8rem]">
              {isZh ? formatBowlsZh(bowlsToday) : formatBowlsEn(bowlsToday)}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-amber-100">
                {selectedLocation?.name}
              </span>
              <span
                className={`${bowlsDeltaVsYesterday != null && bowlsDeltaVsYesterday >= 0 ? "text-emerald-300" : "text-rose-300"}`}
              >
                {bowlsDeltaVsYesterday == null
                  ? isZh
                    ? "暂无昨日对比"
                    : "No yesterday comparison"
                  : isZh
                    ? `较昨日 ${bowlsDeltaVsYesterday >= 0 ? "+" : "-"}${formatBowlsZh(Math.abs(bowlsDeltaVsYesterday)).replace(" 碗", "")} 碗`
                    : `vs yesterday ${bowlsDeltaVsYesterday >= 0 ? "+" : "-"}${formatBowlsEn(Math.abs(bowlsDeltaVsYesterday)).replace(" bowls", "")} bowls`}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {isZh ? "每周火力" : "Weekly run rate"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {isZh
                  ? formatBowlsZh(bowlsPerWeek)
                  : formatBowlsEn(bowlsPerWeek)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {isZh
                  ? "按当前城市面价折算成一周可消费火力。"
                  : "Your weekly consumption power at the selected city price point."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {isZh ? "每天三碗" : "3 bowls / day"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {yearsAtThreeBowls.toFixed(1)} {isZh ? "年" : "yrs"}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {isZh
                  ? "如果每天吃三碗，你的组合理论续航时长。"
                  : "How long the portfolio theoretically lasts if you eat three bowls every day."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4 shadow-[0_0_40px_rgba(245,158,11,0.06)]">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">
              {isZh ? "通胀扰动模拟" : "Inflation stress"}
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {isZh
                ? formatBowlsZh(bowlsInflationAdjusted)
                : formatBowlsEn(bowlsInflationAdjusted)}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-300/80">
              {isZh
                ? "按 3% 年化通胀粗略折算，十年后的实际购买力会更低，这个数字帮助你感受长期消费折损。"
                : "A rough 3% inflation stress over ten years, visualizing how long-term purchasing power fades."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioSummary({ data, onCategoryClick }: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");

  // 城市 → 一碗面均价（元），用于趣味换算
  const LOCATIONS = [
    { id: "chengdu", name: "成都", priceCNY: 15 },
    { id: "beijing", name: "北京", priceCNY: 22 },
    { id: "shanghai", name: "上海", priceCNY: 20 },
    { id: "shenzhen", name: "深圳", priceCNY: 18 },
  ] as const;
  const [locationId, setLocationId] = useState<string>("chengdu");
  const noodlePriceCNY =
    LOCATIONS.find(l => l.id === locationId)?.priceCNY ?? 15;

  const { data: priceData, isLoading: isPriceLoading } =
    trpc.prices.fetchSingle.useQuery(
      { symbol: "USD", type: "currency" },
      { enabled: true, refetchInterval: 5 * 60 * 1000 }
    );
  const historyQuery = trpc.portfolioHistory.get.useQuery({ days: 2 });
  const exchangeRate =
    priceData?.priceCNY && priceData.priceCNY > 0
      ? priceData.priceCNY
      : data?.exchangeRate && data.exchangeRate > 0
        ? data.exchangeRate
        : 6.9444;
  const isLoadingRate = isPriceLoading;

  // Aggregate same asset (e.g. multiple ETH holdings) by symbol: for asset count only
  const bySymbol = new Map<
    string,
    { symbol: string; valueUSD: number; type: string; name: string }
  >();
  for (const asset of data?.assets ?? []) {
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

  // Type-level allocation for pie and summary (no per-asset breakdown)
  const typeAllocation: Record<string, number> = {};
  (data?.assets ?? []).forEach(asset => {
    if (!typeAllocation[asset.type]) {
      typeAllocation[asset.type] = 0;
    }
    typeAllocation[asset.type] += asset.valueUSD;
  });

  // Pie chart: one slice per type, ordered by TYPE_ORDER; name for display (zh/en)
  const pieChartData = (Object.entries(typeAllocation) as [string, number][])
    .filter(([, value]) => value > 0)
    .sort(([a], [b]) => getTypeOrder(a) - getTypeOrder(b))
    .map(([type, value]) => ({
      name: isZh
        ? (TYPE_LABELS_ZH[type] ?? type)
        : type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(value * 100) / 100,
      type,
    }));

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Total value in USD from API, convert to display currency
  const displayValue =
    currencyDisplay === "CNY" ? data?.totalValueCNY : data?.totalValueUSD;

  const noodleVizData = useMemo(() => {
    const totalValueUSD = data?.totalValueUSD ?? 0;
    const totalValueCNY = totalValueUSD * exchangeRate;
    const bowlsToday = noodlePriceCNY > 0 ? totalValueCNY / noodlePriceCNY : 0;

    const records = (historyQuery.data ?? [])
      .map(r => ({
        t: new Date(r.timestamp).getTime(),
        v: parseFloat(r.totalValue),
      }))
      .filter(r => Number.isFinite(r.t) && Number.isFinite(r.v) && r.v >= 0)
      .sort((a, b) => a.t - b.t);
    const latest = records.length > 0 ? records[records.length - 1] : null;
    const prev = records.length > 1 ? records[records.length - 2] : null;
    const deltaUSD = latest && prev ? latest.v - prev.v : null;
    const deltaCNY = deltaUSD != null ? deltaUSD * exchangeRate : null;
    const bowlsDelta =
      deltaCNY != null && noodlePriceCNY > 0 ? deltaCNY / noodlePriceCNY : null;

    return {
      totalValueCNY,
      bowlsToday,
      bowlsDelta,
    };
  }, [data?.totalValueUSD, exchangeRate, historyQuery.data, noodlePriceCNY]);

  if (!data || data.assets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Total Value Card */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isZh ? "组合总价值" : "Total Portfolio Value"}
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
            {isZh
              ? `共 ${aggregatedAssets.length} 个资产（${data.assets.length} 条持仓）`
              : `${aggregatedAssets.length} assets (${data.assets.length} holdings) tracked`}
          </p>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {isZh ? "汇率（美元兑人民币）" : "Exchange Rate (USD to CNY)"}
            </p>
            <p className="text-sm font-semibold text-foreground">
              1 USD = {exchangeRate.toFixed(4)} CNY
            </p>
            {isLoadingRate && (
              <p className="text-xs text-muted-foreground mt-1">
                {isZh ? "更新中..." : "Updating..."}
              </p>
            )}
          </div>
          <NoodleViz
            isZh={isZh}
            locations={LOCATIONS.map(l => ({
              id: l.id,
              name: isZh
                ? l.name
                : l.id === "chengdu"
                  ? "Chengdu"
                  : l.id === "beijing"
                    ? "Beijing"
                    : l.id === "shanghai"
                      ? "Shanghai"
                      : "Shenzhen",
              priceCNY: l.priceCNY,
            }))}
            noodlePriceCNY={noodlePriceCNY}
            bowlsToday={noodleVizData.bowlsToday}
            bowlsDeltaVsYesterday={noodleVizData.bowlsDelta}
            totalValueCNY={noodleVizData.totalValueCNY}
            exchangeRate={exchangeRate}
            selectedLocationId={locationId}
            onLocationChange={setLocationId}
          />
        </CardContent>
      </Card>

      {/* Asset Allocation / 资产配置 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isZh ? "资产配置" : "Asset Allocation"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pie chart: one slice per type (clickable) */}
          {pieChartData.length > 0 && (
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(payload: unknown) => {
                      const d = payload as { type?: string };
                      if (d?.type) onCategoryClick?.(d.type);
                    }}
                    style={{ cursor: onCategoryClick ? "pointer" : undefined }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getColorByType(entry.type)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => {
                      const displayVal =
                        currencyDisplay === "CNY"
                          ? value * exchangeRate
                          : value;
                      return `${currencyDisplay === "CNY" ? "¥" : "$"}${displayVal.toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}`;
                    }}
                    labelFormatter={label => `${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Type-based allocation summary (clickable → scroll to holdings tab) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(typeAllocation)
              .sort(([a], [b]) => getTypeOrder(a) - getTypeOrder(b))
              .map(([type, value]) => {
                const displayValue =
                  currencyDisplay === "CNY" ? value * exchangeRate : value;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onCategoryClick?.(type)}
                    className="text-center rounded-lg border border-transparent p-3 transition-colors hover:bg-muted/50 hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-2"
                      style={{
                        backgroundColor: getColorByType(type),
                      }}
                    />
                    <p className="text-xs font-medium text-muted-foreground capitalize">
                      {isZh ? (TYPE_LABELS_ZH[type] ?? type) : type}
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
                  </button>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
