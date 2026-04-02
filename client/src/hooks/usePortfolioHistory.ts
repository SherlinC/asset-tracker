import { useMemo } from "react";

import type {
  PortfolioHistoryRecord,
  TimeRange,
} from "@/components/portfolio-value-chart/types";
import { getHistoryDays } from "@/components/portfolio-value-chart/utils";
import { usePortfolioData } from "@/hooks/usePortfolioData";

type UsePortfolioHistoryOptions = {
  trackGuestHistory?: boolean;
};

export function usePortfolioHistory(
  timeRange: TimeRange,
  options?: UsePortfolioHistoryOptions
) {
  const { trackGuestHistory = false } = options ?? {};
  const historyDays = getHistoryDays(timeRange);
  const portfolioData = usePortfolioData({
    includeSummary: false,
    includeHistory: true,
    historyDays,
    trackGuestHistory,
  });

  const history = useMemo<PortfolioHistoryRecord[]>(
    () => portfolioData.history,
    [portfolioData.history]
  );

  return {
    ...portfolioData,
    history,
  };
}
