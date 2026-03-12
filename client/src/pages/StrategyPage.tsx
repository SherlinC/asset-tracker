import {
  Brain,
  ChevronRight,
  CircleDollarSign,
  Lightbulb,
  Landmark,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
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

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

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

export default function StrategyPage() {
  const { language } = useLanguage();
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyKey>("balanced");
  const [showActionPlan, setShowActionPlan] = useState(false);
  usePriceUpdates(10 * 60 * 1000);
  const text = getStrategyPageText(language);
  const portfolioSummary = trpc.portfolio.summary.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
  });

  const currentAllocation = useMemo(
    () => getCurrentAllocation(portfolioSummary.data),
    [portfolioSummary.data]
  );
  const signals = useMemo(
    () => getPortfolioSignals(portfolioSummary.data),
    [portfolioSummary.data]
  );
  const activeStrategy = STRATEGIES[selectedStrategy];
  const biggestGaps = getStrategyGap(
    currentAllocation,
    activeStrategy.allocation
  );
  const actionPlan = useMemo(
    () =>
      buildActionPlan(
        portfolioSummary.data,
        currentAllocation,
        activeStrategy.allocation,
        portfolioSummary.data?.totalValueUSD ?? 0,
        portfolioSummary.data?.exchangeRate ?? DEFAULT_USD_CNY_RATE
      ),
    [activeStrategy.allocation, currentAllocation, portfolioSummary.data]
  );
  const simplification = useMemo(
    () => getFragmentationAnalysis(portfolioSummary.data, language),
    [language, portfolioSummary.data]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4" />
              {text.draft}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              {text.title}
            </h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">
              {text.subtitle}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit gap-1 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            {text.model}
          </Badge>
        </div>

        {portfolioSummary.isLoading ? (
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
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
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
                      {portfolioSummary.data?.totalValueUSD.toLocaleString(
                        "en-US",
                        {
                          maximumFractionDigits: 0,
                        }
                      ) ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      约 ¥
                      {portfolioSummary.data?.totalValueCNY.toLocaleString(
                        "en-US",
                        {
                          maximumFractionDigits: 0,
                        }
                      ) ?? 0}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-start gap-2">
                      <Landmark className="mt-0.5 h-4 w-4 text-violet-500" />
                      <span>
                        {language === "zh"
                          ? `汇率基准：1 USD ≈ ¥${(portfolioSummary.data?.exchangeRate ?? DEFAULT_USD_CNY_RATE).toFixed(4)}`
                          : `FX baseline: 1 USD ≈ ¥${(portfolioSummary.data?.exchangeRate ?? DEFAULT_USD_CNY_RATE).toFixed(4)}`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 text-emerald-500" />
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
                    onClick={() => setShowActionPlan(value => !value)}
                    className="w-fit gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {showActionPlan ? text.hidePlan : text.showPlan}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STRATEGIES) as StrategyKey[]).map(key => {
                    const strategy = STRATEGIES[key];
                    const isActive = key === selectedStrategy;

                    return (
                      <Button
                        key={key}
                        variant={isActive ? "default" : "outline"}
                        onClick={() => setSelectedStrategy(key)}
                        className="min-w-28"
                      >
                        {strategy.label}
                      </Button>
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

                    <div className="space-y-4">
                      {(Object.keys(BUCKET_LABELS) as AllocationBucket[]).map(
                        bucket => (
                          <div key={bucket} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {BUCKET_LABELS[bucket]}
                              </span>
                              <span className="font-medium text-foreground">
                                {activeStrategy.allocation[bucket]}%
                              </span>
                            </div>
                            <Progress
                              value={activeStrategy.allocation[bucket]}
                            />
                          </div>
                        )
                      )}
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
                  <div className="rounded-2xl border bg-muted/20 p-5">
                    <p className="text-sm text-muted-foreground">
                      {text.fragmentationScore}
                    </p>
                    <p className="mt-2 text-4xl font-semibold text-foreground">
                      {simplification.score}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
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
