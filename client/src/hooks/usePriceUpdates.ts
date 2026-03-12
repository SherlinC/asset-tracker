import { useEffect, useRef } from "react";

import { trpc } from "@/lib/trpc";

/**
 * Hook for automatic price updates at regular intervals.
 * Invalidates portfolio.summary so the UI refetches real-time prices.
 * @param intervalMs - Refresh interval in ms (default 10 minutes)
 */
export function usePriceUpdates(intervalMs: number = 600000) {
  const utils = trpc.useUtils();
  const recordPortfolioHistory = trpc.portfolioHistory.record.useMutation({
    onSuccess: () => {
      void utils.portfolioHistory.get.invalidate();
    },
  });
  const refreshPrices = trpc.prices.refresh.useMutation({
    onSuccess: () => {
      void utils.portfolio.summary.invalidate();
      void utils.holdings.list.invalidate();
      recordPortfolioHistory.mutate();
    },
  });
  const { mutate } = refreshPrices;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const doRefresh = () => {
      mutate();
    };
    doRefresh();
    intervalRef.current = setInterval(doRefresh, intervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, mutate]);

  return refreshPrices;
}
