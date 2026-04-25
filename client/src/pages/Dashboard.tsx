import { PieChart, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
import HoldingsList from "@/components/HoldingsList";
import PageHeader from "@/components/PageHeader";
import PortfolioSummary from "@/components/PortfolioSummary";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { usePortfolioRefresh } from "@/hooks/usePortfolioRefresh";
import { usePriceUpdates } from "@/hooks/usePriceUpdates";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scrollToCategory, setScrollToCategory] = useState<string | null>(null);
  const hasRecordedThisSession = useRef(false);
  const text = useMemo(() =>
    language === "zh"
      ? {
          refreshed: "价格和汇率已刷新",
          refreshedPartial: "部分资产未拿到实时价格，已回退缓存",
          refreshFailed: "刷新价格失败：",
          loading: "加载中...",
          title: "资产组合",
          subtitle: "实时追踪你的投资组合",
          tag: "投资总览",
          refresh: "刷新",
          loadingPortfolio: "正在加载资产组合...",
          loadingHoldings: "正在加载持仓...",
        }
      : {
          refreshed: "Prices and FX rates refreshed",
          refreshedPartial:
            "Some assets could not fetch live prices and fell back to cache",
          refreshFailed: "Failed to refresh prices:",
          loading: "Loading...",
          title: "Asset Portfolio",
          subtitle: "Track your investments in real time",
          tag: "Overview",
          refresh: "Refresh",
          loadingPortfolio: "Loading portfolio...",
          loadingHoldings: "Loading holdings...",
        },
    [language]
  );

  const portfolioData = usePortfolioData({
    includeSummary: true,
    includeHoldings: true,
    trackGuestHistory: true,
  });
  const isGuestMode = portfolioData.isGuestMode;
  const displayedHoldings = portfolioData.holdings;
  const activePortfolioSummary = portfolioData.summaryQuery;
  const { refetch: refetchPortfolioSummary } = activePortfolioSummary;

  const refreshDashboardData = async () => {
    if (isGuestMode) {
      await refetchPortfolioSummary();
      return;
    }

    await Promise.all([portfolioData.refetchAll()]);
  };

  const portfolioRefresh = usePortfolioRefresh({
    isGuestMode,
    refetchAll: portfolioData.refetchAll,
  });
  const utils = trpc.useUtils();
  const recordPortfolioHistory = trpc.portfolioHistory.record.useMutation();

  usePriceUpdates(10 * 60 * 1000, isGuestMode, isGuestMode);

  // Record current portfolio value once when dashboard loads with holdings (so chart has linked data)
  useEffect(() => {
    if (
      isGuestMode ||
      hasRecordedThisSession.current ||
      !displayedHoldings?.length
    )
      return;
    hasRecordedThisSession.current = true;
    recordPortfolioHistory.mutate(undefined, {
      onSuccess: () => {
        void Promise.all([
          utils.portfolioHistory.get.invalidate(),
          utils.portfolioHistory.getByRange.invalidate(),
        ]);
      },
    });
  }, [displayedHoldings.length, isGuestMode, recordPortfolioHistory, utils]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await portfolioRefresh.refresh();

      if (result == null) {
        toast.success(text.refreshed);
      } else {
        if (result.emptyCount > 0 || result.cacheCount > 0) {
          toast.warning(
            `${text.refreshedPartial} (${result.liveCount}/${result.assetCount} live, USD/CNY ${result.exchangeRate.toFixed(4)})`
          );
        } else {
          toast.success(
            `${text.refreshed} (${result.assetCount}/${result.assetCount}, USD/CNY ${result.exchangeRate.toFixed(4)})`
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : text.refreshFailed;
      toast.error(`${text.refreshFailed} ${message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (portfolioData.authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {text.loading}
      </div>
    );
  }

  return (
    <DashboardLayout
      exportHoldings={displayedHoldings}
      assets={portfolioData.assets}
      onPortfolioChanged={refreshDashboardData}
    >
      <div className="space-y-6">
        {/* Header with refresh button */}
        <PageHeader
          title={text.title}
          description={text.subtitle}
          pillLabel={{
            icon: PieChart,
            text: text.tag,
          }}
        >
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || portfolioRefresh.isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {text.refresh}
          </Button>
        </PageHeader>

        {/* Portfolio Summary */}
        {activePortfolioSummary.isLoading ? (
          <div className="bg-card rounded-lg p-8 text-center text-muted-foreground">
            {text.loadingPortfolio}
          </div>
        ) : (
          <PortfolioSummary data={portfolioData.summary} />
        )}

        {/* Holdings List */}
        {portfolioData.isHoldingsLoading ? (
          <div className="bg-card rounded-lg p-8 text-center text-muted-foreground">
            {text.loadingHoldings}
          </div>
        ) : (
          <HoldingsList
            holdings={displayedHoldings}
            portfolioData={portfolioData.summary}
            scrollToCategory={scrollToCategory}
            onScrollToCategoryHandled={() => setScrollToCategory(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
