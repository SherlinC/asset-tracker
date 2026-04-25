import { useCallback, useEffect, useMemo, useRef } from "react";

import { useAuth } from "@/_core/hooks/useAuth";
import type { Holding } from "@/components/holdings-list/types";
import type { PortfolioData } from "@/components/portfolio-summary/types";
import type { PortfolioHistoryRecord } from "@/components/portfolio-value-chart/types";
import { useGuestPortfolio } from "@/hooks/useGuestPortfolio";
import { trpc } from "@/lib/trpc";

type UsePortfolioDataOptions = {
  includeSummary?: boolean;
  includeAssets?: boolean;
  includeHoldings?: boolean;
  includeHistory?: boolean;
  historyDays?: number;
  summaryRefetchInterval?: number;
  trackGuestHistory?: boolean;
};

type PortfolioMode = "guest" | "authenticated";

const ALL_HISTORY_DAYS = 3650;

function uniqueAssetsFromHoldings(holdings: Holding[]): Holding["asset"][] {
  const assetsById = new Map<number, Holding["asset"]>();

  for (const holding of holdings) {
    assetsById.set(holding.asset.id, holding.asset);
  }

  return Array.from(assetsById.values());
}

function filterHistoryByDays(
  history: PortfolioHistoryRecord[],
  historyDays?: number
): PortfolioHistoryRecord[] {
  if (historyDays == null) {
    return history;
  }

  const since = Date.now() - historyDays * 24 * 60 * 60 * 1000;

  return history.filter(record => {
    const timestamp = new Date(record.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= since;
  });
}

export function usePortfolioData(options?: UsePortfolioDataOptions) {
  const optionsMemo = useMemo(() => ({
    includeSummary: true,
    includeAssets: false,
    includeHoldings: false,
    includeHistory: false,
    historyDays: ALL_HISTORY_DAYS,
    summaryRefetchInterval: undefined,
    trackGuestHistory: false,
    ...options
  }), [options]);

  const {
    includeSummary,
    includeAssets,
    includeHoldings,
    includeHistory,
    historyDays,
    summaryRefetchInterval,
    trackGuestHistory,
  } = optionsMemo;

  const { loading: authLoading, user } = useAuth();
  const guestPortfolio = useGuestPortfolio();
  const guestHoldings = guestPortfolio.holdings;
  const guestAssets = guestPortfolio.assets;
  const guestHistory = guestPortfolio.history;
  const guestPreviewInput = guestPortfolio.previewInput;
  const ensureGuestHistoryComparisonSeed =
    guestPortfolio.ensureHistoryComparisonSeed;
  const recordGuestHistorySnapshot = guestPortfolio.recordHistorySnapshot;
  const lastGuestHistoryKey = useRef<string | null>(null);
  const isGuestMode = useMemo(() => user?.loginMethod === "guest-access", [user]);
  const mode: PortfolioMode | null = useMemo(() => {
    if (authLoading) return null;
    return isGuestMode ? "guest" : "authenticated";
  }, [authLoading, isGuestMode]);

  const authSummaryQuery = trpc.portfolio.summary.useQuery(undefined, {
    enabled: includeSummary && !authLoading && !isGuestMode,
    refetchInterval: summaryRefetchInterval,
  });
  const guestSummaryQuery = trpc.portfolio.preview.useQuery(guestPreviewInput, {
    enabled: includeSummary && !authLoading && isGuestMode,
    refetchInterval: summaryRefetchInterval,
  });
  const authHoldingsQuery = trpc.holdings.list.useQuery(undefined, {
    enabled: includeHoldings && !authLoading && !isGuestMode,
  });
  const authAssetsQuery = trpc.assets.list.useQuery(undefined, {
    enabled: includeAssets && !authLoading && !isGuestMode,
  });
  const authHistoryQuery = trpc.portfolioHistory.get.useQuery(
    { days: historyDays },
    {
      enabled: includeHistory && !authLoading && !isGuestMode,
    }
  );

  const summary: PortfolioData | undefined = useMemo(() => {
    return isGuestMode ? guestSummaryQuery.data : authSummaryQuery.data;
  }, [isGuestMode, guestSummaryQuery.data, authSummaryQuery.data]);
  
  const holdings = useMemo(
    () => (isGuestMode ? guestHoldings : (authHoldingsQuery.data ?? [])),
    [authHoldingsQuery.data, guestHoldings, isGuestMode]
  );
  
  const assets = useMemo(
    () =>
      isGuestMode
        ? guestAssets
        : includeAssets
          ? (authAssetsQuery.data ?? [])
          : uniqueAssetsFromHoldings(holdings),
    [authAssetsQuery.data, guestAssets, holdings, includeAssets, isGuestMode]
  );
  
  const history = useMemo(
    () =>
      isGuestMode
        ? filterHistoryByDays(guestHistory, historyDays)
        : (authHistoryQuery.data ?? []),
    [authHistoryQuery.data, guestHistory, historyDays, isGuestMode]
  );

  useEffect(() => {
    const totalValueUSD = guestSummaryQuery.data?.totalValueUSD;

    if (
      !trackGuestHistory ||
      !isGuestMode ||
      totalValueUSD == null ||
      !includeSummary ||
      holdings.length === 0
    ) {
      return;
    }

    ensureGuestHistoryComparisonSeed(totalValueUSD);

    const signature = JSON.stringify([
      holdings.length,
      totalValueUSD.toFixed(2),
    ]);

    if (lastGuestHistoryKey.current === signature) {
      return;
    }

    lastGuestHistoryKey.current = signature;
    recordGuestHistorySnapshot(totalValueUSD);
  }, [
    guestSummaryQuery.data?.totalValueUSD,
    holdings.length,
    includeSummary,
    ensureGuestHistoryComparisonSeed,
    isGuestMode,
    recordGuestHistorySnapshot,
    trackGuestHistory,
  ]);

  const refetchSummary = useCallback(async () => {
    if (!includeSummary) return;

    if (isGuestMode) {
      await guestSummaryQuery.refetch();
      return;
    }

    await authSummaryQuery.refetch();
  }, [authSummaryQuery, guestSummaryQuery, includeSummary, isGuestMode]);

  const refetchHoldings = useCallback(async () => {
    if (!includeHoldings || isGuestMode) return;
    await authHoldingsQuery.refetch();
  }, [authHoldingsQuery, includeHoldings, isGuestMode]);

  const refetchAssets = useCallback(async () => {
    if (!includeAssets || isGuestMode) return;
    await authAssetsQuery.refetch();
  }, [authAssetsQuery, includeAssets, isGuestMode]);

  const refetchHistory = useCallback(async () => {
    if (!includeHistory || isGuestMode) return;
    await authHistoryQuery.refetch();
  }, [authHistoryQuery, includeHistory, isGuestMode]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchSummary(),
      refetchAssets(),
      refetchHoldings(),
      refetchHistory(),
    ]);
  }, [refetchAssets, refetchHistory, refetchHoldings, refetchSummary]);

  const loadingStates = useMemo(() => ({
    isSummaryLoading: includeSummary
      ? authLoading ||
        (isGuestMode ? guestSummaryQuery.isLoading : authSummaryQuery.isLoading)
      : false,
    isHoldingsLoading: includeHoldings
      ? authLoading || (!isGuestMode && authHoldingsQuery.isLoading)
      : false,
    isAssetsLoading: includeAssets
      ? authLoading || (!isGuestMode && authAssetsQuery.isLoading)
      : false,
    isHistoryLoading: includeHistory
      ? authLoading || (!isGuestMode && authHistoryQuery.isLoading)
      : false,
  }), [
    includeSummary, includeHoldings, includeAssets, includeHistory,
    authLoading, isGuestMode,
    guestSummaryQuery.isLoading, authSummaryQuery.isLoading,
    authHoldingsQuery.isLoading, authAssetsQuery.isLoading, authHistoryQuery.isLoading
  ]);

  return {
    mode,
    user,
    isGuestMode,
    isAuthenticatedMode: mode === "authenticated",
    isReady: !authLoading,
    authLoading,
    summary,
    holdings,
    assets,
    history,
    ...loadingStates,
    assetsQuery: authAssetsQuery,
    summaryQuery: isGuestMode ? guestSummaryQuery : authSummaryQuery,
    holdingsQuery: authHoldingsQuery,
    historyQuery: authHistoryQuery,
    refetchSummary,
    refetchAssets,
    refetchHoldings,
    refetchHistory,
    refetchAll,
  };
}
