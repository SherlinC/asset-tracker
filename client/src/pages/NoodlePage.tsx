import { MoonStar, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
import NoodlePanel from "@/components/NoodlePanel";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

export default function NoodlePage() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [isRefreshing, setIsRefreshing] = useState(false);
  const utils = trpc.useUtils();

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

  const portfolioSummary = trpc.portfolio.summary.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
  });

  const refreshPrices = trpc.prices.refresh.useMutation({
    onSuccess: async data => {
      if (data.emptyCount > 0 || data.cacheCount > 0) {
        toast.warning(
          `${text.refreshedPartial} (${data.liveCount}/${data.assetCount} live, USD/CNY ${data.exchangeRate.toFixed(4)})`
        );
      } else {
        toast.success(
          `${text.refreshed} (${data.assetCount}/${data.assetCount}, USD/CNY ${data.exchangeRate.toFixed(4)})`
        );
      }

      await Promise.all([
        portfolioSummary.refetch(),
        utils.portfolioHistory.get.invalidate(),
      ]);
    },
    onError: error => {
      toast.error(`${text.refreshFailed}${error.message}`);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPrices.mutateAsync();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="dark -m-4 min-h-[calc(100vh-2rem)] bg-[#02040a] p-4 text-white sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.75)] lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-300/80">
                <MoonStar className="h-4 w-4" />
                <span>{text.hint}</span>
              </div>
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  <UtensilsCrossed className="h-7 w-7 text-amber-300" />
                  {text.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-white/65 sm:text-base">
                  {text.subtitle}
                </p>
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || refreshPrices.isPending}
              variant="outline"
              size="sm"
              className="border-white/15 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {text.refresh}
            </Button>
          </div>

          {portfolioSummary.isLoading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
              {text.loading}
            </div>
          ) : (
            <NoodlePanel data={portfolioSummary.data} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
