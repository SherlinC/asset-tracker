import { useMemo, useState } from "react";

import { AnimatedGlobe } from "@/components/noodles/AnimatedGlobe";
import { useLanguage } from "@/hooks/useLanguage";
import { pickLocalizedText } from "@/lib/navigation";
import {
  NOODLE_LOCATIONS,
  NOODLE_PANEL_TEXT,
  type NoodleLocation,
} from "@/lib/noodle";
import { trpc } from "@/lib/trpc";

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

type PortfolioData = {
  totalValueUSD: number;
  totalValueCNY: number;
  exchangeRate: number;
};

type Props = {
  data?: PortfolioData;
  className?: string;
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

export default function NoodlePanel({ data, className }: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [locationId, setLocationId] = useState<string>("chengdu");

  const noodlePriceCNY =
    NOODLE_LOCATIONS.find(location => location.id === locationId)?.priceCNY ??
    15;

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
        : DEFAULT_USD_CNY_RATE;

  const noodleVizData = useMemo(() => {
    const totalValueUSD = data?.totalValueUSD ?? 0;
    const totalValueCNY = totalValueUSD * exchangeRate;
    const bowlsToday = noodlePriceCNY > 0 ? totalValueCNY / noodlePriceCNY : 0;

    const records = (historyQuery.data ?? [])
      .map(record => ({
        t: new Date(record.timestamp).getTime(),
        v: parseFloat(record.totalValue),
      }))
      .filter(record => Number.isFinite(record.t) && Number.isFinite(record.v))
      .sort((a, b) => a.t - b.t);
    const latest = records.length > 0 ? records[records.length - 1] : null;
    const prev = records.length > 1 ? records[records.length - 2] : null;
    const deltaUSD = latest && prev ? latest.v - prev.v : null;
    const deltaCNY = deltaUSD != null ? deltaUSD * exchangeRate : null;

    return {
      totalValueCNY,
      bowlsToday,
      bowlsDelta:
        deltaCNY != null && noodlePriceCNY > 0
          ? deltaCNY / noodlePriceCNY
          : null,
    };
  }, [data?.totalValueUSD, exchangeRate, historyQuery.data, noodlePriceCNY]);

  const selectedLocation =
    NOODLE_LOCATIONS.find(location => location.id === locationId) ??
    NOODLE_LOCATIONS[0];
  const yearsAtThreeBowls = noodleVizData.bowlsToday / 3 / 365;
  const bowlsInflationAdjusted = noodleVizData.bowlsToday / Math.pow(1.03, 10);

  const getLocationName = (location: NoodleLocation) =>
    pickLocalizedText(location.name, isZh);

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(217,119,6,0.12),_transparent_22%),linear-gradient(135deg,_rgba(2,6,23,1),_rgba(15,10,5,0.98)_42%,_rgba(4,4,6,1))] p-4 text-white/90 shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_24px_60px_-24px_rgba(217,119,6,0.3)] sm:p-5 ${className ?? ""}`}
    >
      <style>{`
        @keyframes noodle-pulse { 0%, 100% { opacity: .45; transform: scale(1); } 50% { opacity: 1; transform: scale(1.16); } }
      `}</style>

      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-amber-300/80">
            {pickLocalizedText(NOODLE_PANEL_TEXT.eyebrow, isZh)}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {pickLocalizedText(NOODLE_PANEL_TEXT.title, isZh)}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
            {pickLocalizedText(NOODLE_PANEL_TEXT.description, isZh)}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-amber-400/20 bg-white/[0.03] px-5 py-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">
            {pickLocalizedText(NOODLE_PANEL_TEXT.totalAssets, isZh)}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white sm:text-3xl">
            ¥
            {noodleVizData.totalValueCNY.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="mt-1.5 text-xs text-white/60">
            {isPriceLoading
              ? pickLocalizedText(NOODLE_PANEL_TEXT.fxUpdating, isZh)
              : isZh
                ? `按 1 USD = ${exchangeRate.toFixed(4)} CNY 换算。`
                : `1 USD = ${exchangeRate.toFixed(4)} CNY`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(320px,1fr)_320px]">
        <div className="space-y-3">
          {NOODLE_LOCATIONS.map((location, index) => {
            const selected = location.id === locationId;

            return (
              <button
                key={location.id}
                type="button"
                onClick={() => setLocationId(location.id)}
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
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                        {pickLocalizedText(NOODLE_PANEL_TEXT.node, isZh)}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {getLocationName(location)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-amber-100">
                    ¥{location.priceCNY}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-amber-400/15 bg-transparent px-4 py-6 sm:px-6">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(245,158,11,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative mx-auto h-full w-full min-h-[320px]">
            <div className="absolute inset-4 flex items-center justify-center sm:inset-6">
              <div className="h-full w-auto max-w-full aspect-square overflow-hidden rounded-2xl bg-transparent">
                <AnimatedGlobe
                  selectedCityName={selectedLocation?.name.zh ?? "成都"}
                  className="absolute inset-0 h-full w-full"
                  autoRotate={false}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-amber-400/20 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300/80">
              {pickLocalizedText(NOODLE_PANEL_TEXT.todayCapacity, isZh)}
            </p>
            <div className="mt-4 text-[2.2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.8rem]">
              {isZh
                ? formatBowlsZh(noodleVizData.bowlsToday)
                : formatBowlsEn(noodleVizData.bowlsToday)}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-amber-100">
                {getLocationName(selectedLocation)}
              </span>
              <span
                className={`${
                  noodleVizData.bowlsDelta != null &&
                  noodleVizData.bowlsDelta >= 0
                    ? "text-emerald-300"
                    : "text-rose-300"
                }`}
              >
                {noodleVizData.bowlsDelta == null
                  ? pickLocalizedText(
                      NOODLE_PANEL_TEXT.noYesterdayComparison,
                      isZh
                    )
                  : isZh
                    ? `较昨日 ${noodleVizData.bowlsDelta >= 0 ? "+" : "-"}${formatBowlsZh(Math.abs(noodleVizData.bowlsDelta)).replace(" 碗", "")} 碗`
                    : `vs yesterday ${noodleVizData.bowlsDelta >= 0 ? "+" : "-"}${formatBowlsEn(Math.abs(noodleVizData.bowlsDelta)).replace(" bowls", "")} bowls`}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                {pickLocalizedText(NOODLE_PANEL_TEXT.threeBowlsPerDay, isZh)}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {yearsAtThreeBowls.toFixed(1)}{" "}
                {pickLocalizedText(NOODLE_PANEL_TEXT.yearsUnit, isZh)}
              </p>
              <p className="mt-2 text-xs text-white/60">
                {pickLocalizedText(NOODLE_PANEL_TEXT.runwayDescription, isZh)}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4 shadow-[0_0_40px_rgba(245,158,11,0.06)]">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">
                {pickLocalizedText(NOODLE_PANEL_TEXT.inflationStress, isZh)}
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {isZh
                  ? formatBowlsZh(bowlsInflationAdjusted)
                  : formatBowlsEn(bowlsInflationAdjusted)}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/65">
                {pickLocalizedText(
                  NOODLE_PANEL_TEXT.inflationDescription,
                  isZh
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
