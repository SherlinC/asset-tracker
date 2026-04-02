import { useCallback } from "react";

import { trpc } from "@/lib/trpc";

type UsePortfolioRefreshOptions = {
  isGuestMode: boolean;
  refetchAll: () => Promise<void>;
};

export function usePortfolioRefresh({
  isGuestMode,
  refetchAll,
}: UsePortfolioRefreshOptions) {
  const refreshPrices = trpc.prices.refresh.useMutation();
  const recordPortfolioHistory = trpc.portfolioHistory.record.useMutation();

  const refresh = useCallback(async () => {
    if (isGuestMode) {
      await refetchAll();
      return null;
    }

    const result = await refreshPrices.mutateAsync();
    await recordPortfolioHistory.mutateAsync();
    await refetchAll();
    return result;
  }, [isGuestMode, recordPortfolioHistory, refetchAll, refreshPrices]);

  return {
    refresh,
    isRefreshing: refreshPrices.isPending || recordPortfolioHistory.isPending,
  };
}
