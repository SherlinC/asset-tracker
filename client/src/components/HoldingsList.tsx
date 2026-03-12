import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

import { DEFAULT_USD_CNY_RATE } from "@shared/exchangeRates";

import { CATEGORY_LABELS, CATEGORY_LABELS_EN } from "./holdings-list/constants";
import { HoldingsCategoryTable } from "./holdings-list/HoldingsCategoryTable";
import { HoldingsEditDialog } from "./holdings-list/HoldingsEditDialog";
import { HoldingsEmptyState } from "./holdings-list/HoldingsEmptyState";
import {
  buildAggregatedHoldings,
  groupHoldingsByCategory,
  resolveScrollTarget,
} from "./holdings-list/utils";

import type {
  CurrencyDisplay,
  EditHoldingState,
  HoldingsListProps,
} from "./holdings-list/types";

export default function HoldingsList({
  holdings,
  onRefresh,
  scrollToCategory,
  onScrollToCategoryHandled,
}: HoldingsListProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [, navigate] = useLocation();
  const [currencyDisplay, setCurrencyDisplay] =
    useState<CurrencyDisplay>("USD");
  const [expandedAssets, setExpandedAssets] = useState<Record<number, boolean>>(
    {}
  );
  const [editHolding, setEditHolding] = useState<EditHoldingState | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const portfolioSummary = trpc.portfolio.summary.useQuery();
  const exchangeRate =
    portfolioSummary.data?.exchangeRate ?? DEFAULT_USD_CNY_RATE;
  const totalPortfolioUSD = portfolioSummary.data?.totalValueUSD ?? 0;
  const portfolioAssets = useMemo(
    () => portfolioSummary.data?.assets ?? [],
    [portfolioSummary.data?.assets]
  );

  const updateHolding = trpc.holdings.update.useMutation({
    onSuccess: async () => {
      toast.success("已更新持仓");
      setEditHolding(null);
      onRefresh();
    },
    onError: error => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteHolding = trpc.holdings.delete.useMutation({
    onSuccess: () => {
      toast.success(isZh ? "已删除持仓" : "Holding deleted successfully");
      onRefresh();
    },
    onError: error => {
      toast.error(
        isZh
          ? `删除失败: ${error.message}`
          : `Failed to delete holding: ${error.message}`
      );
    },
  });

  const aggregatedHoldings = useMemo(
    () => buildAggregatedHoldings(holdings, portfolioAssets),
    [holdings, portfolioAssets]
  );
  const { holdingsByCategory, orderedCategories } = useMemo(
    () => groupHoldingsByCategory(aggregatedHoldings),
    [aggregatedHoldings]
  );

  const defaultTab =
    orderedCategories.length > 0 ? orderedCategories[0] : "other";

  useEffect(() => {
    const target = resolveScrollTarget(scrollToCategory, orderedCategories);

    if (target && orderedCategories.includes(target)) {
      setActiveTab(target);
    }

    if (scrollToCategory != null && orderedCategories.length > 0) {
      onScrollToCategoryHandled?.();
    }
  }, [scrollToCategory, orderedCategories, onScrollToCategoryHandled]);

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!editHolding || !editHolding.quantity.trim()) {
      return;
    }

    updateHolding.mutate({
      holdingId: editHolding.id,
      quantity: editHolding.quantity.trim(),
      costBasis: editHolding.costBasis.trim() || undefined,
    });
  };

  const toggleExpanded = (assetId: number) => {
    setExpandedAssets(prev => ({
      ...prev,
      [assetId]: !prev[assetId],
    }));
  };

  const expandAsset = (assetId: number) => {
    setExpandedAssets(prev => ({
      ...prev,
      [assetId]: true,
    }));
  };

  if (holdings.length === 0) {
    return <HoldingsEmptyState isZh={isZh} />;
  }

  return (
    <>
      <Card id="holdings-section" className="scroll-mt-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{isZh ? "我的持仓" : "Your Holdings"}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isZh ? "显示：" : "Display:"}
            </span>
            <Select
              value={currencyDisplay}
              onValueChange={value =>
                setCurrencyDisplay(value as CurrencyDisplay)
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab ?? defaultTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-3 flex flex-wrap gap-1">
              {orderedCategories.map(category => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="data-[state=active]:bg-background"
                >
                  {isZh
                    ? CATEGORY_LABELS[category]
                    : CATEGORY_LABELS_EN[category]}
                  <span className="ml-1.5 text-muted-foreground">
                    ({(holdingsByCategory.get(category) ?? []).length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {orderedCategories.map(category => (
              <TabsContent key={category} value={category} className="mt-0">
                <HoldingsCategoryTable
                  isZh={isZh}
                  currencyDisplay={currencyDisplay}
                  exchangeRate={exchangeRate}
                  totalPortfolioUSD={totalPortfolioUSD}
                  groups={holdingsByCategory.get(category) ?? []}
                  expandedAssets={expandedAssets}
                  onToggleExpanded={toggleExpanded}
                  onNavigateToAsset={assetId => navigate(`/asset/${assetId}`)}
                  onStartEdit={setEditHolding}
                  onExpandAsset={expandAsset}
                  onDeleteHolding={holdingId =>
                    deleteHolding.mutate({ holdingId })
                  }
                  deletePending={deleteHolding.isPending}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <HoldingsEditDialog
        editHolding={editHolding}
        setEditHolding={setEditHolding}
        onSubmit={handleEditSubmit}
        isPending={updateHolding.isPending}
      />
    </>
  );
}
