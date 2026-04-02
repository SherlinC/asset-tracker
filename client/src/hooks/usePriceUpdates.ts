import { useEffect, useRef } from "react";

import { trpc } from "@/lib/trpc";

/**
 * Hook for automatic price updates at regular intervals.
 * Refreshes server-side price cache on an interval, then invalidates summary data.
 * @param intervalMs - Refresh interval in ms (default 10 minutes)
 */
export function usePriceUpdates(
  intervalMs: number = 600000,
  skipPortfolioHistory: boolean = false,
  disabled: boolean = false
) {
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
      if (!skipPortfolioHistory) {
        recordPortfolioHistory.mutate();
      }
    },
  });
  const { mutate } = refreshPrices;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const doRefresh = () => {
      mutate();
    };
    intervalRef.current = setInterval(doRefresh, intervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [disabled, intervalMs, mutate]);

  return refreshPrices;
}
