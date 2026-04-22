import { MoonStar, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
import NoodlePanel from "@/components/NoodlePanel";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { usePortfolioRefresh } from "@/hooks/usePortfolioRefresh";

export default function NoodlePage() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [isRefreshing, setIsRefreshing] = useState(false);
  const portfolioData = usePortfolioData({
    includeSummary: true,
    includeHistory: true,
    historyDays: 2,
    summaryRefetchInterval: 10 * 60 * 1000,
    trackGuestHistory: true,
  });
  const portfolioRefresh = usePortfolioRefresh({
    isGuestMode: portfolioData.isGuestMode,
    refetchAll: portfolioData.refetchAll,
  });

  const text = isZh
    ? {
        title: "坐吃山空",
        subtitle: "把你的总资产翻译成一块深色生存面板。",
        refresh: "刷新",
        refreshed: "生存面板已刷新",
        refreshedPartial: "部分资产未拿到实时价格，已回退缓存",
        refreshFailed: "刷新失败：",
        loading: "正在加载坐吃山空面板...",
        hint: "这是一个深色专注页面，用来感受财富与生活成本的关系。",
      }
    : {
        title: "Spendover",
        subtitle: "Translate your net worth into a dark survival console.",
        refresh: "Refresh",
        refreshed: "Consumption console refreshed",
        refreshedPartial:
          "Some assets could not fetch live prices and fell back to cache",
        refreshFailed: "Refresh failed: ",
        loading: "Loading Spendover...",
        hint: "This is a dark focus page designed to feel the relationship between wealth and living costs.",
      };

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
      toast.error(`${text.refreshFailed}${message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <DashboardLayout
      onPortfolioChanged={async () => {
        await portfolioRefresh.refresh();
      }}
    >
      <div className="dark -m-4 flex flex-1 min-h-[calc(100vh-2rem)] flex-col bg-[#02040a] p-4 text-white sm:p-6">
        <div className="mx-auto flex w-full flex-1 flex-col space-y-6">
          {portfolioData.isSummaryLoading ? (
            <div className="flex-1 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
              {text.loading}
            </div>
          ) : (
            <NoodlePanel
              className="flex-1"
              data={portfolioData.summary}
              historyData={portfolioData.history}
              historyLoading={portfolioData.isHistoryLoading}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
