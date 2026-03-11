import {
  Building2,
  Globe2,
  Landmark,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";

type LocaleText = {
  zh: string;
  en: string;
};

type Entry = {
  institution: LocaleText;
  account: LocaleText;
  holder: LocaleText;
  handoff: LocaleText;
  status: "active" | "planned" | "review";
};

type CategoryKey = "bank" | "brokerage" | "insurance";

type RegionWallet = {
  id: string;
  title: LocaleText;
  summary: LocaleText;
  categories: Record<CategoryKey, Entry[]>;
};

const statusLabel: Record<Entry["status"], LocaleText> = {
  active: { zh: "已配置", en: "Configured" },
  planned: { zh: "待补充", en: "Planned" },
  review: { zh: "需复核", en: "Needs review" },
};

const statusClass: Record<Entry["status"], string> = {
  active:
    "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  planned:
    "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-900 dark:text-amber-300",
  review:
    "border-blue-200 bg-blue-500/10 text-blue-700 dark:border-blue-900 dark:text-blue-300",
};

const categoryMeta: Record<
  CategoryKey,
  {
    icon: typeof Landmark;
    title: LocaleText;
    description: LocaleText;
  }
> = {
  bank: {
    icon: Landmark,
    title: { zh: "银行信息", en: "Banking" },
    description: {
      zh: "存款、结算、离岸中转与紧急备用金。",
      en: "Deposits, settlement rails, offshore transfers, and emergency cash.",
    },
  },
  brokerage: {
    icon: Building2,
    title: { zh: "证券信息", en: "Brokerage" },
    description: {
      zh: "券商账户、托管平台、股票 / ETF / 基金持仓。",
      en: "Brokerage accounts, custody platforms, and equity / ETF / fund positions.",
    },
  },
  insurance: {
    icon: Shield,
    title: { zh: "保险信息", en: "Insurance" },
    description: {
      zh: "寿险、医疗险、储蓄险与保单受益人。",
      en: "Life, medical, savings policies, and beneficiary setup.",
    },
  },
};

const regionWallets: RegionWallet[] = [
  {
    id: "mainland",
    title: { zh: "中国大陆", en: "Mainland China" },
    summary: {
      zh: "负责人民币主账户、境内券商与基础保障，是日常资金流与家庭生活支出的核心钱包。",
      en: "Holds the primary RMB accounts, onshore brokerages, and core protection for daily family cash flow.",
    },
    categories: {
      bank: [
        {
          institution: { zh: "招商银行", en: "China Merchants Bank" },
          account: {
            zh: "工资 / 结算主账户",
            en: "Payroll / primary settlement",
          },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "预留网银位置、柜台联系人与紧急取证说明。",
            en: "Keep e-banking location, branch contact, and emergency proof instructions.",
          },
          status: "active",
        },
      ],
      brokerage: [
        {
          institution: { zh: "华泰证券", en: "Huatai Securities" },
          account: {
            zh: "A股 / 场内基金主仓",
            en: "A-share / onshore ETF core holdings",
          },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "记录开户营业部、两融情况与资产证明路径。",
            en: "Document branch, margin status, and asset certificate path.",
          },
          status: "active",
        },
      ],
      insurance: [
        {
          institution: { zh: "平安人寿", en: "Ping An Life" },
          account: {
            zh: "重疾 / 医疗保障",
            en: "Critical illness / medical cover",
          },
          holder: { zh: "本人投保", en: "Policyholder: self" },
          handoff: {
            zh: "明确保单号、受益人、理赔联系人。",
            en: "List policy number, beneficiaries, and claims contact.",
          },
          status: "review",
        },
      ],
    },
  },
  {
    id: "hk",
    title: { zh: "中国香港", en: "Hong Kong" },
    summary: {
      zh: "作为离岸中转与港美股入口，适合承接多币种现金流与保单配置。",
      en: "Functions as an offshore transfer and HK/US market access wallet for multi-currency cash flow and policies.",
    },
    categories: {
      bank: [
        {
          institution: { zh: "汇丰香港", en: "HSBC Hong Kong" },
          account: {
            zh: "离岸综合账户",
            en: "Offshore multi-currency account",
          },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "备注常用登录方式、RM 联系人与卡片保管位置。",
            en: "Record login method, RM contact, and card storage location.",
          },
          status: "active",
        },
      ],
      brokerage: [
        {
          institution: { zh: "富途证券", en: "Futu Securities" },
          account: { zh: "港股 / 美股交易账户", en: "HK / US trading account" },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "标注提币 / 提现流程与二次验证方式。",
            en: "Mark withdrawal steps and 2FA method.",
          },
          status: "active",
        },
      ],
      insurance: [
        {
          institution: { zh: "友邦香港", en: "AIA Hong Kong" },
          account: { zh: "美元储蓄险", en: "USD savings policy" },
          holder: { zh: "拟配置", en: "Planned setup" },
          handoff: {
            zh: "待补充投保结构与受益人排序。",
            en: "Add policy structure and beneficiary ordering.",
          },
          status: "planned",
        },
      ],
    },
  },
  {
    id: "us",
    title: { zh: "美国", en: "United States" },
    summary: {
      zh: "集中长期美元资产与全球 ETF 配置，是全球权益与现金储备的重要钱包。",
      en: "Concentrates long-term USD assets and global ETFs as a core growth and reserve wallet.",
    },
    categories: {
      bank: [
        {
          institution: { zh: "华美银行", en: "East West Bank" },
          account: { zh: "美元备用金", en: "USD reserve cash" },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "保留开户地址、wire 指令和月结单位置。",
            en: "Keep branch info, wire instructions, and statement location.",
          },
          status: "active",
        },
      ],
      brokerage: [
        {
          institution: { zh: "嘉信理财", en: "Charles Schwab" },
          account: {
            zh: "美股 / ETF 长期账户",
            en: "Long-term US equity / ETF account",
          },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "记录受益人、税务资料与证券转移路径。",
            en: "Record beneficiaries, tax docs, and transfer workflow.",
          },
          status: "active",
        },
      ],
      insurance: [
        {
          institution: { zh: "美国定期寿险", en: "US term life policy" },
          account: { zh: "家庭风险缓冲", en: "Family risk buffer" },
          holder: { zh: "拟评估", en: "Under review" },
          handoff: {
            zh: "待确认承保人与受益人税务影响。",
            en: "Review underwriting and beneficiary tax impact.",
          },
          status: "planned",
        },
      ],
    },
  },
  {
    id: "sg",
    title: { zh: "新加坡", en: "Singapore" },
    summary: {
      zh: "偏向家族资产保护、备用离岸节点与跨代传承安排。",
      en: "Focused on family asset protection, backup offshore access, and intergenerational succession planning.",
    },
    categories: {
      bank: [
        {
          institution: { zh: "星展银行", en: "DBS Bank" },
          account: { zh: "离岸备用账户", en: "Offshore backup account" },
          holder: { zh: "拟配置", en: "Planned setup" },
          handoff: {
            zh: "作为紧急迁移或跨境家族支出备用。",
            en: "Serves as emergency relocation or cross-border family reserve.",
          },
          status: "planned",
        },
      ],
      brokerage: [
        {
          institution: { zh: "盈透证券", en: "Interactive Brokers" },
          account: { zh: "全球资产交易", en: "Global trading account" },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "保存登录方式、API 权限与资产导出路径。",
            en: "Keep login method, API access, and portfolio export path.",
          },
          status: "active",
        },
      ],
      insurance: [
        {
          institution: {
            zh: "家族信托 / 私人保单",
            en: "Trust-linked / private policy",
          },
          account: { zh: "高净值传承结构", en: "HNW succession structure" },
          holder: { zh: "待设计", en: "To be designed" },
          handoff: {
            zh: "适合后续和律师 / 税务顾问协同完善。",
            en: "To be refined later with legal and tax advisors.",
          },
          status: "planned",
        },
      ],
    },
  },
  {
    id: "other",
    title: { zh: "其他国际", en: "Other International" },
    summary: {
      zh: "用于覆盖欧洲、开曼、数字资产平台等特殊司法辖区或补充钱包。",
      en: "Covers Europe, Cayman structures, digital asset platforms, and any other special-jurisdiction wallets.",
    },
    categories: {
      bank: [
        {
          institution: {
            zh: "欧洲多币种账户",
            en: "European multi-currency account",
          },
          account: { zh: "补充离岸账户", en: "Supplemental offshore account" },
          holder: { zh: "按地区配置", en: "Region-specific owner" },
          handoff: {
            zh: "标明司法辖区、开户原因与继承联系人。",
            en: "Mark jurisdiction, purpose, and beneficiary contact chain.",
          },
          status: "review",
        },
      ],
      brokerage: [
        {
          institution: { zh: "Coinbase / Kraken", en: "Coinbase / Kraken" },
          account: { zh: "数字资产托管", en: "Digital asset custody" },
          holder: { zh: "本人实名", en: "Primary owner" },
          handoff: {
            zh: "关键在于恢复方式、地址白名单和冷钱包说明。",
            en: "Critical items are recovery flow, address allowlists, and cold-wallet notes.",
          },
          status: "active",
        },
      ],
      insurance: [
        {
          institution: { zh: "境外特殊保单", en: "Special offshore policy" },
          account: { zh: "税务 / 传承补充", en: "Tax / succession supplement" },
          holder: { zh: "视结构而定", en: "Structure dependent" },
          handoff: {
            zh: "建议同步律师备忘录与保单摘要。",
            en: "Pair with a legal memo and policy summary.",
          },
          status: "review",
        },
      ],
    },
  },
];

function pick(text: LocaleText, isZh: boolean) {
  return isZh ? text.zh : text.en;
}

export default function WalletPlanningPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const summaryCards = [
    {
      icon: Globe2,
      title: { zh: "按地区分桶", en: "Region buckets" },
      body: {
        zh: "把全球资产拆成多个钱包，继承人不会在紧急情况下从零开始找。",
        en: "Split global assets into distinct wallets so beneficiaries do not start from zero during an emergency.",
      },
    },
    {
      icon: Users,
      title: { zh: "受益人视角", en: "Beneficiary view" },
      body: {
        zh: "记录的是追踪线索，而不是敏感密码本，重点是知道资产在哪、联系谁。",
        en: "This captures tracing clues rather than a password vault — where the assets are, and who to contact.",
      },
    },
    {
      icon: ShieldCheck,
      title: { zh: "定期复核", en: "Quarterly review" },
      body: {
        zh: "每季度确认开户主体、受益人、证明材料和跨境转移路径是否还有效。",
        en: "Review account ownership, beneficiaries, proof documents, and transfer paths every quarter.",
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="space-y-4">
          <Badge variant="outline" className="gap-2 px-3 py-1 text-xs">
            <WalletCards className="h-3.5 w-3.5" />
            {isZh ? "继承追踪场景" : "Succession tracking"}
          </Badge>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {isZh ? "全球钱包规划" : "Global Wallet Planning"}
            </h1>
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">
              {isZh
                ? "这个页面用于把全球资产按地区钱包整理给受益人理解。目标不是暴露敏感信息，而是提前留下清晰的资产追踪路径：在哪个地区、是哪类账户、由谁持有、出现意外时应该先联系谁。"
                : "This page organizes global wealth into regional wallets so beneficiaries can understand how to trace assets. The goal is not to expose sensitive secrets, but to leave a clear path: which jurisdiction, which account type, who owns it, and who should be contacted first in an emergency."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.title.en} className="border-border/60 shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{pick(card.title, isZh)}</CardTitle>
                    <CardDescription className="mt-2 leading-6">
                      {pick(card.body, isZh)}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6">
          {regionWallets.map(region => (
            <Card key={region.id} className="border-border/60 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-primary" />
                      <CardTitle className="text-xl">
                        {pick(region.title, isZh)}
                      </CardTitle>
                    </div>
                    <CardDescription className="max-w-3xl leading-6">
                      {pick(region.summary, isZh)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {isZh ? "地区钱包" : "Regional wallet"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                {(Object.keys(region.categories) as CategoryKey[]).map(
                  categoryKey => {
                    const meta = categoryMeta[categoryKey];
                    const entries = region.categories[categoryKey];
                    const Icon = meta.icon;

                    return (
                      <div
                        key={categoryKey}
                        className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm"
                      >
                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground">
                              {pick(meta.title, isZh)}
                            </h3>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {pick(meta.description, isZh)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {entries.map(entry => (
                            <div
                              key={`${region.id}-${categoryKey}-${entry.institution.en}`}
                              className="rounded-xl border border-border/50 bg-muted/20 p-4"
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-foreground">
                                    {pick(entry.institution, isZh)}
                                  </div>
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    {pick(entry.account, isZh)}
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={statusClass[entry.status]}
                                >
                                  {pick(statusLabel[entry.status], isZh)}
                                </Badge>
                              </div>

                              <div className="space-y-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium text-foreground">
                                    {isZh ? "持有人：" : "Holder: "}
                                  </span>
                                  {pick(entry.holder, isZh)}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">
                                    {isZh ? "交接提示：" : "Handoff note: "}
                                  </span>
                                  {pick(entry.handoff, isZh)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed border-border/70 bg-muted/20 shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>
                {isZh ? "建议下一步" : "Recommended next step"}
              </CardTitle>
            </div>
            <CardDescription className="leading-6">
              {isZh
                ? "接下来可以逐个钱包补充：开户主体、受益人、证明文件位置、登录方式说明，以及发生意外后第一位联系人。这样页面就会从“规划模板”变成真正可执行的财富追踪面板。"
                : "Next, enrich each wallet with account ownership, beneficiaries, document locations, login method notes, and the first contact person after an emergency. That turns this page from a planning template into an actionable wealth-tracking panel."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
