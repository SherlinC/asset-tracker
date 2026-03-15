import { RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/_core/hooks/useAuth";
import AddHoldingDialog from "@/components/AddHoldingDialog";
import DashboardLayout from "@/components/DashboardLayout";
import HoldingsList from "@/components/HoldingsList";
import PortfolioSummary from "@/components/PortfolioSummary";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { usePriceUpdates } from "@/hooks/usePriceUpdates";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [scrollToCategory, setScrollToCategory] = useState<string | null>(null);
  const hasRecordedThisSession = useRef(false);
  const text =
    language === "zh"
      ? {
          refreshed: "价格刷新成功",
          refreshFailed: "刷新价格失败：",
          loading: "加载中...",
          title: "资产组合",
          subtitle: "实时追踪你的投资组合",
          refresh: "刷新",
          addAsset: "添加资产",
          loadingPortfolio: "正在加载资产组合...",
          loadingHoldings: "正在加载持仓...",
        }
      : {
          refreshed: "Prices refreshed successfully",
          refreshFailed: "Failed to refresh prices:",
          loading: "Loading...",
          title: "Asset Portfolio",
          subtitle: "Track your investments in real time",
          refresh: "Refresh",
          addAsset: "Add Asset",
          loadingPortfolio: "Loading portfolio...",
          loadingHoldings: "Loading holdings...",
        };

  const utils = trpc.useUtils();
  const portfolioSummary = trpc.portfolio.summary.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
  });
  const holdings = trpc.holdings.list.useQuery();
  const assets = trpc.assets.list.useQuery();

  const recordPortfolio = trpc.portfolioHistory.record.useMutation({
    onSuccess: () => {
      void utils.portfolioHistory.get.invalidate();
    },
  });
  const { mutate: recordPortfolioMutate } = recordPortfolio;
  const { mutateAsync: recordPortfolioMutateAsync } = recordPortfolio;
  const { refetch: refetchPortfolioSummary } = portfolioSummary;

  const refreshDashboardData = async () => {
    await Promise.all([
      assets.refetch(),
      holdings.refetch(),
      refetchPortfolioSummary(),
      utils.portfolioHistory.get.invalidate(),
    ]);
  };

  usePriceUpdates(10 * 60 * 1000);

  // Record current portfolio value once when dashboard loads with holdings (so chart has linked data)
  useEffect(() => {
    if (hasRecordedThisSession.current || !holdings.data?.length) return;
    hasRecordedThisSession.current = true;
    recordPortfolioMutate(undefined);
  }, [holdings.data?.length, recordPortfolioMutate]);

  // Mutations
  const refreshPrices = trpc.prices.refresh.useMutation({
    onSuccess: () => {
      toast.success(text.refreshed);
      void refreshDashboardData();
    },
    onError: error => {
      toast.error(`${text.refreshFailed} ${error.message}`);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPrices.mutateAsync();
      await recordPortfolioMutateAsync();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {text.loading}
      </div>
    );
  }

  return (
    <DashboardLayout exportHoldings={holdings.data}>
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{text.title}</h1>
            <p className="text-muted-foreground mt-1">{text.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || refreshPrices.isPending}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {text.refresh}
            </Button>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              {text.addAsset}
            </Button>
          </div>
        </div>

        {/* Portfolio Summary */}
        {portfolioSummary.isLoading ? (
          <div className="bg-card rounded-lg p-8 text-center text-muted-foreground">
            {text.loadingPortfolio}
          </div>
        ) : (
          <PortfolioSummary
            data={portfolioSummary.data}
            onCategoryClick={type => {
              setScrollToCategory(type);
              setTimeout(() => {
                document
                  .getElementById("holdings-section")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 0);
            }}
          />
        )}

        {/* Holdings List */}
        {holdings.isLoading ? (
          <div className="bg-card rounded-lg p-8 text-center text-muted-foreground">
            {text.loadingHoldings}
          </div>
        ) : (
          <HoldingsList
            holdings={holdings.data || []}
            onRefresh={() => {
              void refreshDashboardData();
            }}
            scrollToCategory={scrollToCategory}
            onScrollToCategoryHandled={() => setScrollToCategory(null)}
          />
        )}

        {/* Add Holding Dialog */}
        <AddHoldingDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          assets={assets.data || []}
          onSuccess={async () => {
            await refreshDashboardData();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
