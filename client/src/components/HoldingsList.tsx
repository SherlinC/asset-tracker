import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { usePortfolioActions } from "@/hooks/usePortfolioActions";

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
import { getColorByType, TYPE_LABELS_ZH } from "./portfolio-summary/constants";
import { buildTypeAllocation } from "./portfolio-summary/utils";

import type {
  CurrencyDisplay,
  EditHoldingState,
  HoldingsListProps,
} from "./holdings-list/types";

export default function HoldingsList({
  holdings,
  portfolioData,
  scrollToCategory,
  onScrollToCategoryHandled,
}: HoldingsListProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const portfolioActions = usePortfolioActions();
  const isGuestMode = portfolioActions.isGuestMode;
  const [currencyDisplay, setCurrencyDisplay] =
    useState<CurrencyDisplay>("USD");
  const [expandedAssets, setExpandedAssets] = useState<Record<number, boolean>>(
    {}
  );
  const [editHolding, setEditHolding] = useState<EditHoldingState | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const exchangeRate = portfolioData?.exchangeRate ?? DEFAULT_USD_CNY_RATE;
  const totalPortfolioUSD = portfolioData?.totalValueUSD ?? 0;
  const portfolioAssets = useMemo(
    () => portfolioData?.assets ?? [],
    [portfolioData?.assets]
  );

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
  const currentTab = activeTab ?? defaultTab;

  const topCategoryCards = useMemo(() => {
    const typeAllocation = buildTypeAllocation(portfolioAssets);
    const definitions = [
      {
        type: "stock",
        categories: ["a_stock", "hk_stock", "us_stock"] as const,
      },
      {
        type: "fund",
        categories: ["fund", "us_etf"] as const,
      },
      {
        type: "crypto",
        categories: ["crypto"] as const,
      },
      {
        type: "currency",
        categories: ["currency"] as const,
      },
    ];

    return definitions
      .map(item => {
        const valueUSD = typeAllocation[item.type] ?? 0;
        const convertedValue =
          currencyDisplay === "CNY" ? valueUSD * exchangeRate : valueUSD;
        const percentage =
          totalPortfolioUSD > 0 ? (valueUSD / totalPortfolioUSD) * 100 : 0;
        const holdingCount = item.categories.reduce(
          (sum, category) =>
            sum + (holdingsByCategory.get(category)?.length ?? 0),
          0
        );
        const targetTab = item.categories.find(category =>
          orderedCategories.includes(category)
        );

        return {
          ...item,
          label: isZh
            ? (TYPE_LABELS_ZH[item.type] ?? item.type)
            : item.type.charAt(0).toUpperCase() + item.type.slice(1),
          valueUSD,
          convertedValue,
          percentage,
          holdingCount,
          targetTab: targetTab ?? null,
          isActive:
            targetTab !== undefined && targetTab !== null
              ? item.categories.some(category => category === currentTab)
              : false,
        };
      })
      .filter(item => item.valueUSD > 0 && item.targetTab !== null);
  }, [
    currencyDisplay,
    currentTab,
    exchangeRate,
    holdingsByCategory,
    isZh,
    orderedCategories,
    portfolioAssets,
    totalPortfolioUSD,
  ]);

  useEffect(() => {
    const target = resolveScrollTarget(scrollToCategory, orderedCategories);

    if (target && orderedCategories.includes(target)) {
      setActiveTab(target);
    }

    if (scrollToCategory != null && orderedCategories.length > 0) {
      onScrollToCategoryHandled?.();
    }
  }, [scrollToCategory, orderedCategories, onScrollToCategoryHandled]);

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editHolding || !editHolding.quantity.trim()) {
      return;
    }

    if (isGuestMode) {
      try {
        await portfolioActions.updateHolding({
          holdingId: editHolding.id,
          quantity: editHolding.quantity.trim(),
          costBasis: editHolding.costBasis.trim() || undefined,
          annualInterestRate:
            editHolding.assetType === "currency"
              ? editHolding.annualInterestRate.trim() || undefined
              : undefined,
        });
        toast.success(isZh ? "已更新持仓" : "Holding updated successfully");
        setEditHolding(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : isZh
              ? "更新失败"
              : "Update failed";
        toast.error(
          isZh ? `更新失败: ${message}` : `Update failed: ${message}`
        );
      }

      return;
    }

    portfolioActions
      .updateHolding({
        holdingId: editHolding.id,
        quantity: editHolding.quantity.trim(),
        costBasis: editHolding.costBasis.trim() || undefined,
        annualInterestRate:
          editHolding.assetType === "currency"
            ? editHolding.annualInterestRate.trim() || undefined
            : undefined,
      })
      .then(() => {
        toast.success(isZh ? "已更新持仓" : "Holding updated successfully");
        setEditHolding(null);
      })
      .catch(error => {
        const message =
          error instanceof Error
            ? error.message
            : isZh
              ? "更新失败"
              : "Update failed";
        toast.error(
          isZh ? `更新失败: ${message}` : `Update failed: ${message}`
        );
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
          {topCategoryCards.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {topCategoryCards.map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setActiveTab(item.targetTab)}
                  className={`rounded-lg border border-transparent p-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col items-center justify-center gap-2 ${
                    item.isActive
                      ? "border-border bg-muted/50"
                      : "hover:border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getColorByType(item.type) }}
                    />
                    <p className="text-sm font-medium capitalize text-muted-foreground">
                      {item.label}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground">
                      {item.percentage.toFixed(2)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {currencyDisplay === "CNY" ? "¥" : "$"}
                      {item.convertedValue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {isZh
                        ? `${item.holdingCount} 个资产`
                        : `${item.holdingCount} assets`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <Tabs
            value={currentTab}
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
                  onStartEdit={setEditHolding}
                  onExpandAsset={expandAsset}
                  onDeleteHolding={holdingId => {
                    portfolioActions
                      .deleteHolding(holdingId)
                      .then(() => {
                        toast.success(
                          isZh ? "已删除持仓" : "Holding deleted successfully"
                        );
                      })
                      .catch(error => {
                        const message =
                          error instanceof Error
                            ? error.message
                            : isZh
                              ? "删除失败"
                              : "Delete failed";
                        toast.error(
                          isZh
                            ? `删除失败: ${message}`
                            : `Failed to delete holding: ${message}`
                        );
                      });
                  }}
                  deletePending={portfolioActions.isDeletingHolding}
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
        isPending={portfolioActions.isUpdatingHolding}
      />
    </>
  );
}
