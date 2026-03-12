export type Language = "zh" | "en";

export type LocalizedText = {
  zh: string;
  en: string;
};

export type StrategyKey = "conservative" | "balanced" | "aggressive";
export type AllocationBucket =
  | "cash"
  | "fixed_income"
  | "equity"
  | "alternatives";

export type AllocationMix = Record<AllocationBucket, number>;

export type Recommendation = {
  symbol: string;
  name: string;
  typeLabel: LocalizedText;
  market: LocalizedText;
  stability: "core" | "satellite";
};

type StrategyDefinition = {
  label: string;
  tag: string;
  expectedAnnualReturn: string;
  description: string;
  objective: string;
  suitableFor: string;
  allocation: AllocationMix;
  suggestions: string[];
  riskNotes: string[];
};

function localizedText(zh: string, en: string): LocalizedText {
  return { zh, en };
}

export function pickLocalized(text: LocalizedText, language: Language) {
  return text[language];
}

export const BUCKET_LABELS: Record<AllocationBucket, string> = {
  cash: "现金 / 货币",
  fixed_income: "固收 / 债券",
  equity: "股票 / 权益",
  alternatives: "另类资产",
};

export const BUCKET_COLORS: Record<AllocationBucket, string> = {
  cash: "bg-blue-500",
  fixed_income: "bg-violet-500",
  equity: "bg-emerald-500",
  alternatives: "bg-amber-500",
};

export const RECOMMENDATION_LIBRARY: Record<
  AllocationBucket,
  Recommendation[]
> = {
  cash: [
    {
      symbol: "USD",
      name: "US Dollar Cash Buffer",
      typeLabel: localizedText("货币", "Currency"),
      market: localizedText("全球现金", "Global cash"),
      stability: "core",
    },
  ],
  fixed_income: [
    {
      symbol: "BND",
      name: "Vanguard Total Bond Market ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("全球核心固收参考", "Core global fixed income"),
      stability: "core",
    },
    {
      symbol: "AGG",
      name: "iShares Core U.S. Aggregate Bond ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("美国核心债券", "US core bonds"),
      stability: "core",
    },
    {
      symbol: "006327",
      name: "易方达中债3-5年国开债",
      typeLabel: localizedText("人民币基金", "RMB fund"),
      market: localizedText("中国债券基金", "China bond fund"),
      stability: "satellite",
    },
  ],
  equity: [
    {
      symbol: "VT",
      name: "Vanguard Total World Stock ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("全球股票", "Global equities"),
      stability: "core",
    },
    {
      symbol: "ACWI",
      name: "iShares MSCI ACWI ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("全球股票", "Global equities"),
      stability: "core",
    },
    {
      symbol: "IVV",
      name: "iShares Core S&P 500 ETF",
      typeLabel: localizedText("美国ETF", "US ETF"),
      market: localizedText("美股宽基", "US broad market"),
      stability: "core",
    },
    {
      symbol: "510300",
      name: "沪深300ETF",
      typeLabel: localizedText("人民币基金", "RMB fund"),
      market: localizedText("中国宽基", "China broad market"),
      stability: "satellite",
    },
  ],
  alternatives: [
    {
      symbol: "GLD",
      name: "SPDR Gold Shares",
      typeLabel: localizedText("贵金属ETF", "Precious metals ETF"),
      market: localizedText("黄金", "Gold"),
      stability: "core",
    },
    {
      symbol: "IAU",
      name: "iShares Gold Trust",
      typeLabel: localizedText("贵金属ETF", "Precious metals ETF"),
      market: localizedText("黄金", "Gold"),
      stability: "core",
    },
    {
      symbol: "518880",
      name: "黄金ETF",
      typeLabel: localizedText("人民币基金", "RMB fund"),
      market: localizedText("中国黄金ETF", "China gold ETF"),
      stability: "satellite",
    },
  ],
};

export const STRATEGIES: Record<StrategyKey, StrategyDefinition> = {
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
      "权益控制在四分之一左右，减少高波动集中仓位。",
      "固收和现金优先承担缓冲作用。",
    ],
    riskNotes: ["上涨行情里，收益弹性通常低于权益型组合。"],
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
      "权益做增长主引擎，但避免单边押注。",
      "固收和少量另类资产用于平衡波动。",
    ],
    riskNotes: ["股债同跌阶段，组合仍会出现阶段性承压。"],
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
      "权益仓位更高，但仍要控制集中度。",
      "保留少量现金和固收做缓冲，不建议满仓。",
    ],
    riskNotes: ["短期波动更明显，极端市场里的回撤也更大。"],
  },
};

export function getStrategyPageText(language: Language) {
  return language === "zh"
    ? {
        draft: "AI 策略草案",
        title: "AI 策略",
        subtitle: "根据当前组合，快速给出配置方向和再平衡提示。",
        model: "保守 / 稳健 / 激进",
        loading: "正在加载策略上下文...",
        scan: "当前组合扫描",
        summary: "AI 摘要",
        benchmark: "策略基准",
        totalPortfolio: "总资产",
        strategySuggestions: "策略建议",
        showPlan: "生成 AI 具体策略",
        hidePlan: "收起 AI 具体策略",
        annualReturn: "预期年化增长率",
        annualNote: "仅作参考。",
        objective: "目标",
        audience: "适合人群",
        suggestedActions: "核心动作",
        riskNote: "主要风险",
        allocationTarget: "目标资产配比",
        gap: "与当前组合最大的差距",
        increase: "建议增加",
        decrease: "建议减少",
        closeEnough: "当前组合与该策略模型已经较接近，可重点关注定期再平衡。",
        actionTitle: "AI 具体行动建议",
        firstDraft: "第一版行动草案",
        actionSubtitleSuffix: "优先处理最明显的偏差。",
        simplificationTitle: "组合瘦身建议",
        simplificationSubtitle: "快速判断组合是否过碎，以及先从哪里收敛。",
        fragmentationScore: "碎片化评分",
        smallPositions: "小仓位",
        duplicateExposure: "重复暴露",
        coreCandidates: "核心仓候选",
        simplificationActions: "具体操作",
        step: "第",
        fundAmount: "对应资金",
        usdAmount: "美元",
        cnyAmount: "人民币",
        noMajorGap:
          "当前组合与目标策略已经相对接近，第一版 AI 模块没有识别到需要优先处理的重大偏差。可以继续观察并按月做一次再平衡复查。",
      }
    : {
        draft: "AI Strategy Draft",
        title: "AI Strategy",
        subtitle:
          "A quick view of portfolio direction and rebalancing priorities.",
        model: "Conservative / Balanced / Aggressive",
        loading: "Loading strategy context...",
        scan: "Current portfolio scan",
        summary: "AI summary",
        benchmark: "Strategy baseline",
        totalPortfolio: "Total Portfolio",
        strategySuggestions: "Strategy view",
        showPlan: "Generate AI action plan",
        hidePlan: "Hide AI action plan",
        annualReturn: "Expected annual return",
        annualNote: "Reference only.",
        objective: "Objective",
        audience: "Suitable for",
        suggestedActions: "Core move",
        riskNote: "Main risk",
        allocationTarget: "Target allocation",
        gap: "Largest gaps vs current portfolio",
        increase: "Increase",
        decrease: "Reduce",
        closeEnough:
          "Your portfolio is already relatively close to this model. Focus on periodic rebalancing.",
        actionTitle: "AI action plan",
        firstDraft: "First action draft",
        actionSubtitleSuffix:
          "steps focused on the clearest allocation mismatches.",
        simplificationTitle: "Portfolio simplification",
        simplificationSubtitle:
          "A quick read on fragmentation and the first cleanup moves.",
        fragmentationScore: "Fragmentation score",
        smallPositions: "Small positions",
        duplicateExposure: "Duplicate exposure",
        coreCandidates: "Core candidates",
        simplificationActions: "Actionable steps",
        step: "Step",
        fundAmount: "Estimated capital",
        usdAmount: "USD",
        cnyAmount: "CNY",
        noMajorGap:
          "Your portfolio is already relatively close to the target model. The current AI module does not detect any major mismatch that needs urgent action.",
      };
}
