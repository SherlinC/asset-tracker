import { useEffect, useMemo, useRef, useState } from "react";
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
import { getLocalizedAssetName } from "@/lib/assetLocalization";
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

type BowlParticleKind = "dot" | "dash";

type BowlParticleTarget = {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  color: string;
  kind: BowlParticleKind;
  length?: number;
};

type BowlParticleSeed = {
  x: number;
  y: number;
  z: number;
  sway: number;
  flicker: number;
};

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function rotateY(x: number, z: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: x * cos - z * sin,
    z: z * cos + x * sin,
  };
}

function createEllipsePoints({
  cx,
  cy,
  rx,
  ry,
  count,
  zScale,
  kind = "dot",
  color,
  size,
  alpha,
  start = 0,
  end = Math.PI * 2,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  count: number;
  zScale: number;
  kind?: BowlParticleKind;
  color: string;
  size: number;
  alpha: number;
  start?: number;
  end?: number;
}): BowlParticleTarget[] {
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0 : index / (count - 1);
    const angle = start + (end - start) * t;

    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      z: Math.sin(angle) * zScale,
      size,
      alpha,
      color,
      kind,
      length: kind === "dash" ? 5 : undefined,
    };
  });
}

function createNoodleBowlTargets(selectedIndex: number): BowlParticleTarget[] {
  const targets: BowlParticleTarget[] = [];

  targets.push(
    ...createEllipsePoints({
      cx: 0,
      cy: 16,
      rx: 56,
      ry: 14,
      count: 44,
      zScale: 38,
      color: "#fcd34d",
      size: 1.9,
      alpha: 0.86,
      kind: "dash",
    })
  );

  targets.push(
    ...createEllipsePoints({
      cx: 0,
      cy: 32,
      rx: 44,
      ry: 10,
      count: 34,
      zScale: 24,
      color: "#f59e0b",
      size: 1.5,
      alpha: 0.4,
    })
  );

  for (let row = 0; row < 6; row += 1) {
    const progress = row / 5;
    const width = lerp(44, 20, progress);
    const height = lerp(18, 34, progress);
    const y = lerp(30, 74, progress);
    const start = Math.PI * 0.06;
    const end = Math.PI * 0.94;

    targets.push(
      ...createEllipsePoints({
        cx: 0,
        cy: y,
        rx: width,
        ry: height,
        count: 18,
        zScale: 16 - row * 1.6,
        color: row < 2 ? "#f59e0b" : "#d97706",
        size: 1.4,
        alpha: lerp(0.42, 0.18, progress),
        start,
        end,
      })
    );
  }

  for (let strand = 0; strand < 7; strand += 1) {
    const offsetX = -30 + strand * 10;
    const phase = strand * 0.75;

    for (let step = 0; step < 13; step += 1) {
      const t = step / 12;
      const x = offsetX + Math.sin(t * Math.PI * 1.4 + phase) * 10;
      const y = -10 + t * 38 + Math.cos(t * Math.PI + phase) * 3;
      const z = Math.cos(t * Math.PI * 1.3 + phase) * 18;

      targets.push({
        x,
        y,
        z,
        size: t > 0.7 ? 1.5 : 1.8,
        alpha: 0.72,
        color: step % 3 === 0 ? "#fde68a" : "#fcd34d",
        kind: step % 2 === 0 ? "dash" : "dot",
        length: 6,
      });
    }
  }

  for (let strand = 0; strand < 3; strand += 1) {
    for (let step = 0; step < 12; step += 1) {
      const t = step / 11;
      const angle = -0.9 + strand * 0.9 + t * 0.55;

      targets.push({
        x: Math.cos(angle) * (18 + strand * 4),
        y: -18 - t * 16,
        z: Math.sin(angle) * 16,
        size: 1.2,
        alpha: lerp(0.26, 0.08, t),
        color: "#fef3c7",
        kind: "dot",
      });
    }
  }

  const orbitRadius = 74;
  for (let index = 0; index < 4; index += 1) {
    const angle = -0.7 + index * 0.54;
    const active = index === selectedIndex;
    targets.push({
      x: Math.cos(angle) * orbitRadius,
      y: Math.sin(angle) * 12 - 8,
      z: Math.sin(angle) * 28,
      size: active ? 2.8 : 1.7,
      alpha: active ? 0.92 : 0.38,
      color: active ? "#f59e0b" : "#fcd34d",
      kind: "dot",
    });
  }

  return targets;
}

function GoldNoodleParticleScene({ selectedIndex }: { selectedIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targets = useMemo(
    () => createNoodleBowlTargets(selectedIndex),
    [selectedIndex]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const media =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const reducedMotion = media?.matches ?? false;
    const seeds: BowlParticleSeed[] = targets.map((_, index) => {
      const theta = (index / targets.length) * Math.PI * 2.4;
      const radius = 84 + (index % 11) * 7;
      const lift = -18 + (index % 9) * 7;

      return {
        x: Math.cos(theta) * radius,
        y: Math.sin(theta * 1.35) * 22 + lift,
        z: Math.sin(theta * 0.8) * 70,
        sway: 0.7 + (index % 7) * 0.16,
        flicker: index * 0.37,
      };
    });

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let start = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * dpr));
      canvas.height = Math.max(1, Math.round(bounds.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      if (!start) start = now;

      const elapsed = now - start;
      const intro = reducedMotion ? 1 : clamp(elapsed / 1800, 0, 1);
      const settle = easeOutCubic(intro);
      const spin = reducedMotion ? 0.18 : elapsed * 0.00075;
      const shimmer = elapsed * 0.0012;

      context.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + 8;

      const sorted = targets
        .map((target, index) => {
          const rotated = rotateY(target.x, target.z, spin);
          const seed = seeds[index];
          const x = lerp(
            seed.x + Math.cos(shimmer * seed.sway) * 5,
            rotated.x,
            settle
          );
          const y = lerp(
            seed.y + Math.sin(shimmer * 0.9 + seed.flicker) * 4,
            target.y,
            settle
          );
          const z = lerp(seed.z, rotated.z, settle);

          return { ...target, x, y, z, flicker: seed.flicker };
        })
        .sort((left, right) => left.z - right.z);

      for (const particle of sorted) {
        const perspective = 260 / (260 + particle.z + 140);
        const flatness = 0.76 + perspective * 0.38;
        const screenX = centerX + particle.x * perspective;
        const screenY = centerY + particle.y * perspective * flatness;
        const depthAlpha = clamp(0.16 + perspective * 1.08, 0, 1);
        const glowAlpha =
          particle.alpha *
          depthAlpha *
          (0.88 + Math.sin(shimmer + particle.flicker) * 0.12);
        const size = Math.max(0.7, particle.size * perspective * 1.18);

        context.strokeStyle = particle.color;
        context.fillStyle = particle.color;
        context.globalAlpha = glowAlpha;
        context.shadowBlur = reducedMotion ? 0 : size * 8;
        context.shadowColor = particle.color;
        context.lineWidth = Math.max(0.8, size * 0.72);

        if (particle.kind === "dash") {
          context.beginPath();
          context.moveTo(
            screenX - (particle.length ?? 5) * 0.5 * perspective,
            screenY
          );
          context.lineTo(
            screenX + (particle.length ?? 5) * 0.5 * perspective,
            screenY
          );
          context.stroke();
        } else {
          context.beginPath();
          context.arc(screenX, screenY, size, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.shadowBlur = 0;
      context.globalAlpha = 1;
      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    frameId = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [targets]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(251,191,36,0.12),transparent_28%),radial-gradient(circle_at_50%_65%,rgba(245,158,11,0.08),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-y-[18%] left-1/2 w-[44%] -translate-x-1/2 rounded-full border border-amber-200/10 blur-sm" />
    </div>
  );
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
  const selectedLocationIndex = Math.max(
    locations.findIndex(location => location.id === selectedLocationId),
    0
  );
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
        @keyframes noodle-pulse { 0%, 100% { opacity: .45; transform: scale(1); } 50% { opacity: 1; transform: scale(1.16); } }
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
              ? "把总资产映射成城市生存半径。金色粒子会先聚拢成一碗面，再以克制的立体节奏缓慢旋转，右侧面板展示你的实时消费火力与续航。"
              : "Map total assets into a city survival radius. Gold particles gather into a noodle bowl, then rotate with a restrained 3D rhythm while the right panel shows your live consumption firepower and runway."}
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
                      ? "当前主视角城市，粒子主视觉与统计面板已同步。"
                      : "Active city node. Particle scene and metrics are synchronized."
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
            <div className="absolute inset-[18%] rounded-full bg-amber-500/5 blur-3xl" />

            <div className="relative h-[76%] w-[76%] overflow-hidden rounded-full border border-amber-300/25 bg-[radial-gradient(circle_at_30%_30%,_rgba(253,230,138,0.06),_rgba(120,53,15,0.12)_28%,_rgba(30,15,5,0.6)_68%,_rgba(2,6,23,0.98)_100%)] shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <GoldNoodleParticleScene selectedIndex={selectedLocationIndex} />
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
        name: getLocalizedAssetName(asset.symbol, asset.name, isZh),
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
