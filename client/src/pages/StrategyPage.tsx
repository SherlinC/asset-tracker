import {
  AlertTriangle,
  ArrowUp,
  Brain,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Lightbulb,
  Loader2,
  Landmark,
  Scale,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { usePriceUpdates } from "@/hooks/usePriceUpdates";
import {
  BUCKET_COLORS,
  BUCKET_LABELS,
  RECOMMENDATION_LIBRARY,
  STRATEGIES,
  getStrategyPageText,
  pickLocalized,
  type AllocationBucket,
  type AllocationMix,
  type Recommendation,
  type StrategyKey,
} from "@/lib/strategyPage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

// Import types from server
import type { LiveStrategyResponse } from "@/../server/strategyAdvisor";

type PortfolioAsset = {
  id: number;
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  priceUSD: number;
  valueUSD: number;
};

type PortfolioSummaryData = {
  totalValueUSD: number;
  totalValueCNY: number;
  exchangeRate: number;
  assets: PortfolioAsset[];
};

type RecommendationAllocation = {
  recommendation: Recommendation;
  allocationPercent: number;
  amountUSD: number;
  amountCNY: number;
};

type SimplificationAction = {
  title: string;
  detail: string;
};

type SimplificationAnalysis = {
  score: number;
  summary: string;
  smallPositions: Array<PortfolioAsset & { percentage: number }>;
  coreCandidates: Array<PortfolioAsset & { percentage: number }>;
  duplicateBuckets: Array<{
    bucket: AllocationBucket;
    count: number;
    totalPercentage: number;
  }>;
  actions: SimplificationAction[];
};

type SourceAssetAction = {
  symbol: string;
  name: string;
  percentage: number;
  sellValueUSD: number;
  sellValueCNY: number;
};

type ActionPlan = {
  step: number;
  title: string;
  action: string;
  bucket: AllocationBucket;
  targetBucket?: AllocationBucket;
  percentage: number;
  estimatedUSD: number;
  estimatedCNY: number;
  sourceAssets: SourceAssetAction[];
  recommendations: Recommendation[];
  recommendationAllocations: RecommendationAllocation[];
};

type LiveStrategyVariant = {
  summary: string;
  thesis: string;
  portfolioFit: string;
  actions: string[];
  buyIdeas: string[];
  risks: string[];
};

type LiveStrategyData = {
  generatedAt: string;
  marketSummary: string;
  marketSnapshot: string[];
  headlineDigest: string[];
  strategies: Record<StrategyKey, LiveStrategyVariant>;
};

function detectBucket(asset: PortfolioAsset): AllocationBucket {
  const label = `${asset.symbol} ${asset.name}`.toLowerCase();

  if (asset.type === "currency") {
    return "cash";
  }

  if (asset.type === "crypto") {
    return "alternatives";
  }

  if (
    asset.type === "fund" ||
    /bond|treasury|income|dividend|cash|money market|aggregate/.test(label)
  ) {
    return "fixed_income";
  }

  if (/gold|silver|metals|commodity|gld|slv|dbb/.test(label)) {
    return "alternatives";
  }

  return "equity";
}

function getCurrentAllocation(data?: PortfolioSummaryData): AllocationMix {
  const totals: AllocationMix = {
    cash: 0,
    fixed_income: 0,
    equity: 0,
    alternatives: 0,
  };

  if (!data || data.totalValueUSD <= 0) {
    return totals;
  }

  for (const asset of data.assets) {
    totals[detectBucket(asset)] += asset.valueUSD;
  }

  return {
    cash: (totals.cash / data.totalValueUSD) * 100,
    fixed_income: (totals.fixed_income / data.totalValueUSD) * 100,
    equity: (totals.equity / data.totalValueUSD) * 100,
    alternatives: (totals.alternatives / data.totalValueUSD) * 100,
  };
}

function getPortfolioSignals(data?: PortfolioSummaryData) {
  if (!data || data.totalValueUSD <= 0) {
    return [
      "先补齐现金、固收和权益三类基础仓位。",
      "持仓更完整后，策略建议会更准。",
    ];
  }

  const allocation = getCurrentAllocation(data);
  const signals: string[] = [];

  if (allocation.equity > 65) {
    signals.push("权益仓位偏高，波动和回撤风险也更高。");
  } else if (allocation.equity < 30) {
    signals.push("权益仓位偏低，长期增长引擎可能不足。");
  } else {
    signals.push("权益仓位处于中间区间，仍有优化分散空间。");
  }

  if (allocation.cash < 5) {
    signals.push("现金缓冲偏薄，再平衡空间较小。");
  } else if (allocation.cash > 25) {
    signals.push("现金占比偏高，长期资金利用率可能偏低。");
  }

  if (allocation.alternatives > 20) {
    signals.push("另类资产占比偏高，注意波动和相关性风险。");
  }

  if (signals.length === 0) {
    signals.push("当前组合整体均衡，重点放在分散和定期再平衡。");
  }

  return signals.slice(0, 2);
}

function getStrategyGap(current: AllocationMix, target: AllocationMix) {
  return (Object.keys(target) as AllocationBucket[])
    .map(bucket => ({
      bucket,
      delta: Number((target[bucket] - current[bucket]).toFixed(1)),
    }))
    .filter(item => Math.abs(item.delta) >= 5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 2);
}

function getBucketAssets(
  data: PortfolioSummaryData | undefined,
  bucket: AllocationBucket
) {
  if (!data || data.totalValueUSD <= 0) {
    return [] as Array<PortfolioAsset & { percentage: number }>;
  }

  return data.assets
    .filter(asset => detectBucket(asset) === bucket)
    .map(asset => ({
      ...asset,
      percentage: (asset.valueUSD / data.totalValueUSD) * 100,
    }))
    .sort((a, b) => b.valueUSD - a.valueUSD);
}

function pickRecommendations(bucket: AllocationBucket) {
  const library = RECOMMENDATION_LIBRARY[bucket];
  const core = library.filter(item => item.stability === "core");
  const satellite = library.filter(item => item.stability === "satellite");

  return [...core.slice(0, 1), ...satellite.slice(0, 1)].slice(0, 2);
}

function formatPercentValue(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatUsdAmount(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function formatCnyAmount(value: number) {
  return `¥${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function getFragmentationAnalysis(
  data: PortfolioSummaryData | undefined,
  language: "zh" | "en"
): SimplificationAnalysis {
  if (!data || data.totalValueUSD <= 0) {
    return {
      score: 0,
      summary:
        language === "zh"
          ? "当前持仓较少，暂时没有明显的碎片化问题。"
          : "Your portfolio is still small, so fragmentation is not yet a clear issue.",
      smallPositions: [],
      coreCandidates: [],
      duplicateBuckets: [],
      actions: [],
    };
  }

  const assets = data.assets
    .map(asset => ({
      ...asset,
      percentage: (asset.valueUSD / data.totalValueUSD) * 100,
      bucket: detectBucket(asset),
    }))
    .sort((a, b) => b.valueUSD - a.valueUSD);

  const smallPositions = assets.filter(asset => asset.percentage < 3);
  const coreCandidates = assets.slice(0, 4);
  const duplicateBuckets = (Object.keys(BUCKET_LABELS) as AllocationBucket[])
    .map(bucket => {
      const bucketAssets = assets.filter(asset => asset.bucket === bucket);
      return {
        bucket,
        count: bucketAssets.length,
        totalPercentage: bucketAssets.reduce(
          (sum, asset) => sum + asset.percentage,
          0
        ),
      };
    })
    .filter(item => item.count >= 3 && item.totalPercentage >= 15)
    .sort((a, b) => b.count - a.count);

  const score = Math.min(
    100,
    Math.round(smallPositions.length * 12 + duplicateBuckets.length * 18)
  );

  const actions: SimplificationAction[] = [];

  if (smallPositions.length > 0) {
    actions.push({
      title:
        language === "zh"
          ? `先处理 ${smallPositions.length} 个小仓位`
          : `Handle ${smallPositions.length} small positions first`,
      detail:
        language === "zh"
          ? `优先检查低于 3% 的持仓，例如 ${smallPositions
              .slice(0, 3)
              .map(asset => asset.symbol)
              .join(" / ")}。如果它们没有独立策略角色，可以考虑合并到核心仓。`
          : `Review positions below 3%, such as ${smallPositions
              .slice(0, 3)
              .map(asset => asset.symbol)
              .join(
                " / "
              )}. If they do not serve a distinct role, merge them into core holdings.`,
    });
  }

  if (duplicateBuckets.length > 0) {
    const mainBucket = duplicateBuckets[0];
    actions.push({
      title:
        language === "zh"
          ? `收敛 ${BUCKET_LABELS[mainBucket.bucket]} 重复暴露`
          : `Reduce duplicate exposure in ${BUCKET_LABELS[mainBucket.bucket]}`,
      detail:
        language === "zh"
          ? `${BUCKET_LABELS[mainBucket.bucket]} 当前有 ${mainBucket.count} 个持仓，合计约 ${formatPercentValue(mainBucket.totalPercentage)}。建议这一类只保留 1-2 个代表性核心标的，其余逐步并入。`
          : `${BUCKET_LABELS[mainBucket.bucket]} currently has ${mainBucket.count} positions totaling about ${formatPercentValue(mainBucket.totalPercentage)}. Keep 1-2 representative core holdings and gradually merge the rest.`,
    });
  }

  if (coreCandidates.length > 0) {
    actions.push({
      title:
        language === "zh"
          ? "建立核心仓 / 卫星仓结构"
          : "Build a core-and-satellite structure",
      detail:
        language === "zh"
          ? `可把 ${coreCandidates
              .slice(0, 3)
              .map(asset => asset.symbol)
              .join(
                " / "
              )} 视为核心仓候选，其余观点仓和小仓位尽量控制在组合的 20%-30% 以内。`
          : `Consider ${coreCandidates
              .slice(0, 3)
              .map(asset => asset.symbol)
              .join(
                " / "
              )} as core holding candidates, and keep tactical/small positions within roughly 20%-30% of the portfolio.`,
    });
  }

  return {
    score,
    summary:
      language === "zh"
        ? score >= 60
          ? "你的组合存在比较明显的碎片化特征：持仓数量偏多，且多个小仓位对整体贡献有限。"
          : score >= 30
            ? "你的组合有一定碎片化倾向，建议开始收敛重复仓位并明确核心仓。"
            : "你的组合整体还算集中，重点是继续保持核心仓清晰。"
        : score >= 60
          ? "Your portfolio shows clear fragmentation: too many positions and several small holdings contribute little to the whole."
          : score >= 30
            ? "Your portfolio has some fragmentation. Start consolidating overlapping positions and define the core holdings more clearly."
            : "Your portfolio is relatively concentrated already. Focus on keeping the core holdings clear.",
    smallPositions,
    coreCandidates,
    duplicateBuckets,
    actions,
  };
}

function buildRecommendationAllocations(
  recommendations: Recommendation[],
  estimatedUSD: number,
  exchangeRate: number
) {
  const weights = recommendations.map(item =>
    item.stability === "core" ? 1 : 0.6
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  return recommendations.map((recommendation, index) => {
    const allocationPercent = (weights[index] / totalWeight) * 100;
    const amountUSD = (estimatedUSD * allocationPercent) / 100;
    const amountCNY = amountUSD * exchangeRate;

    return {
      recommendation,
      allocationPercent,
      amountUSD,
      amountCNY,
    } satisfies RecommendationAllocation;
  });
}

function buildActionPlan(
  data: PortfolioSummaryData | undefined,
  current: AllocationMix,
  target: AllocationMix,
  totalValueUSD: number,
  exchangeRate: number
) {
  const overweight = (Object.keys(target) as AllocationBucket[])
    .map(bucket => ({
      bucket,
      delta: Number((current[bucket] - target[bucket]).toFixed(1)),
    }))
    .filter(item => item.delta > 3)
    .sort((a, b) => b.delta - a.delta);

  const underweight = (Object.keys(target) as AllocationBucket[])
    .map(bucket => ({
      bucket,
      delta: Number((target[bucket] - current[bucket]).toFixed(1)),
    }))
    .filter(item => item.delta > 3)
    .sort((a, b) => b.delta - a.delta);

  const actions: ActionPlan[] = [];
  let step = 1;

  overweight.forEach(source => {
    const receivers = underweight.slice(0, 2);

    if (receivers.length === 0) {
      return;
    }

    const mainReceiver = receivers[0];
    const transferPercent = Math.min(source.delta, mainReceiver.delta);
    const sourceAssetsData = getBucketAssets(data, source.bucket).slice(0, 2);
    const recommendations = pickRecommendations(mainReceiver.bucket);

    const estimatedUSD = (totalValueUSD * transferPercent) / 100;
    const estimatedCNY = estimatedUSD * exchangeRate;

    let remainingUSD = estimatedUSD;
    const sourceAssets: SourceAssetAction[] = [];

    for (const asset of sourceAssetsData) {
      if (remainingUSD <= 0) break;
      const sellValueUSD = Math.min(asset.valueUSD, remainingUSD);
      const sellValueCNY = sellValueUSD * exchangeRate;

      sourceAssets.push({
        symbol: asset.symbol,
        name: asset.name,
        percentage: (sellValueUSD / totalValueUSD) * 100,
        sellValueUSD,
        sellValueCNY,
      });
      remainingUSD -= sellValueUSD;
    }

    actions.push({
      step: step++,
      title: `降低${BUCKET_LABELS[source.bucket]}权重`,
      action: `先减持 ${sourceAssets.map(asset => asset.symbol).join(" / ") || BUCKET_LABELS[source.bucket]}，再把约 ${formatPercentValue(transferPercent)} 的仓位转入 ${BUCKET_LABELS[mainReceiver.bucket]}`,
      bucket: source.bucket,
      targetBucket: mainReceiver.bucket,
      percentage: transferPercent,
      estimatedUSD,
      estimatedCNY,
      sourceAssets,
      recommendations,
      recommendationAllocations: buildRecommendationAllocations(
        recommendations,
        estimatedUSD,
        exchangeRate
      ),
    });
  });

  underweight.forEach(targetBucket => {
    const estimatedUSD = (totalValueUSD * targetBucket.delta) / 100;
    const estimatedCNY = estimatedUSD * exchangeRate;
    const recommendations = pickRecommendations(targetBucket.bucket);
    actions.push({
      step: step++,
      title: `补足${BUCKET_LABELS[targetBucket.bucket]}配置`,
      action: `增加 ${formatPercentValue(targetBucket.delta)} 的${BUCKET_LABELS[targetBucket.bucket]}配置`,
      bucket: targetBucket.bucket,
      percentage: targetBucket.delta,
      estimatedUSD,
      estimatedCNY,
      sourceAssets: [],
      recommendations,
      recommendationAllocations: buildRecommendationAllocations(
        recommendations,
        estimatedUSD,
        exchangeRate
      ),
    });
  });

  return actions.slice(0, 2);
}

const STRATEGY_VISUALS: Record<
  StrategyKey,
  {
    icon: typeof Shield;
    activeClass: string;
    inactiveClass: string;
    badgeClass: string;
  }
> = {
  conservative: {
    icon: Shield,
    activeClass:
      "border-primary bg-primary text-primary-foreground",
    inactiveClass:
      "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    badgeClass:
      "bg-muted text-muted-foreground",
  },
  balanced: {
    icon: Scale,
    activeClass:
      "border-primary bg-primary text-primary-foreground",
    inactiveClass:
      "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    badgeClass:
      "bg-muted text-muted-foreground",
  },
  aggressive: {
    icon: Flame,
    activeClass:
      "border-primary bg-primary text-primary-foreground",
    inactiveClass:
      "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    badgeClass:
      "bg-muted text-muted-foreground",
  },
};

function FragmentationGauge({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const offset = circumference * (1 - progress);
  const colorClass =
    score < 30
      ? "text-emerald-500"
      : score < 60
        ? "text-amber-500"
        : "text-red-500";
  const trackClass =
    score < 30
      ? "text-emerald-500/15"
      : score < 60
        ? "text-amber-500/15"
        : "text-red-500/15";

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          className={`stroke-current ${trackClass}`}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`stroke-current ${colorClass}`}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-3xl font-semibold ${colorClass}`}>{score}</span>
      </div>
    </div>
  );
}

const BUCKET_BAR_COLORS: Record<AllocationBucket, string> = {
  cash: "#64748b",
  fixed_income: "#94a3b8",
  equity: "#fbbf24",
  alternatives: "#d97706",
};

export default function StrategyPage() {
  const { language } = useLanguage();
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyKey>("balanced");
  const [showActionPlan, setShowActionPlan] = useState(false);
  const text = getStrategyPageText(language);
  const portfolioData = usePortfolioData({
    includeSummary: true,
  });
  const generateStrategyMutation = trpc.strategy.generate.useMutation();
  usePriceUpdates(10 * 60 * 1000, false, portfolioData.isGuestMode);

  const currentAllocation = useMemo(
    () => getCurrentAllocation(portfolioData.summary),
    [portfolioData.summary]
  );
  const signals = useMemo(
    () => getPortfolioSignals(portfolioData.summary),
    [portfolioData.summary]
  );
  const activeStrategy = STRATEGIES[selectedStrategy];
  const biggestGaps = getStrategyGap(
    currentAllocation,
    activeStrategy.allocation
  );
  const actionPlan = useMemo(
    () =>
      buildActionPlan(
        portfolioData.summary,
        currentAllocation,
        activeStrategy.allocation,
        portfolioData.summary?.totalValueUSD ?? 0,
        portfolioData.summary?.exchangeRate ?? DEFAULT_USD_CNY_RATE
      ),
    [activeStrategy.allocation, currentAllocation, portfolioData.summary]
  );
  const simplification = useMemo(
    () => getFragmentationAnalysis(portfolioData.summary, language),
    [language, portfolioData.summary]
  );
  const allocationChartData = useMemo(
    () =>
      (Object.keys(BUCKET_LABELS) as AllocationBucket[]).map(bucket => ({
        name: BUCKET_LABELS[bucket],
        bucket,
        current: Number(currentAllocation[bucket].toFixed(1)),
        target: activeStrategy.allocation[bucket],
      })),
    [currentAllocation, activeStrategy.allocation]
  );
  const strategyRequestInput = useMemo(() => {
    if (!portfolioData.summary) {
      return null;
    }

    return {
      language,
      portfolio: {
        totalValueUSD: portfolioData.summary.totalValueUSD,
        totalValueCNY: portfolioData.summary.totalValueCNY,
        exchangeRate: portfolioData.summary.exchangeRate,
        assets: portfolioData.summary.assets.map(asset => ({
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          quantity: asset.quantity,
          priceUSD: asset.priceUSD,
          valueUSD: asset.valueUSD,
        })),
      },
    };
  }, [language, portfolioData.summary]);
  const liveStrategyData =
    (generateStrategyMutation.data as LiveStrategyResponse | undefined) ??
    undefined;
  const liveStrategy = liveStrategyData?.strategies[selectedStrategy];
  const strategyResetKey = `${language}:${portfolioData.summary?.totalValueUSD ?? 0}:${portfolioData.summary?.exchangeRate ?? 0}:${portfolioData.summary?.assets.length ?? 0}`;

  useEffect(() => {
    generateStrategyMutation.reset();
  }, [strategyResetKey]);

  const handleToggleActionPlan = () => {
    const next = !showActionPlan;
    setShowActionPlan(next);

    if (
      next &&
      strategyRequestInput &&
      !generateStrategyMutation.isPending &&
      !generateStrategyMutation.data
    ) {
      generateStrategyMutation.mutate(strategyRequestInput);
    }
  };

  return (
    <DashboardLayout
      onPortfolioChanged={async () => {
        await portfolioData.refetchAll();
      }}
    >
      <div className="space-y-6">
        <PageHeader
          title={text.title}
          description={text.subtitle}
          pillLabel={{
            icon: Brain,
            text: text.draft,
          }}
        >
          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            {text.model}
          </Badge>
        </PageHeader>

        {portfolioData.isSummaryLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {text.loading}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-primary" />
                    {text.scan}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {(Object.keys(BUCKET_LABELS) as AllocationBucket[]).map(
                      bucket => (
                        <div
                          key={bucket}
                          className="rounded-xl border bg-muted/30 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              {BUCKET_LABELS[bucket]}
                            </p>
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${BUCKET_COLORS[bucket]}`}
                            />
                          </div>
                          <p className="mt-3 text-2xl font-semibold text-foreground">
                            {currentAllocation[bucket].toFixed(1)}%
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {text.summary}
                    </div>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      {signals.map(signal => (
                        <div key={signal} className="flex gap-2">
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{signal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CircleDollarSign className="h-4 w-4 text-primary" />
                    {text.benchmark}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {text.totalPortfolio}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      $
                      {portfolioData.summary?.totalValueUSD.toLocaleString(
                        "en-US",
                        {
                          maximumFractionDigits: 0,
                        }
                      ) ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      约 ¥
                      {portfolioData.summary?.totalValueCNY.toLocaleString(
                        "en-US",
                        {
                          maximumFractionDigits: 0,
                        }
                      ) ?? 0}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-start gap-2">
                      <Landmark className="mt-0.5 h-4 w-4 text-primary" />
                      <span>
                        {language === "zh"
                          ? `汇率基准：1 USD ≈ ¥${(portfolioData.summary?.exchangeRate ?? DEFAULT_USD_CNY_RATE).toFixed(4)}`
                          : `FX baseline: 1 USD ≈ ¥${(portfolioData.summary?.exchangeRate ?? DEFAULT_USD_CNY_RATE).toFixed(4)}`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 text-primary" />
                      <span>
                        {language === "zh"
                          ? "看重点：权益权重、现金缓冲、是否过度分散。"
                          : "Focus: equity weight, cash buffer, and fragmentation."}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <CardTitle className="text-base">
                    {text.strategySuggestions}
                  </CardTitle>
                  <Button
                    onClick={handleToggleActionPlan}
                    className={cn(
                      "w-fit gap-2 transition-all",
                      showActionPlan
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                    )}
                    disabled={portfolioData.summary == null}
                  >
                    {generateStrategyMutation.isPending && showActionPlan ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {showActionPlan ? text.hidePlan : text.showPlan}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(STRATEGIES) as StrategyKey[]).map(key => {
                    const strategy = STRATEGIES[key];
                    const isActive = key === selectedStrategy;
                    const visual = STRATEGY_VISUALS[key];
                    const Icon = visual.icon;

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedStrategy(key)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? visual.activeClass
                            : visual.inactiveClass
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {strategy.label}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            isActive
                              ? "bg-background/20 text-primary-foreground"
                              : visual.badgeClass
                          )}
                        >
                          {strategy.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4 rounded-2xl border bg-muted/20 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-foreground">
                        {activeStrategy.label}
                      </h2>
                      <Badge variant="secondary">{activeStrategy.tag}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activeStrategy.description}
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm font-medium text-foreground">
                          {text.annualReturn}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {activeStrategy.expectedAnnualReturn}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {text.annualNote}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm font-medium text-foreground">
                          {text.objective}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {activeStrategy.objective}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background p-4 md:col-span-2">
                        <p className="text-sm font-medium text-foreground">
                          {text.audience}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {activeStrategy.suitableFor}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm font-medium text-foreground">
                          {text.suggestedActions}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {activeStrategy.suggestions[0]}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                        <p className="text-sm font-medium text-foreground">
                          {text.riskNote}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {activeStrategy.riskNotes[0]}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border bg-muted/20 p-5">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {text.allocationTarget}
                      </p>
                    </div>

                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={allocationChartData}
                          layout="vertical"
                          margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
                          barGap={2}
                          barCategoryGap="20%"
                        >
                          <XAxis
                            type="number"
                            domain={[0, 70]}
                            tickFormatter={v => `${v}%`}
                            tick={{
                              fontSize: 11,
                              fill: "rgba(255, 255, 255, 0.8)", // 纯白微透明
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            tick={{
                              fontSize: 12,
                              fill: "rgba(255, 255, 255, 0.8)", // 纯白微透明
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: number) => `${value}%`}
                            contentStyle={{
                              backgroundColor: "#0a0b12", // card
                              border: "1px solid rgba(245, 158, 11, 0.2)", // border
                              borderRadius: "0.5rem",
                              color: "#e2e8f0",
                              fontSize: 12,
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5)",
                            }}
                            itemStyle={{
                              color: "#e2e8f0",
                            }}
                          />
                          <Bar
                            dataKey="current"
                            name={
                              language === "zh" ? "当前" : "Current"
                            }
                            fill="#334155" // slate-700 确保对比度
                            radius={[0, 4, 4, 0]}
                          />
                          <Bar
                            dataKey="target"
                            name={
                              language === "zh" ? "目标" : "Target"
                            }
                            radius={[0, 4, 4, 0]}
                          >
                            {allocationChartData.map(entry => (
                              <Cell
                                key={entry.bucket}
                                fill={BUCKET_BAR_COLORS[entry.bucket]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#334155]" />
                        {language === "zh" ? "当前" : "Current"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                        {language === "zh" ? "目标" : "Target"}
                      </span>
                    </div>

                    <div className="rounded-xl border bg-background p-4">
                      <p className="text-sm font-medium text-foreground">
                        {text.gap}
                      </p>
                      <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                        {biggestGaps.length > 0 ? (
                          biggestGaps.map(item => (
                            <div
                              key={item.bucket}
                              className="flex items-center justify-between"
                            >
                              <span>{BUCKET_LABELS[item.bucket]}</span>
                              <span
                                className={
                                  item.delta > 0
                                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                                    : "font-medium text-amber-600 dark:text-amber-400"
                                }
                              >
                                {item.delta > 0
                                  ? `${text.increase} ${item.delta}%`
                                  : `${text.decrease} ${Math.abs(item.delta)}%`}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p>{text.closeEnough}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {showActionPlan && (
                  <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          {text.actionTitle}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {language === "zh"
                            ? `下面是按 ${activeStrategy.label} ${text.actionSubtitleSuffix}`
                            : `Below are ${activeStrategy.label} ${text.actionSubtitleSuffix}`}
                        </p>
                      </div>
                      <Badge variant="secondary">{text.firstDraft}</Badge>
                    </div>

                    {generateStrategyMutation.isPending ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>
                              {language === "zh"
                                ? "正在结合最新市场快照和财经新闻生成实时策略..."
                                : "Generating a live strategy from current market data and fresh financial headlines..."}
                            </span>
                          </div>
                        </div>
                        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                          <div className="space-y-4 rounded-xl border p-5">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-20 w-full rounded-lg" />
                            <div className="space-y-3">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                            </div>
                            <div className="space-y-3">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                            </div>
                          </div>
                          <div className="space-y-4 rounded-xl border p-5">
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-5 w-36" />
                              <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                            <Skeleton className="h-20 w-full rounded-lg" />
                            <div className="space-y-3">
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                            <div className="space-y-3">
                              <Skeleton className="h-16 w-full rounded-lg" />
                              <Skeleton className="h-16 w-full rounded-lg" />
                              <Skeleton className="h-16 w-full rounded-lg" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {generateStrategyMutation.error ? (
                      <div className="rounded-xl border border-destructive/30 bg-background p-4 text-sm text-muted-foreground">
                        {language === "zh"
                          ? `实时 AI 策略生成失败：${generateStrategyMutation.error.message}`
                          : `Live AI strategy generation failed: ${generateStrategyMutation.error.message}`}
                      </div>
                    ) : null}

                    {liveStrategyData && liveStrategy ? (
                      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                        <Card className="border-amber-200/40 bg-amber-50/30 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {language === "zh"
                                ? "实时市场上下文"
                                : "Live market context"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 text-sm">
                            <div className="rounded-xl border bg-muted/30 p-4">
                              <p className="font-medium text-foreground">
                                {liveStrategyData.marketSummary}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {language === "zh"
                                  ? "生成时间"
                                  : "Generated at"}
                                : {liveStrategyData.generatedAt}
                              </p>
                            </div>

                            <div className="rounded-xl border bg-background p-4">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {language === "zh"
                                  ? "市场快照"
                                  : "Market snapshot"}
                              </p>
                              <div className="mt-3 space-y-2 text-muted-foreground">
                                {liveStrategyData.marketSnapshot.map(
                                  (item, index) => (
                                    <div key={item} className="flex gap-2">
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                                        {index + 1}
                                      </span>
                                      <span>{item}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl border bg-background p-4">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {language === "zh"
                                  ? "新闻驱动"
                                  : "Headline drivers"}
                              </p>
                              <div className="mt-3 space-y-2 text-muted-foreground">
                                {liveStrategyData.headlineDigest.map(item => (
                                  <div key={item} className="flex gap-2">
                                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-violet-200/40 bg-violet-50/30 shadow-sm dark:border-violet-900/30 dark:bg-violet-950/10">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-3">
                              <CardTitle className="text-base">
                                {language === "zh"
                                  ? `${activeStrategy.label} 实时策略`
                                  : `${activeStrategy.label} live strategy`}
                              </CardTitle>
                              <Badge variant="outline">
                                {language === "zh"
                                  ? "基于当下行情"
                                  : "Live context"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4 text-sm">
                            <div className="rounded-xl border bg-muted/30 p-4">
                              <p className="font-medium text-foreground">
                                {liveStrategy.summary}
                              </p>
                              <p className="mt-2 text-muted-foreground">
                                {liveStrategy.thesis}
                              </p>
                            </div>

                            <div className="rounded-xl border bg-background p-4">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {language === "zh"
                                  ? "与当前组合的关系"
                                  : "Fit with current portfolio"}
                              </p>
                              <p className="mt-3 text-muted-foreground">
                                {liveStrategy.portfolioFit}
                              </p>
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-xl border bg-background p-4">
                                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  {language === "zh"
                                    ? "核心动作"
                                    : "Key actions"}
                                </p>
                                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                                  {liveStrategy.actions.map(item => (
                                    <div key={item} className="flex gap-2">
                                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-xl border bg-background p-4">
                                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
                                  <ArrowUp className="h-3.5 w-3.5" />
                                  {language === "zh"
                                    ? "关注增持方向"
                                    : "Buy / add ideas"}
                                </p>
                                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                                  {liveStrategy.buyIdeas.map(item => (
                                    <div key={item} className="flex gap-2">
                                      <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {language === "zh"
                                    ? "主要风险"
                                    : "Main risks"}
                                </p>
                                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                                  {liveStrategy.risks.map(item => (
                                    <div key={item} className="flex gap-2">
                                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : null}

                    {actionPlan.length > 0 ? (
                      <div className="grid gap-4 xl:grid-cols-3">
                        {actionPlan.map(item => (
                          <Card
                            key={`${item.title}-${item.bucket}`}
                            className="border-primary/10 shadow-sm"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">
                                  {item.title}
                                </CardTitle>
                                <Badge variant="outline">
                                  {language === "zh"
                                    ? `第 ${item.step} 步`
                                    : `${text.step} ${item.step}`}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                              <div className="rounded-xl border bg-muted/30 p-4">
                                <div className="flex items-center justify-between text-muted-foreground mb-3">
                                  <span>{text.fundAmount}</span>
                                  <div className="text-right">
                                    <span className="font-semibold text-foreground text-base">
                                      {formatUsdAmount(item.estimatedUSD)}
                                    </span>
                                    <span className="ml-2 text-xs">
                                      (约 ¥
                                      {item.estimatedCNY.toLocaleString(
                                        "en-US",
                                        { maximumFractionDigits: 0 }
                                      )}
                                      )
                                    </span>
                                  </div>
                                </div>
                                <p className="font-medium text-foreground">
                                  {item.action}
                                </p>
                              </div>

                              <div className="relative flex flex-col gap-3 rounded-xl border bg-background p-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {language === "zh"
                                      ? "买入 / 增持"
                                      : "Buy / Increase"}
                                    {item.targetBucket &&
                                      ` · ${BUCKET_LABELS[item.targetBucket]}`}
                                  </p>
                                  <div className="grid gap-2">
                                    {item.recommendationAllocations
                                      .slice(0, 2)
                                      .map(
                                        ({
                                          recommendation,
                                          allocationPercent,
                                          amountUSD,
                                          amountCNY,
                                        }) => (
                                          <div
                                            key={recommendation.symbol}
                                            className="rounded-lg border bg-primary/5 p-3"
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <div>
                                                <p className="font-medium text-foreground">
                                                  {recommendation.symbol}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {recommendation.name}
                                                </p>
                                              </div>
                                              <Badge
                                                variant="outline"
                                                className="bg-background"
                                              >
                                                {allocationPercent.toFixed(0)}%
                                              </Badge>
                                            </div>
                                            <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                                              <div>
                                                <p>{text.usdAmount}</p>
                                                <p className="mt-1 font-medium text-foreground">
                                                  {formatUsdAmount(amountUSD)}
                                                </p>
                                              </div>
                                              <div>
                                                <p>{text.cnyAmount}</p>
                                                <p className="mt-1 font-medium text-foreground">
                                                  {formatCnyAmount(amountCNY)}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-3">
                                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                {pickLocalized(
                                                  recommendation.market,
                                                  language
                                                )}
                                              </p>
                                              <Badge
                                                variant="outline"
                                                className="bg-background"
                                              >
                                                {pickLocalized(
                                                  recommendation.typeLabel,
                                                  language
                                                )}
                                              </Badge>
                                            </div>
                                          </div>
                                        )
                                      )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                        {text.noMajorGap}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  {text.simplificationTitle}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {text.simplificationSubtitle}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div className="flex flex-col items-center rounded-2xl border bg-muted/20 p-5">
                    <p className="mb-2 text-sm text-muted-foreground">
                      {text.fragmentationScore}
                    </p>
                    <FragmentationGauge score={simplification.score} />
                    <p className="mt-3 text-center text-sm text-muted-foreground">
                      {simplification.summary}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-muted/20 p-5">
                      <p className="text-sm font-medium text-foreground">
                        {text.smallPositions}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {simplification.smallPositions.length}
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {simplification.smallPositions
                          .slice(0, 4)
                          .map(asset => (
                            <div
                              key={asset.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>{asset.symbol}</span>
                              <span>
                                {formatPercentValue(asset.percentage)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-muted/20 p-5">
                      <p className="text-sm font-medium text-foreground">
                        {text.duplicateExposure}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {simplification.duplicateBuckets.length}
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {simplification.duplicateBuckets
                          .slice(0, 3)
                          .map(item => (
                            <div key={item.bucket}>
                              <div className="flex items-center justify-between gap-2">
                                <span>{BUCKET_LABELS[item.bucket]}</span>
                                <span>{item.count}</span>
                              </div>
                              <p className="text-xs">
                                {formatPercentValue(item.totalPercentage)}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-muted/20 p-5">
                      <p className="text-sm font-medium text-foreground">
                        {text.coreCandidates}
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {simplification.coreCandidates
                          .slice(0, 4)
                          .map(asset => (
                            <div
                              key={asset.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>{asset.symbol}</span>
                              <span>
                                {formatPercentValue(asset.percentage)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background p-5">
                  <p className="text-sm font-medium text-foreground">
                    {text.simplificationActions}
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {simplification.actions.map(action => (
                      <div
                        key={action.title}
                        className="rounded-xl border bg-muted/20 p-4"
                      >
                        <p className="font-medium text-foreground">
                          {action.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {action.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
