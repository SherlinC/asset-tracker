import { useCallback } from "react";

import { useAuth } from "@/_core/hooks/useAuth";
import { useGuestPortfolio } from "@/hooks/useGuestPortfolio";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { trpc } from "@/lib/trpc";

type AssetType = "currency" | "crypto" | "stock" | "fund";

type CreateAssetInput = {
  symbol: string;
  type: AssetType;
  name: string;
  baseCurrency: string;
};

type AddHoldingInput = {
  assetId: number;
  quantity: string;
  costBasis?: string;
  annualInterestRate?: string;
};

type UpdateHoldingInput = {
  holdingId: number;
  quantity: string;
  costBasis?: string;
  annualInterestRate?: string;
};

type ReplaceAllHoldingsInput = {
  holdings: AddHoldingInput[];
};

type PortfolioActionOptions = {
  deferInvalidate?: boolean;
};

export function usePortfolioActions() {
  const { user } = useAuth();
  const isGuestMode = user?.loginMethod === "guest-access";
  const guestPortfolio = useGuestPortfolio();
  const guestHistory = guestPortfolio.history;
  const guestPortfolioData = usePortfolioData({ includeSummary: isGuestMode });
  const utils = trpc.useUtils();

  const createAssetMutation = trpc.assets.create.useMutation();
  const addHoldingMutation = trpc.holdings.add.useMutation();
  const updateHoldingMutation = trpc.holdings.update.useMutation();
  const deleteHoldingMutation = trpc.holdings.delete.useMutation();
  const replaceAllHoldingsMutation = trpc.holdings.replaceAll.useMutation();

  const invalidatePortfolioData = useCallback(async () => {
    await Promise.all([
      utils.assets.list.invalidate(),
      utils.holdings.list.invalidate(),
      utils.portfolio.summary.invalidate(),
      utils.portfolioHistory.get.invalidate(),
      utils.portfolioHistory.getByRange.invalidate(),
    ]);
  }, [
    utils.assets.list,
    utils.holdings.list,
    utils.portfolio.summary,
    utils.portfolioHistory.get,
    utils.portfolioHistory.getByRange,
  ]);

  const invalidateGuestDerivedData = useCallback(async () => {
    await Promise.all([
      utils.portfolio.preview.invalidate(),
      utils.portfolioHistory.get.invalidate(),
      utils.portfolioHistory.getByRange.invalidate(),
    ]);
  }, [
    utils.portfolio.preview,
    utils.portfolioHistory.get,
    utils.portfolioHistory.getByRange,
  ]);

  const seedGuestHistoryBaseline = useCallback(() => {
    if (!isGuestMode) {
      return;
    }

    const currentTotalValue =
      guestPortfolioData.summary?.totalValueUSD ??
      Number(guestHistory[guestHistory.length - 1]?.totalValue ?? 0);

    guestPortfolio.recordHistorySnapshot(currentTotalValue);
  }, [
    guestHistory,
    guestPortfolio,
    guestPortfolioData.summary?.totalValueUSD,
    isGuestMode,
  ]);

  const createAsset = useCallback(
    async (input: CreateAssetInput, options?: PortfolioActionOptions) => {
      if (isGuestMode) {
        const asset = guestPortfolio.createAsset(input);
        await invalidateGuestDerivedData();
        return asset;
      }

      const asset = await createAssetMutation.mutateAsync(input);
      if (!options?.deferInvalidate) {
        void utils.assets.list.invalidate();
      }
      return asset;
    },
    [
      createAssetMutation,
      guestPortfolio,
      invalidateGuestDerivedData,
      isGuestMode,
      utils.assets.list,
    ]
  );

  const addHolding = useCallback(
    async (input: AddHoldingInput, options?: PortfolioActionOptions) => {
      if (isGuestMode) {
        seedGuestHistoryBaseline();
        const holding = guestPortfolio.addHolding(input);
        await invalidateGuestDerivedData();
        return holding;
      }

      const holding = await addHoldingMutation.mutateAsync(input);
      if (!options?.deferInvalidate) {
        void invalidatePortfolioData();
      }
      return holding;
    },
    [
      addHoldingMutation,
      guestPortfolio,
      invalidateGuestDerivedData,
      invalidatePortfolioData,
      isGuestMode,
      seedGuestHistoryBaseline,
    ]
  );

  const finalizeDeferredChanges = useCallback(async () => {
    if (isGuestMode) {
      return;
    }

    await invalidatePortfolioData();
  }, [invalidatePortfolioData, isGuestMode]);

  const updateHolding = useCallback(
    async (input: UpdateHoldingInput) => {
      if (isGuestMode) {
        seedGuestHistoryBaseline();
        guestPortfolio.updateHolding(input);
        await invalidateGuestDerivedData();
        return;
      }

      await updateHoldingMutation.mutateAsync(input);
      void invalidatePortfolioData();
    },
    [
      guestPortfolio,
      invalidateGuestDerivedData,
      invalidatePortfolioData,
      isGuestMode,
      seedGuestHistoryBaseline,
      updateHoldingMutation,
    ]
  );

  const deleteHolding = useCallback(
    async (holdingId: number) => {
      if (isGuestMode) {
        seedGuestHistoryBaseline();
        guestPortfolio.deleteHolding(holdingId);
        await invalidateGuestDerivedData();
        return;
      }

      await deleteHoldingMutation.mutateAsync({ holdingId });
      void invalidatePortfolioData();
    },
    [
      deleteHoldingMutation,
      guestPortfolio,
      invalidateGuestDerivedData,
      invalidatePortfolioData,
      isGuestMode,
      seedGuestHistoryBaseline,
    ]
  );

  const replaceAllHoldings = useCallback(
    async (input: ReplaceAllHoldingsInput) => {
      if (isGuestMode) {
        seedGuestHistoryBaseline();
        guestPortfolio.replaceAllHoldings(input.holdings);
        await invalidateGuestDerivedData();
        return;
      }

      await replaceAllHoldingsMutation.mutateAsync(input);
      await invalidatePortfolioData();
    },
    [
      guestPortfolio,
      invalidateGuestDerivedData,
      invalidatePortfolioData,
      isGuestMode,
      replaceAllHoldingsMutation,
      seedGuestHistoryBaseline,
    ]
  );

  return {
    isGuestMode,
    createAsset,
    addHolding,
    updateHolding,
    deleteHolding,
    replaceAllHoldings,
    finalizeDeferredChanges,
    invalidatePortfolioData,
    isCreatingAsset: createAssetMutation.isPending,
    isAddingHolding: addHoldingMutation.isPending,
    isUpdatingHolding: updateHoldingMutation.isPending,
    isDeletingHolding: deleteHoldingMutation.isPending,
    isReplacingHoldings: replaceAllHoldingsMutation.isPending,
  };
}
