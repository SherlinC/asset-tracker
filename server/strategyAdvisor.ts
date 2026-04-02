import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { fetchAssetPrice, fetchExchangeRates } from "./priceService";

type Language = "zh" | "en";

type PortfolioAssetSnapshot = {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  priceUSD: number;
  valueUSD: number;
};

export type StrategyPortfolioSnapshot = {
  totalValueUSD: number;
  totalValueCNY: number;
  exchangeRate: number;
  assets: PortfolioAssetSnapshot[];
};

type AllocationBucket = "cash" | "fixed_income" | "equity" | "alternatives";

type MarketInstrument = {
  symbol: string;
  type: "stock" | "fund" | "crypto";
  labelZh: string;
  labelEn: string;
};

type MarketSnapshotPoint = {
  symbol: string;
  label: string;
  change24h: number;
  priceUSD: number;
};

type MarketRegime = "risk_on" | "mixed" | "risk_off";

type StrategyVariant = {
  summary: string;
  thesis: string;
  portfolioFit: string;
  actions: string[];
  buyIdeas: string[];
  risks: string[];
};

export type LiveStrategyResponse = {
  generatedAt: string;
  marketSummary: string;
  marketSnapshot: string[];
  headlineDigest: string[];
  strategies: {
    conservative: StrategyVariant;
    balanced: StrategyVariant;
    aggressive: StrategyVariant;
  };
};

const MARKET_INSTRUMENTS: MarketInstrument[] = [
  {
    symbol: "SPY",
    type: "stock",
    labelZh: "美股大盘",
    labelEn: "US broad market",
  },
  {
    symbol: "QQQ",
    type: "stock",
    labelZh: "美股成长",
    labelEn: "US growth equities",
  },
  {
    symbol: "TLT",
    type: "stock",
    labelZh: "美债久期",
    labelEn: "Long-duration Treasuries",
  },
  {
    symbol: "GLD",
    type: "stock",
    labelZh: "黄金",
    labelEn: "Gold",
  },
  {
    symbol: "BTC",
    type: "crypto",
    labelZh: "比特币",
    labelEn: "Bitcoin",
  },
  {
    symbol: "510300",
    type: "fund",
    labelZh: "沪深300",
    labelEn: "CSI 300",
  },
];

function detectBucket(asset: PortfolioAssetSnapshot): AllocationBucket {
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

  if (/gold|silver|metals|commodity|gld|iau|slv|dbb/.test(label)) {
    return "alternatives";
  }

  return "equity";
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractAssistantText(
  content: string | Array<{ type: string; text?: string }>
) {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map(part => (part.type === "text" ? (part.text ?? "") : ""))
    .join("\n")
    .trim();
}

function parseJsonResponse<T>(value: string): T {
  const trimmed = value.trim();

  if (trimmed.startsWith("```")) {
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (codeBlockMatch?.[1]) {
      return JSON.parse(codeBlockMatch[1]) as T;
    }
  }

  return JSON.parse(trimmed) as T;
}

function buildTargetAllocation(
  profile: "conservative" | "balanced" | "aggressive",
  regime: MarketRegime,
  inflationTheme: boolean
) {
  const base =
    profile === "conservative"
      ? { cash: 20, fixed_income: 45, equity: 25, alternatives: 10 }
      : profile === "balanced"
        ? { cash: 10, fixed_income: 30, equity: 45, alternatives: 15 }
        : { cash: 5, fixed_income: 15, equity: 60, alternatives: 20 };

  if (regime === "risk_off") {
    return {
      cash: base.cash + 5,
      fixed_income: base.fixed_income + (inflationTheme ? 2 : 5),
      equity: base.equity - (inflationTheme ? 5 : 8),
      alternatives: base.alternatives + (inflationTheme ? 3 : -2),
    };
  }

  if (regime === "risk_on") {
    return {
      cash: Math.max(3, base.cash - 3),
      fixed_income: Math.max(10, base.fixed_income - 4),
      equity: base.equity + 5,
      alternatives: base.alternatives + 2,
    };
  }

  return base;
}

function buildAllocationGapText(
  portfolio: ReturnType<typeof buildPortfolioContext>,
  target: ReturnType<typeof buildTargetAllocation>,
  language: Language
) {
  const entries = (Object.keys(target) as Array<keyof typeof target>)
    .map(bucket => ({
      bucket,
      delta: Number(
        (target[bucket] - portfolio.allocationPct[bucket]).toFixed(1)
      ),
    }))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 2);

  const bucketLabel = {
    cash: language === "zh" ? "现金" : "cash",
    fixed_income: language === "zh" ? "固收" : "fixed income",
    equity: language === "zh" ? "权益" : "equity",
    alternatives: language === "zh" ? "另类资产" : "alternatives",
  };

  if (entries.length === 0) {
    return language === "zh"
      ? "当前组合与该风险档位大体匹配。"
      : "The portfolio is broadly aligned with this risk profile.";
  }

  return entries
    .map(item => {
      if (language === "zh") {
        return item.delta > 0
          ? `${bucketLabel[item.bucket]}仍可增加约 ${item.delta}%`
          : `${bucketLabel[item.bucket]}可下调约 ${Math.abs(item.delta)}%`;
      }

      return item.delta > 0
        ? `${bucketLabel[item.bucket]} can be increased by about ${item.delta}%`
        : `${bucketLabel[item.bucket]} can be reduced by about ${Math.abs(item.delta)}%`;
    })
    .join(language === "zh" ? "，" : "; ");
}

function getBucketLabel(bucket: AllocationBucket, language: Language) {
  if (language === "zh") {
    return {
      cash: "现金",
      fixed_income: "固收",
      equity: "权益",
      alternatives: "另类资产",
    }[bucket];
  }

  return {
    cash: "cash",
    fixed_income: "fixed income",
    equity: "equity",
    alternatives: "alternatives",
  }[bucket];
}

function formatSymbolList(symbols: string[], language: Language) {
  if (symbols.length === 0) {
    return language === "zh"
      ? "当前无明显代表持仓"
      : "no clear representative holdings";
  }

  return symbols.join(language === "zh" ? " / " : ", ");
}

function getAllocationGapEntries(
  portfolio: ReturnType<typeof buildPortfolioContext>,
  target: ReturnType<typeof buildTargetAllocation>
) {
  return (Object.keys(target) as AllocationBucket[])
    .map(bucket => ({
      bucket,
      delta: Number(
        (target[bucket] - portfolio.allocationPct[bucket]).toFixed(1)
      ),
    }))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
}

function getBucketMoveIdeas(
  bucket: AllocationBucket,
  language: Language,
  themes: string[],
  regime: MarketRegime
) {
  const hasRateTheme = themes.some(theme =>
    theme.includes(language === "zh" ? "利率" : "rates")
  );
  const hasTechTheme = themes.some(theme =>
    theme.includes(language === "zh" ? "科技" : "tech")
  );
  const hasChinaTheme = themes.some(theme =>
    theme.includes(language === "zh" ? "中国" : "China")
  );
  const hasCryptoTheme = themes.some(theme =>
    theme.includes(language === "zh" ? "加密" : "crypto")
  );

  if (language === "zh") {
    if (bucket === "cash") {
      return [
        "现金 / 货币基金",
        regime === "risk_off"
          ? "短期存款或超短债工具"
          : "等待下一次分批加仓窗口",
      ];
    }

    if (bucket === "fixed_income") {
      return [
        hasRateTheme ? "短久期债券基金" : "BND / AGG 这类核心债券 ETF",
        regime === "risk_off"
          ? "高评级债券或投资级信用债"
          : "债券 ETF + 现金缓冲组合",
      ];
    }

    if (bucket === "equity") {
      return [
        hasTechTheme
          ? "QQQ / 科技宽基 / AI 主线核心仓"
          : "VT / ACWI / SPY 这类全球或美股宽基",
        hasChinaTheme ? "510300 这类中国宽基卫星仓" : "全球宽基分批布局",
      ];
    }

    return [
      hasCryptoTheme ? "BTC 小比例卫星仓" : "GLD / IAU 这类黄金对冲仓",
      regime === "risk_off" ? "黄金优先于高波动另类主题" : "黄金或少量商品仓",
    ];
  }

  if (bucket === "cash") {
    return [
      "cash / money market funds",
      regime === "risk_off"
        ? "short-duration parking assets"
        : "dry powder for staged entries",
    ];
  }

  if (bucket === "fixed_income") {
    return [
      hasRateTheme
        ? "short-duration bond funds"
        : "core bond ETFs such as BND / AGG",
      regime === "risk_off"
        ? "high-grade bonds or investment-grade credit"
        : "bond ETF plus cash buffer mix",
    ];
  }

  if (bucket === "equity") {
    return [
      hasTechTheme
        ? "QQQ / broad tech / AI core exposure"
        : "VT / ACWI / SPY core equity exposure",
      hasChinaTheme
        ? "a China broad-market satellite such as 510300"
        : "staged entries into global equities",
    ];
  }

  return [
    hasCryptoTheme
      ? "a small BTC satellite sleeve"
      : "GLD / IAU hedge exposure",
    regime === "risk_off"
      ? "gold ahead of high-beta alternatives"
      : "gold or a small commodity sleeve",
  ];
}

function getThemeSentence(language: Language, themes: string[]) {
  if (themes.length === 0) {
    return language === "zh"
      ? "最近的新闻并没有形成单一压倒性的主线，所以策略重点更应放在仓位结构而不是追逐热点。"
      : "Recent headlines do not point to a single dominant macro narrative, so structure matters more than chasing themes.";
  }

  return language === "zh"
    ? `最近新闻主线主要集中在 ${themes.join("、")}，所以策略动作要围绕这些主题对仓位做取舍。`
    : `Recent headlines are concentrated around ${themes.join(", ")}, so the strategy should adapt positioning around those drivers.`;
}

function tuneBuyIdeasForProfile(
  profile: "conservative" | "balanced" | "aggressive",
  language: Language,
  ideas: string[]
) {
  if (profile === "aggressive") {
    return ideas;
  }

  const filtered = ideas.filter(idea => {
    const normalized = idea.toLowerCase();

    if (profile === "conservative") {
      return !normalized.includes("btc") && !normalized.includes("crypto");
    }

    return !(normalized.includes("btc") || normalized.includes("crypto"));
  });

  if (filtered.length > 0) {
    return filtered;
  }

  return [language === "zh" ? "现金 / 货币基金" : "cash / money market funds"];
}

function detectHeadlineThemes(headlines: string[], language: Language) {
  const joined = headlines.join(" ").toLowerCase();
  const themeMap = [
    {
      key: "rates",
      matched:
        /fed|rate|rates|inflation|cpi|yield|treasury|bond|美联储|降息|加息|通胀|收益率|国债/.test(
          joined
        ),
      label: language === "zh" ? "利率 / 通胀" : "rates / inflation",
    },
    {
      key: "tech",
      matched: /ai|nvidia|chip|semiconductor|technology|科技|芯片|英伟达/.test(
        joined
      ),
      label: language === "zh" ? "科技 / AI" : "tech / AI",
    },
    {
      key: "china",
      matched: /china|beijing|stimulus|中国|刺激|政策/.test(joined),
      label: language === "zh" ? "中国市场" : "China market",
    },
    {
      key: "geopolitics",
      matched:
        /tariff|trade|war|geopolitic|oil|middle east|关税|贸易|地缘|原油|中东/.test(
          joined
        ),
      label: language === "zh" ? "地缘 / 商品" : "geopolitics / commodities",
    },
    {
      key: "crypto",
      matched: /bitcoin|crypto|比特币|加密/.test(joined),
      label: language === "zh" ? "加密资产" : "crypto",
    },
  ];

  return themeMap.filter(item => item.matched).map(item => item.label);
}

function getMarketRegime(points: MarketSnapshotPoint[]) {
  const bySymbol = new Map(
    points.map(point => [point.symbol, point.change24h])
  );
  const equityMomentum =
    ((bySymbol.get("SPY") ?? 0) +
      (bySymbol.get("QQQ") ?? 0) +
      (bySymbol.get("510300") ?? 0)) /
    3;
  const hedgeMomentum =
    ((bySymbol.get("TLT") ?? 0) + (bySymbol.get("GLD") ?? 0)) / 2;
  const cryptoMomentum = bySymbol.get("BTC") ?? 0;

  if (equityMomentum <= -0.6 && (hedgeMomentum > 0 || cryptoMomentum < -1)) {
    return "risk_off" satisfies MarketRegime;
  }

  if (equityMomentum >= 0.6 && cryptoMomentum >= -0.3) {
    return "risk_on" satisfies MarketRegime;
  }

  return "mixed" satisfies MarketRegime;
}

function buildMarketSummary(
  language: Language,
  regime: MarketRegime,
  themes: string[],
  points: MarketSnapshotPoint[]
) {
  const strongest = [...points]
    .sort((left, right) => Math.abs(right.change24h) - Math.abs(left.change24h))
    .slice(0, 2)
    .map(
      point =>
        `${point.label} ${point.change24h >= 0 ? "+" : ""}${point.change24h.toFixed(2)}%`
    )
    .join(language === "zh" ? "，" : "; ");
  const themeText =
    themes.length > 0
      ? themes.join(language === "zh" ? "、" : ", ")
      : language === "zh"
        ? "缺少明显单一主线"
        : "no single dominant theme";

  if (language === "zh") {
    const regimeText =
      regime === "risk_on"
        ? "当前市场偏风险偏好"
        : regime === "risk_off"
          ? "当前市场偏防守"
          : "当前市场处于震荡混合状态";

    return `${regimeText}，新闻主线集中在${themeText}，盘面上较明显的变动包括 ${strongest}。`;
  }

  const regimeText =
    regime === "risk_on"
      ? "The market currently leans risk-on"
      : regime === "risk_off"
        ? "The market currently leans defensive"
        : "The market is in a mixed regime";

  return `${regimeText}, with headlines centered on ${themeText}. The clearest tape moves are ${strongest}.`;
}

function buildRuleBasedVariant(
  language: Language,
  profile: "conservative" | "balanced" | "aggressive",
  regime: MarketRegime,
  themes: string[],
  portfolio: ReturnType<typeof buildPortfolioContext>
): StrategyVariant {
  const inflationTheme = themes.some(theme =>
    theme.includes(language === "zh" ? "利率" : "rates")
  );
  const target = buildTargetAllocation(profile, regime, inflationTheme);
  const gapText = buildAllocationGapText(portfolio, target, language);
  const topHoldingText = formatSymbolList(
    portfolio.topHoldings.slice(0, 3).map(item => item.symbol),
    language
  );
  const gaps = getAllocationGapEntries(portfolio, target);
  const primaryAdd = gaps.find(item => item.delta > 3);
  const primaryTrim = gaps.find(item => item.delta < -3);
  const trimSymbols = primaryTrim
    ? portfolio.holdingsByBucket[primaryTrim.bucket].slice(0, 2)
    : [];
  const addSymbols = primaryAdd
    ? portfolio.holdingsByBucket[primaryAdd.bucket].slice(0, 2)
    : [];
  const trimBucketLabel = primaryTrim
    ? getBucketLabel(primaryTrim.bucket, language)
    : null;
  const addBucketLabel = primaryAdd
    ? getBucketLabel(primaryAdd.bucket, language)
    : null;
  const addIdeas = primaryAdd
    ? getBucketMoveIdeas(primaryAdd.bucket, language, themes, regime)
    : [];
  const secondaryIdeas = gaps
    .filter(item => item.delta > 0 && primaryAdd?.bucket !== item.bucket)
    .slice(0, 1)
    .flatMap(item => getBucketMoveIdeas(item.bucket, language, themes, regime));
  const buyIdeas = tuneBuyIdeasForProfile(
    profile,
    language,
    Array.from(new Set([...addIdeas, ...secondaryIdeas])).slice(0, 3)
  );
  const addCandidateText = formatSymbolList(
    addSymbols.length > 0 ? addSymbols : buyIdeas.slice(0, 2),
    language
  );
  const smallPositionText = formatSymbolList(
    portfolio.smallPositionSymbols.slice(0, 3),
    language
  );
  const themeSentence = getThemeSentence(language, themes);
  const concentrationSentence =
    portfolio.largestHolding && portfolio.largestHoldingWeightPct >= 18
      ? language === "zh"
        ? `当前最大单一持仓是 ${portfolio.largestHolding}，约占组合 ${portfolio.largestHoldingWeightPct.toFixed(1)}%。`
        : `The largest single position is ${portfolio.largestHolding} at about ${portfolio.largestHoldingWeightPct.toFixed(1)}% of the portfolio.`
      : language === "zh"
        ? "当前组合没有出现特别极端的单一持仓集中。"
        : "The portfolio is not dominated by a single extreme concentration right now.";

  if (language === "zh") {
    const summary =
      profile === "conservative"
        ? regime === "risk_off"
          ? "当前更像防守局面，保守策略的重点是先收回波动敞口。"
          : regime === "risk_on"
            ? "行情并不差，但保守档更该做的是保留缓冲，而不是直接追进攻。"
            : "当前是混合市况，保守策略应优先把仓位结构调顺，而不是押方向。"
        : profile === "balanced"
          ? regime === "risk_off"
            ? "稳健档现在更适合先修正结构失衡，再等待更清晰的风险偏好回暖。"
            : regime === "risk_on"
              ? "稳健档可以保持增长暴露，但要把进攻和防守仓同时留住。"
              : "稳健档的关键不是追单一热点，而是让股债金重新回到均衡。"
          : regime === "risk_off"
            ? "激进档不是不能做，而是不能在防守市况里用满仓思路去做。"
            : regime === "risk_on"
              ? "现在可以偏进攻，但更好的做法是围绕核心仓分批放大风险。"
              : "激进策略可以执行，但要明确哪部分是核心进攻仓，哪部分只是卫星观点仓。";

    const thesis = `${themeSentence}${
      primaryTrim && primaryAdd
        ? ` 当前最该做的不是再加新主题，而是先把 ${formatSymbolList(trimSymbols, language)} 这类${trimBucketLabel}仓位降一点，再把资金补到${addBucketLabel}。`
        : primaryAdd
          ? ` 当前组合的主要短板在 ${addBucketLabel}，增量资金要先补这个缺口。`
          : primaryTrim
            ? ` 当前组合的主要问题是 ${trimBucketLabel}偏重，先处理偏重仓位会比继续加新资产更有效。`
            : ` 当前组合与目标档位已经不算远，核心任务是把动作做得更精细。`
    }`;

    const portfolioFit = `${concentrationSentence} 目前前几大仓位是 ${topHoldingText}。按${
      profile === "conservative"
        ? "保守"
        : profile === "balanced"
          ? "稳健"
          : "激进"
    }档看，${gapText}`;

    const actions = [
      primaryTrim
        ? `第一步先把 ${formatSymbolList(trimSymbols, language)} 所在的${trimBucketLabel}仓位下调约 ${Math.abs(primaryTrim.delta).toFixed(1)}%，不要一边说要防守，一边继续放大这类仓位。`
        : `第一步维持当前主仓结构，但把仓位节奏收紧到 ${
            profile === "aggressive" ? "分批建仓" : "分批调仓"
          }。`,
      primaryAdd
        ? addSymbols.length > 0
          ? `把腾出的资金优先补到 ${addCandidateText} 这类现有${addBucketLabel}核心仓，目标增加约 ${primaryAdd.delta.toFixed(1)}%。`
          : `新增资金优先补 ${addBucketLabel}，目标增加约 ${primaryAdd.delta.toFixed(1)}%，候选先看 ${addCandidateText}。`
        : `新增资金先围绕当前核心仓做小步再平衡，不要额外开太多新分支。`,
      portfolio.smallPositionCount > 0
        ? `你当前有 ${portfolio.smallPositionCount} 个小仓位，优先处理 ${smallPositionText} 这批贡献度最低的仓位，把零散仓并回核心仓。`
        : portfolio.largestHoldingWeightPct >= 25
          ? `当前最大仓 ${portfolio.largestHolding} 占比已经不低，后续所有加仓都应优先避免继续抬高单一仓位集中度。`
          : `保持核心仓数量克制，后续新增观点仓尽量放在卫星仓，而不是把主仓继续切碎。`,
    ];

    const risks = [
      profile === "conservative"
        ? "如果市场快速转强，保守策略会明显跑输更高权益仓位。"
        : profile === "balanced"
          ? "稳健档仍然会受股债同跌拖累，只是回撤通常低于激进档。"
          : "激进档在回撤期最怕仓位放太快，错误通常不是方向错，而是节奏错。",
      inflationTheme
        ? "当前利率 / 通胀主题还在，长久期资产的波动可能继续放大。"
        : themes.some(
              theme =>
                theme.includes("科技") ||
                theme.includes("加密") ||
                theme.includes("地缘")
            )
          ? `当前新闻主线还在交易 ${themes.join("、")}，情绪切换会让主题仓波动明显放大。`
          : "如果市场从震荡切到单边，当前策略需要重新调整节奏。",
    ];

    return {
      summary,
      thesis,
      portfolioFit,
      actions,
      buyIdeas,
      risks,
    };
  }

  const summary =
    profile === "conservative"
      ? regime === "risk_off"
        ? "This is a defensive tape, so the conservative playbook should first reduce volatility exposure."
        : regime === "risk_on"
          ? "The backdrop is constructive, but a conservative profile still needs buffers before upside."
          : "In a mixed tape, the conservative move is to fix structure before making a directional macro bet."
      : profile === "balanced"
        ? regime === "risk_off"
          ? "A balanced profile should repair structural imbalances before adding more risk."
          : regime === "risk_on"
            ? "You can keep growth exposure, but only with a visible defensive sleeve beside it."
            : "The balanced playbook here is to restore stock-bond-gold balance rather than chase one theme."
        : regime === "risk_off"
          ? "An aggressive profile is still possible, but not with a fully-invested mindset in a defensive tape."
          : regime === "risk_on"
            ? "You can lean into growth, but do it through staged additions to core risk assets."
            : "An aggressive stance works only if you clearly separate core risk from satellite views.";

  const thesis = `${themeSentence}${
    primaryTrim && primaryAdd
      ? ` The immediate move is not to add another theme, but to trim ${formatSymbolList(trimSymbols, language)} from the ${trimBucketLabel} bucket and recycle capital into ${addBucketLabel}.`
      : primaryAdd
        ? ` The biggest portfolio gap is in ${addBucketLabel}, so new money should fill that hole first.`
        : primaryTrim
          ? ` The biggest issue is an overweight ${trimBucketLabel} bucket, so fixing that should come before adding fresh exposure.`
          : ` The portfolio is already reasonably close to this profile, so the focus should be on better execution rather than major repositioning.`
  }`;

  const portfolioFit = `${concentrationSentence} The leading holdings are ${topHoldingText}. Against a ${profile} profile, ${gapText}`;

  const actions = [
    primaryTrim
      ? `First trim about ${Math.abs(primaryTrim.delta).toFixed(1)}% from the ${trimBucketLabel} bucket, starting with ${formatSymbolList(trimSymbols, language)} instead of adding fresh risk on top.`
      : `First keep the core structure intact, but shift to ${profile === "aggressive" ? "staged entries" : "staged rebalancing"}.`,
    primaryAdd
      ? addSymbols.length > 0
        ? `Redeploy capital first into existing ${addBucketLabel} core positions such as ${addCandidateText}, aiming to add roughly ${primaryAdd.delta.toFixed(1)}%.`
        : `Direct new capital first into ${addBucketLabel}, targeting roughly ${primaryAdd.delta.toFixed(1)}%, with ${addCandidateText} as the first watchlist.`
      : "Use new cash for small rebalancing adds around current core holdings rather than opening many new branches.",
    portfolio.smallPositionCount > 0
      ? `You currently have ${portfolio.smallPositionCount} small positions, so clean up low-conviction names such as ${smallPositionText} before adding more complexity.`
      : portfolio.largestHoldingWeightPct >= 25
        ? `The largest position, ${portfolio.largestHolding}, is already sizeable, so avoid any move that further raises single-name concentration.`
        : "Keep the number of core positions tight and let new ideas live in satellites rather than fragmenting the main book.",
  ];

  const risks = [
    profile === "conservative"
      ? "If the tape turns strongly risk-on, a conservative mix will lag in upside capture."
      : profile === "balanced"
        ? "A balanced profile can still struggle in stock-bond drawdowns, even if it usually falls less than an aggressive one."
        : "In an aggressive profile, the biggest mistake is often pacing rather than direction: adding risk too quickly into volatility.",
    inflationTheme
      ? "Rates and inflation are still live themes, so duration-sensitive assets can stay choppy."
      : themes.some(
            theme =>
              theme.includes("tech") ||
              theme.includes("crypto") ||
              theme.includes("geopolitics")
          )
        ? `The market is still trading ${themes.join(", ")}, so theme-heavy sleeves can see sharp sentiment reversals.`
        : "If the market shifts from mixed to one-way leadership, this profile may need a fresh rebalance quickly.",
  ];

  return {
    summary,
    thesis,
    portfolioFit,
    actions,
    buyIdeas,
    risks,
  };
}

function buildRuleBasedLiveStrategy(
  language: Language,
  portfolio: ReturnType<typeof buildPortfolioContext>,
  marketSnapshot: MarketSnapshotPoint[],
  headlineDigest: string[]
): LiveStrategyResponse {
  const themes = detectHeadlineThemes(headlineDigest, language);
  const regime = getMarketRegime(marketSnapshot);
  const renderedSnapshot = marketSnapshot.map(
    point =>
      `${point.label} (${point.symbol}) ${point.change24h >= 0 ? "+" : ""}${point.change24h.toFixed(2)}%, price ${point.priceUSD.toFixed(2)} USD`
  );

  return {
    generatedAt: new Date().toISOString(),
    marketSummary: buildMarketSummary(language, regime, themes, marketSnapshot),
    marketSnapshot: renderedSnapshot,
    headlineDigest,
    strategies: {
      conservative: buildRuleBasedVariant(
        language,
        "conservative",
        regime,
        themes,
        portfolio
      ),
      balanced: buildRuleBasedVariant(
        language,
        "balanced",
        regime,
        themes,
        portfolio
      ),
      aggressive: buildRuleBasedVariant(
        language,
        "aggressive",
        regime,
        themes,
        portfolio
      ),
    },
  };
}

function buildPortfolioContext(portfolio: StrategyPortfolioSnapshot) {
  const holdingsByBucket = {
    cash: [] as string[],
    fixed_income: [] as string[],
    equity: [] as string[],
    alternatives: [] as string[],
  } satisfies Record<AllocationBucket, string[]>;

  const allocation = {
    cash: 0,
    fixed_income: 0,
    equity: 0,
    alternatives: 0,
  } satisfies Record<AllocationBucket, number>;

  for (const asset of portfolio.assets) {
    const bucket = detectBucket(asset);
    allocation[bucket] += asset.valueUSD;
    holdingsByBucket[bucket].push(asset.symbol);
  }

  const total = portfolio.totalValueUSD || 1;
  const topHoldings = [...portfolio.assets]
    .sort((left, right) => right.valueUSD - left.valueUSD)
    .slice(0, 10)
    .map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      valueUSD: Number(asset.valueUSD.toFixed(2)),
      weightPct: Number(((asset.valueUSD / total) * 100).toFixed(2)),
      bucket: detectBucket(asset),
    }));

  return {
    totalValueUSD: Number(portfolio.totalValueUSD.toFixed(2)),
    totalValueCNY: Number(portfolio.totalValueCNY.toFixed(2)),
    exchangeRate: Number(portfolio.exchangeRate.toFixed(4)),
    assetCount: portfolio.assets.length,
    allocationPct: {
      cash: Number(((allocation.cash / total) * 100).toFixed(1)),
      fixed_income: Number(
        ((allocation.fixed_income / total) * 100).toFixed(1)
      ),
      equity: Number(((allocation.equity / total) * 100).toFixed(1)),
      alternatives: Number(
        ((allocation.alternatives / total) * 100).toFixed(1)
      ),
    },
    topHoldings,
    holdingsByBucket: {
      cash: holdingsByBucket.cash.slice(0, 4),
      fixed_income: holdingsByBucket.fixed_income.slice(0, 4),
      equity: holdingsByBucket.equity.slice(0, 4),
      alternatives: holdingsByBucket.alternatives.slice(0, 4),
    },
    smallPositionSymbols: [...portfolio.assets]
      .sort((left, right) => left.valueUSD - right.valueUSD)
      .filter(asset => asset.valueUSD / total < 0.03)
      .slice(0, 4)
      .map(asset => asset.symbol),
    largestHolding: topHoldings[0]?.symbol ?? null,
    largestHoldingWeightPct: topHoldings[0]?.weightPct ?? 0,
    smallPositionCount: portfolio.assets.filter(
      asset => asset.valueUSD / total < 0.03
    ).length,
  };
}

async function fetchMarketSnapshot(language: Language) {
  const exchangeRates = await fetchExchangeRates();
  const quotes = await Promise.all(
    MARKET_INSTRUMENTS.map(async instrument => {
      try {
        const quote = await fetchAssetPrice(
          instrument.symbol,
          instrument.type,
          exchangeRates
        );

        if (quote.priceUSD <= 0) {
          return null;
        }

        const label =
          language === "zh" ? instrument.labelZh : instrument.labelEn;

        return {
          symbol: instrument.symbol,
          label,
          change24h: quote.change24h,
          priceUSD: quote.priceUSD,
        } satisfies MarketSnapshotPoint;
      } catch (error) {
        console.warn(
          `[Strategy Market Snapshot] ${instrument.symbol}:`,
          (error as Error).message
        );
        return null;
      }
    })
  );

  return quotes.filter((item): item is MarketSnapshotPoint => item != null);
}

async function fetchFinnhubGeneralNews(limit: number) {
  if (!ENV.finnhubApiKey) {
    return [] as string[];
  }

  const url = new URL("https://finnhub.io/api/v1/news");
  url.searchParams.set("category", "general");
  url.searchParams.set("token", ENV.finnhubApiKey);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Finnhub news failed: ${response.status}`);
  }

  const items = (await response.json()) as Array<{
    headline?: string;
    summary?: string;
    source?: string;
  }>;

  return items
    .slice(0, limit)
    .map(item => {
      const headline = item.headline?.trim();

      if (!headline) {
        return null;
      }

      const source = item.source?.trim();
      const summary = item.summary?.trim();

      return [headline, source ? `(${source})` : null, summary || null]
        .filter(Boolean)
        .join(" ");
    })
    .filter((item): item is string => item != null);
}

async function fetchGoogleNewsRss(language: Language, limit: number) {
  const query =
    language === "zh"
      ? "全球股市 OR 美联储 OR 通胀 OR 债券 OR 黄金 OR 比特币"
      : "global stock market OR Federal Reserve OR inflation OR bonds OR gold OR bitcoin";
  const url = new URL("https://news.google.com/rss/search");

  url.searchParams.set("q", query);
  url.searchParams.set("hl", language === "zh" ? "zh-CN" : "en-US");
  url.searchParams.set("gl", language === "zh" ? "CN" : "US");
  url.searchParams.set("ceid", language === "zh" ? "CN:zh-Hans" : "US:en");

  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml,application/xml,text/xml,*/*",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Google News RSS failed: ${response.status}`);
  }

  const xml = await response.text();
  const items = Array.from(
    xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)
  );

  return items
    .slice(0, limit)
    .map(match => decodeXmlEntities(match[1] ?? ""))
    .filter(title => title.length > 0);
}

async function fetchHeadlineDigest(language: Language) {
  try {
    const finnhubNews = await fetchFinnhubGeneralNews(6);

    if (finnhubNews.length > 0) {
      return finnhubNews;
    }
  } catch (error) {
    console.warn("[Strategy News] Finnhub:", (error as Error).message);
  }

  try {
    return await fetchGoogleNewsRss(language, 6);
  } catch (error) {
    console.warn("[Strategy News] Google RSS:", (error as Error).message);
    return [];
  }
}

export async function generateLiveStrategy(
  language: Language,
  portfolio: StrategyPortfolioSnapshot
) {
  const [marketSnapshot, headlineDigest] = await Promise.all([
    fetchMarketSnapshot(language),
    fetchHeadlineDigest(language),
  ]);
  const portfolioContext = buildPortfolioContext(portfolio);

  if (!ENV.forgeApiKey) {
    return buildRuleBasedLiveStrategy(
      language,
      portfolioContext,
      marketSnapshot,
      headlineDigest
    );
  }

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          language === "zh"
            ? "你是资深宏观资产配置顾问。你的任务是基于用户当前组合、最新市场快照和最新财经新闻，生成当下可执行的保守、稳健、激进三套策略。禁止写成空泛模板，必须明确引用当前市场背景、组合结构和近期新闻驱动。不要承诺收益，不要说自己无法提供投资建议。输出必须是 JSON。"
            : "You are a senior macro allocation advisor. Based on the user's current portfolio, live market snapshot, and fresh financial headlines, generate actionable conservative, balanced, and aggressive strategies. Avoid generic template language. Tie every strategy to the current market backdrop, portfolio structure, and recent news drivers. Do not promise returns. Output JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            language,
            now: new Date().toISOString(),
            portfolio: portfolioContext,
            marketSnapshot: marketSnapshot.map(
              point =>
                `${point.label} (${point.symbol}) ${point.change24h >= 0 ? "+" : ""}${point.change24h.toFixed(2)}%, price ${point.priceUSD.toFixed(2)} USD`
            ),
            headlineDigest,
            instructions:
              language === "zh"
                ? "请输出 marketSummary、marketSnapshot、headlineDigest，以及 conservative / balanced / aggressive 三套策略。每套策略必须包含 summary、thesis、portfolioFit、actions、buyIdeas、risks。actions 要尽量具体到资产类别、仓位方向或用户现有持仓。buyIdeas 可以写具体 ticker、ETF、债券基金、现金或黄金等方向。"
                : "Return marketSummary, marketSnapshot, headlineDigest, plus conservative / balanced / aggressive strategies. Each strategy must include summary, thesis, portfolioFit, actions, buyIdeas, and risks. Actions should be specific to asset classes, positioning changes, or current holdings. Buy ideas can include concrete tickers, ETFs, bond funds, cash, or gold exposure.",
          },
          null,
          2
        ),
      },
    ],
    outputSchema: {
      name: "live_strategy_response",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          generatedAt: { type: "string" },
          marketSummary: { type: "string" },
          marketSnapshot: {
            type: "array",
            items: { type: "string" },
          },
          headlineDigest: {
            type: "array",
            items: { type: "string" },
          },
          strategies: {
            type: "object",
            additionalProperties: false,
            properties: {
              conservative: {
                type: "object",
                additionalProperties: false,
                properties: {
                  summary: { type: "string" },
                  thesis: { type: "string" },
                  portfolioFit: { type: "string" },
                  actions: { type: "array", items: { type: "string" } },
                  buyIdeas: { type: "array", items: { type: "string" } },
                  risks: { type: "array", items: { type: "string" } },
                },
                required: [
                  "summary",
                  "thesis",
                  "portfolioFit",
                  "actions",
                  "buyIdeas",
                  "risks",
                ],
              },
              balanced: {
                type: "object",
                additionalProperties: false,
                properties: {
                  summary: { type: "string" },
                  thesis: { type: "string" },
                  portfolioFit: { type: "string" },
                  actions: { type: "array", items: { type: "string" } },
                  buyIdeas: { type: "array", items: { type: "string" } },
                  risks: { type: "array", items: { type: "string" } },
                },
                required: [
                  "summary",
                  "thesis",
                  "portfolioFit",
                  "actions",
                  "buyIdeas",
                  "risks",
                ],
              },
              aggressive: {
                type: "object",
                additionalProperties: false,
                properties: {
                  summary: { type: "string" },
                  thesis: { type: "string" },
                  portfolioFit: { type: "string" },
                  actions: { type: "array", items: { type: "string" } },
                  buyIdeas: { type: "array", items: { type: "string" } },
                  risks: { type: "array", items: { type: "string" } },
                },
                required: [
                  "summary",
                  "thesis",
                  "portfolioFit",
                  "actions",
                  "buyIdeas",
                  "risks",
                ],
              },
            },
            required: ["conservative", "balanced", "aggressive"],
          },
        },
        required: [
          "generatedAt",
          "marketSummary",
          "marketSnapshot",
          "headlineDigest",
          "strategies",
        ],
      },
    },
  });

  const content = extractAssistantText(
    result.choices[0]?.message.content ?? ""
  );
  return parseJsonResponse<LiveStrategyResponse>(content);
}
