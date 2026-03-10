import {
  ArrowDown,
  Brain,
  ChevronRight,
  CircleDollarSign,
  Lightbulb,
  Landmark,
  ShieldCheck,
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
import { trpc } from "@/lib/trpc";

type LocalizedText = {
  zh: string;
  en: string;
};

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

type StrategyKey = "conservative" | "balanced" | "aggressive";
type AllocationBucket = "cash" | "fixed_income" | "equity" | "alternatives";

type AllocationMix = Record<AllocationBucket, number>;
type Recommendation = {
  symbol: string;
  name: string;
  typeLabel: LocalizedText;
  market: LocalizedText;
  stability: "core" | "satellite";
  reason: LocalizedText;
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
  keepList: Array<PortfolioAsset & { percentage: number }>;
  mergeList: Array<PortfolioAsset & { percentage: number }>;
  watchList: Array<PortfolioAsset & { percentage: number }>;
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
  sellQuantity: number | null;
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
  sellReason: string;
  rationale: string;
  recommendations: Recommendation[];
  recommendationAllocations: RecommendationAllocation[];
};

function localizedText(zh: string, en: string): LocalizedText {
  return { zh, en };
}

function pickLocalized(text: LocalizedText, language: "zh" | "en") {
  return text[language];
}

const BUCKET_LABELS: Record<AllocationBucket, string> = {
  cash: "现金 / 货币",
  fixed_income: "固收 / 债券",
  equity: "股票 / 权益",
  alternatives: "另类资产",
};

const BUCKET_COLORS: Record<AllocationBucket, string> = {
  cash: "bg-blue-500",
  fixed_income: "bg-violet-500",
  equity: "bg-emerald-500",
  alternatives: "bg-amber-500",
};

const RECOMMENDATION_LIBRARY: Record<AllocationBucket, Recommendation[]> = {
  cash: [
    {
      symbol: "USD",
      name: "US Dollar Cash Buffer",
      typeLabel: localizedText("货币", "Currency"),
      market: localizedText("全球现金", "Global cash"),
      stability: "core",
      reason: localizedText(
        "用于保留流动性和后续再平衡空间，避免组合在波动阶段被动卖出。",
        "Keeps liquidity available for rebalancing and avoids forced selling during volatile markets."
      ),
    },
  ],
  fixed_income: [
    {
      symbol: "BND",
      name: "Vanguard Total Bond Market ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("全球核心固收参考", "Core global fixed income"),
      stability: "core",
      reason: localizedText(
        "低成本、分散度高，常被视为稳健组合里最通用的核心债券底仓之一。",
        "A low-cost, diversified bond core often used as a stable anchor in balanced portfolios."
      ),
    },
    {
      symbol: "AGG",
      name: "iShares Core U.S. Aggregate Bond ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("美国核心债券", "US core bonds"),
      stability: "core",
      reason: localizedText(
        "覆盖美国综合债市场，流动性与认可度都很高，适合作为稳健配置的替代选择。",
        "Broad US bond exposure with strong liquidity and wide adoption as a stable fixed-income option."
      ),
    },
    {
      symbol: "006327",
      name: "易方达中债3-5年国开债",
      typeLabel: localizedText("人民币基金", "RMB fund"),
      market: localizedText("中国债券基金", "China bond fund"),
      stability: "satellite",
      reason: localizedText(
        "如果你的资金主要在人民币体系内，这类中短久期债券基金更贴近日常配置场景。",
        "A practical RMB bond option when your cash flows and portfolio base are mainly in CNY."
      ),
    },
  ],
  equity: [
    {
      symbol: "VT",
      name: "Vanguard Total World Stock ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("全球股票", "Global equities"),
      stability: "core",
      reason: localizedText(
        "一只基金覆盖全球主要股票市场，是最接近‘一站式全球分散’的核心权益选择。",
        "One fund covering major global equity markets, close to a one-ticket diversified global equity core."
      ),
    },
    {
      symbol: "ACWI",
      name: "iShares MSCI ACWI ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("全球股票", "Global equities"),
      stability: "core",
      reason: localizedText(
        "覆盖发达与新兴市场，适合作为更均衡的全球权益主仓。",
        "Covers both developed and emerging markets, making it a balanced global equity core."
      ),
    },
    {
      symbol: "IVV",
      name: "iShares Core S&P 500 ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("美股宽基", "US broad market"),
      stability: "core",
      reason: localizedText(
        "适合补充核心美股大盘敞口，流动性强、费用率低、风格稳健。",
        "A strong core US large-cap choice with deep liquidity, low cost, and stable style exposure."
      ),
    },
    {
      symbol: "510300",
      name: "沪深300ETF",
      typeLabel: localizedText("人民币基金", "RMB fund"),
      market: localizedText("中国宽基", "China broad market"),
      stability: "satellite",
      reason: localizedText(
        "如果你希望保留人民币权益暴露，沪深300可作为中国市场补充仓位，而不是唯一核心仓位。",
        "Useful as supplemental China equity exposure if you want RMB assets, but better as a satellite than the only core holding."
      ),
    },
  ],
  alternatives: [
    {
      symbol: "GLD",
      name: "SPDR Gold Shares",
      typeLabel: localizedText("贵金属ETF", "Precious metals ETF"),
      market: localizedText("黄金", "Gold"),
      stability: "core",
      reason: localizedText(
        "适合在宏观不确定性较高时增加组合的非权益对冲属性。",
        "Adds a classic non-equity hedge when macro uncertainty rises."
      ),
    },
    {
      symbol: "IAU",
      name: "iShares Gold Trust",
      typeLabel: localizedText("贵金属ETF", "Precious metals ETF"),
      market: localizedText("黄金", "Gold"),
      stability: "core",
      reason: localizedText(
        "同样是黄金核心工具，适合作为稳定型对冲仓位的备选。",
        "Another core gold instrument suited to a stable hedge allocation."
      ),
    },
    {
      symbol: "518880",
      name: "黄金ETF",
      typeLabel: localizedText("人民币基金", "RMB fund"),
      market: localizedText("中国黄金ETF", "China gold ETF"),
      stability: "satellite",
      reason: localizedText(
        "如果你更方便通过人民币账户配置黄金，这类本地黄金ETF更易执行。",
        "A practical local gold option if your account and settlement base are mainly in RMB."
      ),
    },
  ],
};

const STRATEGIES: Record<
  StrategyKey,
  {
    label: string;
    tag: string;
    expectedAnnualReturn: string;
    description: string;
    objective: string;
    suitableFor: string;
    allocation: AllocationMix;
    suggestions: string[];
    riskNotes: string[];
  }
> = {
  conservative: {
    label: "保守型",
    tag: "回撤优先",
    expectedAnnualReturn: "3% - 6%",
    description: "以稳住净值波动为核心，优先保留流动性与固收缓冲。",
    objective: "更关注本金稳定、现金流和抗波动能力。",
    suitableFor: "短中期有资金使用计划，或对回撤较敏感的投资者。",
    allocation: {
      cash: 20,
      fixed_income: 45,
      equity: 25,
      alternatives: 10,
    },
    suggestions: [
      "权益仓位控制在四分之一左右，减少单一主题和高波动标的集中度。",
      "固收部分可作为组合压舱石，优先考虑债券基金、货币基金与短久期工具。",
      "保留一定现金头寸，便于应对突发流动性需求和市场大幅波动时的分批加仓。",
    ],
    riskNotes: [
      "上涨行情中，收益弹性通常低于权益型组合。",
      "若通胀抬升过快，纯防守配置的实际收益可能被侵蚀。",
    ],
  },
  balanced: {
    label: "稳健型",
    tag: "平衡增长",
    expectedAnnualReturn: "6% - 10%",
    description: "在控制回撤的基础上追求中长期增值，强调分散配置。",
    objective: "兼顾增长与稳定，适合作为大多数长期投资者的默认策略。",
    suitableFor: "有 3-5 年以上持有周期，希望稳步复利的投资者。",
    allocation: {
      cash: 10,
      fixed_income: 30,
      equity: 45,
      alternatives: 15,
    },
    suggestions: [
      "权益作为主引擎，但建议保持跨市场、跨行业分散，避免单边押注。",
      "固收用于降低净值波动，保留再平衡空间。",
      "另类资产可少量配置在黄金、商品或数字资产，用于提升组合相关性分散。",
    ],
    riskNotes: [
      "当市场同时出现股债同跌时，组合可能面临阶段性承压。",
      "另类资产占比不宜过高，否则波动会明显放大。",
    ],
  },
  aggressive: {
    label: "激进型",
    tag: "增长优先",
    expectedAnnualReturn: "10% - 15%",
    description: "强调长期资本增值，接受更高波动与更深回撤。",
    objective: "把更多仓位放在高成长权益与高波动资产上，争取更高长期收益。",
    suitableFor: "有较长投资期限、现金流稳定且能承受较大波动的投资者。",
    allocation: {
      cash: 5,
      fixed_income: 15,
      equity: 60,
      alternatives: 20,
    },
    suggestions: [
      "权益仓位提升到六成以上，但要控制高估值与高集中度风险。",
      "保留少量固收与现金作为再平衡缓冲，不建议满仓冒进。",
      "另类资产只适合作为增强仓位，单一高波动资产的暴露需要设置上限。",
    ],
    riskNotes: [
      "短期净值波动会更明显，极端市场中回撤幅度更大。",
      "如果资金使用期限缩短，激进策略会显著增加兑现时点风险。",
    ],
  },
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
      "当前组合还没有形成有效资产配置，建议先补齐现金、固收和权益三类基础仓位。",
      "第一版策略页会在你有更多持仓后给出更精确的结构化建议。",
    ];
  }

  const allocation = getCurrentAllocation(data);
  const signals: string[] = [];

  if (allocation.equity > 65) {
    signals.push("当前权益仓位偏高，收益弹性强，但波动与回撤风险也更高。");
  } else if (allocation.equity < 30) {
    signals.push("当前权益仓位偏低，组合稳定性较好，但长期增长引擎可能不足。");
  } else {
    signals.push(
      "当前权益仓位处于中间区间，具备一定增长性，也有继续优化分散的空间。"
    );
  }

  if (allocation.cash < 5) {
    signals.push("现金缓冲较薄，若市场波动扩大，再平衡空间会偏小。");
  } else if (allocation.cash > 25) {
    signals.push("现金占比偏高，安全垫充足，但长期资金利用率可能偏低。");
  }

  if (allocation.alternatives > 20) {
    signals.push("另类资产占比偏高，建议重点关注组合波动和相关性风险。");
  }

  if (signals.length === 0) {
    signals.push(
      "当前组合结构较均衡，下一步重点在于细化行业分散和定期再平衡节奏。"
    );
  }

  return signals;
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

  return [...core.slice(0, 2), ...satellite.slice(0, 1)].slice(0, 3);
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
      keepList: [],
      mergeList: [],
      watchList: [],
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
  const keepList = assets.filter(asset => asset.percentage >= 8).slice(0, 4);
  const mergeList = assets.filter(asset => asset.percentage < 3).slice(0, 5);
  const watchList = assets
    .filter(asset => asset.percentage >= 3 && asset.percentage < 8)
    .slice(0, 4);
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
    keepList,
    mergeList,
    watchList,
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
      const sellQuantity =
        asset.priceUSD > 0 ? sellValueUSD / asset.priceUSD : null;

      sourceAssets.push({
        symbol: asset.symbol,
        name: asset.name,
        percentage: (sellValueUSD / totalValueUSD) * 100,
        sellValueUSD,
        sellValueCNY,
        sellQuantity,
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
      sellReason:
        sourceAssets.length > 0
          ? `${sourceAssets[0].symbol} 在当前组合中属于该资产桶里占比最高的持仓之一，优先调整它能更快降低偏离。`
          : `当前 ${BUCKET_LABELS[source.bucket]} 权重偏高，优先从这一类资产中回收资金更合理。`,
      rationale: `你当前这一类资产高于目标策略 ${formatPercentValue(source.delta)}。先转移约 ${formatPercentValue(transferPercent)} 到最缺口的资产桶，可以更快向目标组合靠拢。`,
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
      sellReason: `当前组合在 ${BUCKET_LABELS[targetBucket.bucket]} 上明显低配，新增资金时优先补足这一类资产更有效。`,
      rationale: `当前组合在这一类资产上低于目标策略 ${formatPercentValue(targetBucket.delta)}，补足后有助于提升策略一致性。`,
      recommendations,
      recommendationAllocations: buildRecommendationAllocations(
        recommendations,
        estimatedUSD,
        exchangeRate
      ),
    });
  });

  return actions.slice(0, 3);
}

export default function StrategyPage() {
  const { language } = useLanguage();
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyKey>("balanced");
  const [showActionPlan, setShowActionPlan] = useState(false);
  usePriceUpdates(10 * 60 * 1000);
  const text =
    language === "zh"
      ? {
          draft: "AI 策略草案",
          title: "组合策略实验室",
          subtitle:
            "基于你当前的资产组合生成策略建议。这不是自动下单建议，而是帮助你审视风险偏好、仓位结构与再平衡方向的参考面板。",
          model: "市场通用三档模型：保守 / 稳健 / 激进",
          loading: "正在加载策略上下文...",
          scan: "当前组合扫描",
          summary: "AI 摘要",
          benchmark: "策略基准",
          totalPortfolio: "总资产",
          strategySuggestions: "三档策略建议",
          showPlan: "生成 AI 具体策略",
          hidePlan: "收起 AI 具体策略",
          annualReturn: "预期年化增长率",
          annualNote:
            "按市场常见风险收益模型估算，仅用于帮助你更直观地比较策略档位。",
          objective: "目标",
          audience: "适合人群",
          suggestedActions: "建议动作",
          riskNote: "风险提醒",
          riskDisclaimer:
            "投资有风险，策略页内容仅作为配置建议，不构成任何收益承诺或投资保证。",
          allocationTarget: "目标资产配比",
          allocationNote: "市场上常见的风格化模型组合，可作为再平衡参考起点。",
          gap: "与当前组合最大的差距",
          increase: "建议增加",
          decrease: "建议减少",
          closeEnough: "当前组合与该策略模型已经较接近，可重点关注定期再平衡。",
          actionTitle: "AI 具体行动建议",
          firstDraft: "第一版行动草案",
          actionSubtitleSuffix:
            "模型生成的可执行动作，优先解决当前组合最明显的配置偏差。",
          simplificationTitle: "组合瘦身建议",
          simplificationSubtitle:
            "如果你觉得买得太碎，这一块会告诉你哪些仓位值得合并、哪些更适合做核心仓。",
          fragmentationScore: "碎片化评分",
          smallPositions: "小仓位",
          duplicateExposure: "重复暴露",
          coreCandidates: "核心仓候选",
          keepList: "建议保留",
          mergeList: "建议合并",
          watchList: "建议观察",
          simplificationActions: "具体操作",
          step: "第",
          fundAmount: "对应资金",
          usdAmount: "美元",
          cnyAmount: "人民币",
          sellFlow: "卖出 / 降低仓位",
          buyFlow: "买入 / 增加配置",
          sellQuantity: "预计卖出数量",
          allocationAmount: "建议买入金额",
          sourceHoldings: "优先调整这些持仓",
          sellWhy: "为何优先卖出它",
          why: "原因",
          candidates: "可考虑的标的",
          noMajorGap:
            "当前组合与目标策略已经相对接近，第一版 AI 模块没有识别到需要优先处理的重大偏差。可以继续观察并按月做一次再平衡复查。",
        }
      : {
          draft: "AI Strategy Draft",
          title: "Portfolio Strategy Lab",
          subtitle:
            "Strategy suggestions generated from your current portfolio. This is not automated trading advice, but a reference panel for risk preference, allocation structure, and rebalancing direction.",
          model:
            "Standard market profiles: Conservative / Balanced / Aggressive",
          loading: "Loading strategy context...",
          scan: "Current portfolio scan",
          summary: "AI summary",
          benchmark: "Strategy baseline",
          totalPortfolio: "Total Portfolio",
          strategySuggestions: "Strategy suggestions",
          showPlan: "Generate AI action plan",
          hidePlan: "Hide AI action plan",
          annualReturn: "Expected annual return",
          annualNote:
            "Estimated from common market risk/return models for intuitive comparison only.",
          objective: "Objective",
          audience: "Suitable for",
          suggestedActions: "Suggested actions",
          riskNote: "Risk notice",
          riskDisclaimer:
            "Investing involves risk. This page provides guidance only and does not promise returns.",
          allocationTarget: "Target allocation",
          allocationNote:
            "A common model allocation that can serve as a starting point for rebalancing.",
          gap: "Largest gaps vs current portfolio",
          increase: "Increase",
          decrease: "Reduce",
          closeEnough:
            "Your portfolio is already relatively close to this model. Focus on periodic rebalancing.",
          actionTitle: "AI action plan",
          firstDraft: "First action draft",
          actionSubtitleSuffix:
            "actionable steps generated from the selected model to address the clearest allocation mismatches.",
          simplificationTitle: "Portfolio simplification",
          simplificationSubtitle:
            "If the portfolio feels too fragmented, this section shows what to merge and what can serve as core holdings.",
          fragmentationScore: "Fragmentation score",
          smallPositions: "Small positions",
          duplicateExposure: "Duplicate exposure",
          coreCandidates: "Core candidates",
          keepList: "Keep",
          mergeList: "Merge",
          watchList: "Watch",
          simplificationActions: "Actionable steps",
          step: "Step",
          fundAmount: "Estimated capital",
          usdAmount: "USD",
          cnyAmount: "CNY",
          sellFlow: "Sell / reduce",
          buyFlow: "Buy / add",
          sellQuantity: "Estimated sell quantity",
          allocationAmount: "Suggested buy amount",
          sourceHoldings: "Adjust these holdings first",
          sellWhy: "Why sell this first",
          why: "Why",
          candidates: "Suggested instruments",
          noMajorGap:
            "Your portfolio is already relatively close to the target model. The current AI module does not detect any major mismatch that needs urgent action.",
        };
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
        portfolioSummary.data?.exchangeRate ?? 7.2
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
                        固收与现金部分主要承担稳定器和再平衡缓冲作用。
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>
                        权益类资产决定长期增长弹性，是三档策略的核心差异。
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-amber-500" />
                      <span>
                        另类资产建议作为增强仓位，不宜替代核心资产配置。
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

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        {text.suggestedActions}
                      </p>
                      {activeStrategy.suggestions.map(item => (
                        <div
                          key={item}
                          className="flex gap-2 text-sm text-muted-foreground"
                        >
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                      <p className="text-sm font-medium text-foreground">
                        {text.riskNote}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {text.riskDisclaimer}
                      </p>
                      {activeStrategy.riskNotes.map(item => (
                        <div
                          key={item}
                          className="flex gap-2 text-sm text-muted-foreground"
                        >
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border bg-muted/20 p-5">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {text.allocationTarget}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {text.allocationNote}
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
                                {item.sourceAssets.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                      {language === "zh"
                                        ? "卖出 / 减持"
                                        : "Sell / Reduce"}
                                    </p>
                                    <div className="grid gap-2">
                                      {item.sourceAssets.map(asset => (
                                        <div
                                          key={asset.symbol}
                                          className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-sm">
                                              <span className="text-xs font-bold">
                                                {asset.symbol.slice(0, 2)}
                                              </span>
                                            </div>
                                            <div>
                                              <p className="font-medium text-foreground text-sm">
                                                {asset.symbol}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {asset.name}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            {asset.sellQuantity !== null && (
                                              <p className="text-sm font-medium text-rose-500 dark:text-rose-400">
                                                -
                                                {asset.sellQuantity.toLocaleString(
                                                  "en-US",
                                                  { maximumFractionDigits: 4 }
                                                )}{" "}
                                                {language === "zh"
                                                  ? "份"
                                                  : "units"}
                                              </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                              {formatUsdAmount(
                                                asset.sellValueUSD
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.sourceAssets.length > 0 && (
                                  <div className="flex justify-center -my-1 relative z-10">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm">
                                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {language === "zh"
                                      ? "买入 / 增持"
                                      : "Buy / Increase"}
                                    {item.targetBucket &&
                                      ` · ${BUCKET_LABELS[item.targetBucket]}`}
                                  </p>
                                  <div className="grid gap-2">
                                    {item.recommendationAllocations.map(
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
                                          <p className="mt-2 text-xs text-muted-foreground">
                                            {text.allocationAmount}：
                                            <span className="ml-1 font-medium text-foreground">
                                              {formatUsdAmount(amountUSD)} /{" "}
                                              {formatCnyAmount(amountCNY)}
                                            </span>
                                          </p>
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
                                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            {pickLocalized(
                                              recommendation.reason,
                                              language
                                            )}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <p className="font-medium text-foreground">
                                  {text.sellWhy}
                                </p>
                                <p className="mt-2 text-muted-foreground">
                                  {item.sellReason}
                                </p>
                              </div>

                              <div>
                                <p className="font-medium text-foreground">
                                  {text.why}
                                </p>
                                <p className="mt-2 text-muted-foreground">
                                  {item.rationale}
                                </p>
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

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border bg-background p-5">
                    <p className="text-sm font-medium text-foreground">
                      {text.keepList}
                    </p>
                    <div className="mt-4 space-y-3">
                      {simplification.keepList.map(asset => (
                        <div
                          key={`keep-${asset.id}`}
                          className="rounded-xl border bg-muted/20 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-foreground">
                              {asset.symbol}
                            </span>
                            <Badge variant="secondary">
                              {formatPercentValue(asset.percentage)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {asset.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background p-5">
                    <p className="text-sm font-medium text-foreground">
                      {text.mergeList}
                    </p>
                    <div className="mt-4 space-y-3">
                      {simplification.mergeList.map(asset => (
                        <div
                          key={`merge-${asset.id}`}
                          className="rounded-xl border bg-muted/20 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-foreground">
                              {asset.symbol}
                            </span>
                            <Badge variant="outline">
                              {formatPercentValue(asset.percentage)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {asset.name}
                          </p>
                          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            {language === "zh"
                              ? "若没有独立策略角色，优先并入核心仓。"
                              : "If it has no distinct role, merge it into a core holding first."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background p-5">
                    <p className="text-sm font-medium text-foreground">
                      {text.watchList}
                    </p>
                    <div className="mt-4 space-y-3">
                      {simplification.watchList.map(asset => (
                        <div
                          key={`watch-${asset.id}`}
                          className="rounded-xl border bg-muted/20 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-foreground">
                              {asset.symbol}
                            </span>
                            <Badge variant="outline">
                              {formatPercentValue(asset.percentage)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {asset.name}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {language === "zh"
                              ? "保留观察，但建议限制总数，避免继续拆得更细。"
                              : "Keep under review, but limit the count to avoid further fragmentation."}
                          </p>
                        </div>
                      ))}
                    </div>
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
