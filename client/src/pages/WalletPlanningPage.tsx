import { Globe2, Sparkles, WalletCards } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import type { LocalizedText } from "@/lib/navigation";
import {
  REGION_WALLETS,
  WALLET_CATEGORY_META,
  WALLET_PLANNING_COPY,
  WALLET_PLANNING_SUMMARY_CARDS,
  WALLET_STATUS_CLASS_NAMES,
  WALLET_STATUS_LABELS,
  type WalletCategoryKey,
} from "@/lib/walletPlanning";

function pick(text: LocalizedText, isZh: boolean) {
  return isZh ? text.zh : text.en;
}

export default function WalletPlanningPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <PageHeader
          title={pick(WALLET_PLANNING_COPY.title, isZh)}
          description={pick(WALLET_PLANNING_COPY.description, isZh)}
          pillLabel={{
            icon: WalletCards,
            text: pick(WALLET_PLANNING_COPY.badge, isZh),
          }}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {WALLET_PLANNING_SUMMARY_CARDS.map(card => {
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
          {REGION_WALLETS.map(region => (
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
                    {pick(WALLET_PLANNING_COPY.regionBadge, isZh)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                {(Object.keys(region.categories) as WalletCategoryKey[]).map(
                  categoryKey => {
                    const meta = WALLET_CATEGORY_META[categoryKey];
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
                                  className={
                                    WALLET_STATUS_CLASS_NAMES[entry.status]
                                  }
                                >
                                  {pick(
                                    WALLET_STATUS_LABELS[entry.status],
                                    isZh
                                  )}
                                </Badge>
                              </div>

                              <div className="space-y-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium text-foreground">
                                    {pick(
                                      WALLET_PLANNING_COPY.holderLabel,
                                      isZh
                                    )}
                                  </span>
                                  {pick(entry.holder, isZh)}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">
                                    {pick(
                                      WALLET_PLANNING_COPY.handoffLabel,
                                      isZh
                                    )}
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
                {pick(WALLET_PLANNING_COPY.nextStepTitle, isZh)}
              </CardTitle>
            </div>
            <CardDescription className="leading-6">
              {pick(WALLET_PLANNING_COPY.nextStepDescription, isZh)}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
