import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Holding } from "@/components/holdings-list/types";
import type { PortfolioHistoryRecord } from "@/components/portfolio-value-chart/types";
import {
  DEFAULT_GUEST_SEED_PORTFOLIO,
  GUEST_PORTFOLIO_SEED_VERSION,
} from "@/lib/guestSeedPortfolio";

const GUEST_PORTFOLIO_STORAGE_KEY = "asset_tracker_guest_portfolio";
const GUEST_PORTFOLIO_EVENT = "asset-tracker:guest-portfolio-updated";

type GuestAsset = Holding["asset"];
type GuestHoldingRecord = Holding["holding"];
type AssetType = "currency" | "crypto" | "stock" | "fund";

type StoredGuestAsset = Omit<GuestAsset, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type StoredGuestHoldingRecord = Omit<
  GuestHoldingRecord,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

type StoredGuestPortfolio = {
  assets: StoredGuestAsset[];
  holdings: StoredGuestHoldingRecord[];
  history: PortfolioHistoryRecord[];
  nextAssetId: number;
  nextHoldingId: number;
  seedVersion?: number;
};

type GuestPortfolioSnapshot = {
  assets: GuestAsset[];
  holdings: Holding[];
  history: PortfolioHistoryRecord[];
};

const EMPTY_STORED_PORTFOLIO: StoredGuestPortfolio = {
  assets: [],
  holdings: [],
  history: [],
  nextAssetId: 1,
  nextHoldingId: 1,
  seedVersion: GUEST_PORTFOLIO_SEED_VERSION,
};

const EMPTY_GUEST_PORTFOLIO_SNAPSHOT: GuestPortfolioSnapshot = {
  assets: [],
  holdings: [],
  history: [],
};

let cachedGuestPortfolioRaw: string | null = null;
let cachedGuestPortfolioSnapshot: GuestPortfolioSnapshot =
  EMPTY_GUEST_PORTFOLIO_SNAPSHOT;

type CreateGuestAssetInput = {
  symbol: string;
  type: AssetType;
  name: string;
  baseCurrency: string;
};

type AddGuestHoldingInput = {
  assetId: number;
  quantity: string;
  costBasis?: string;
  annualInterestRate?: string;
};

type UpdateGuestHoldingInput = {
  holdingId: number;
  quantity: string;
  costBasis?: string;
  annualInterestRate?: string;
};

type ReplaceGuestHoldingsInput = Array<{
  assetId: number;
  quantity: string;
  costBasis?: string;
  annualInterestRate?: string;
}>;

function createEmptyStoredPortfolio(): StoredGuestPortfolio {
  return EMPTY_STORED_PORTFOLIO;
}

function createSeededGuestPortfolio(): StoredGuestPortfolio {
  console.log("[createSeededGuestPortfolio] Creating seeded guest portfolio");
  console.log("[createSeededGuestPortfolio] DEFAULT_GUEST_SEED_PORTFOLIO:", DEFAULT_GUEST_SEED_PORTFOLIO);
  const nowIso = new Date().toISOString();
  const assetIdsBySymbol = new Map<string, number>();

  const assets = DEFAULT_GUEST_SEED_PORTFOLIO.assets.map((asset, index) => {
    const id = index + 1;
    assetIdsBySymbol.set(asset.symbol, id);

    return {
      id,
      userId: 0,
      symbol: asset.symbol,
      type: asset.type,
      name: asset.name,
      baseCurrency: asset.baseCurrency,
      createdAt: nowIso,
      updatedAt: nowIso,
    } satisfies StoredGuestAsset;
  });

  const holdings = DEFAULT_GUEST_SEED_PORTFOLIO.holdings.flatMap(
    (holding, index) => {
      const assetId = assetIdsBySymbol.get(holding.symbol);

      if (assetId == null) {
        console.warn("[createSeededGuestPortfolio] Asset not found for symbol:", holding.symbol);
        return [];
      }

      return [
        {
          id: index + 1,
          userId: 0,
          assetId,
          quantity: holding.quantity,
          costBasis: holding.costBasis ?? null,
          annualInterestRate: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        } satisfies StoredGuestHoldingRecord,
      ];
    }
  );

  const result = {
    assets,
    holdings,
    history: DEFAULT_GUEST_SEED_PORTFOLIO.history,
    nextAssetId: assets.length + 1,
    nextHoldingId: holdings.length + 1,
    seedVersion: GUEST_PORTFOLIO_SEED_VERSION,
  };
  
  console.log("[createSeededGuestPortfolio] Created seeded portfolio:", result);
  return result;
}

function normalizeStoredGuestPortfolio(
  state: Partial<StoredGuestPortfolio> | null | undefined
): StoredGuestPortfolio {
  console.log("[normalizeStoredGuestPortfolio] Normalizing guest portfolio");
  console.log("[normalizeStoredGuestPortfolio] Input state:", state);
  // If state is null or undefined, create new seeded portfolio
  if (!state) {
    console.log("[normalizeStoredGuestPortfolio] State is null/undefined, creating seeded portfolio");
    return createSeededGuestPortfolio();
  }

  const assets = Array.isArray(state.assets) ? state.assets : [];
  const holdings = Array.isArray(state.holdings) ? state.holdings : [];
  const history = Array.isArray(state.history) ? state.history : [];
  const seedVersion = typeof state.seedVersion === "number" ? state.seedVersion : undefined;
  
  console.log("[normalizeStoredGuestPortfolio] Extracted values:");
  console.log("  - assets length:", assets.length);
  console.log("  - holdings length:", holdings.length);
  console.log("  - seedVersion:", seedVersion);
  console.log("  - GUEST_PORTFOLIO_SEED_VERSION:", GUEST_PORTFOLIO_SEED_VERSION);

  // Create new seeded portfolio if seed version mismatch
  if (seedVersion !== GUEST_PORTFOLIO_SEED_VERSION) {
    console.log("[normalizeStoredGuestPortfolio] Seed version mismatch, creating seeded portfolio");
    return createSeededGuestPortfolio();
  }

  // Create new seeded portfolio if no assets and no holdings
  if (assets.length === 0 && holdings.length === 0) {
    console.log("[normalizeStoredGuestPortfolio] No assets and holdings, creating seeded portfolio");
    return createSeededGuestPortfolio();
  }

  const result = {
    assets,
    holdings,
    history,
    nextAssetId: typeof state.nextAssetId === "number" ? state.nextAssetId : assets.length + 1,
    nextHoldingId: typeof state.nextHoldingId === "number" ? state.nextHoldingId : holdings.length + 1,
    seedVersion: seedVersion ?? GUEST_PORTFOLIO_SEED_VERSION,
  };
  
  console.log("[normalizeStoredGuestPortfolio] Returning normalized portfolio:", result);
  return result;
}

function pruneUnusedAssets(
  assets: StoredGuestAsset[],
  holdings: StoredGuestHoldingRecord[]
) {
  const usedAssetIds = new Set(holdings.map(holding => holding.assetId));
  return assets.filter(asset => usedAssetIds.has(asset.id));
}

function toDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function readStoredGuestPortfolio(): StoredGuestPortfolio {
  console.log("[readStoredGuestPortfolio] Reading guest portfolio from local storage");
  if (typeof window === "undefined") {
    console.log("[readStoredGuestPortfolio] Window undefined, returning empty portfolio");
    return createEmptyStoredPortfolio();
  }

  try {
    const raw = window.localStorage.getItem(GUEST_PORTFOLIO_STORAGE_KEY);
    console.log("[readStoredGuestPortfolio] Raw data from localStorage:", raw);
    if (!raw) {
      console.log("[readStoredGuestPortfolio] No data in localStorage, creating seeded portfolio");
      return createSeededGuestPortfolio();
    }

    const parsed = JSON.parse(raw) as Partial<StoredGuestPortfolio>;
    console.log("[readStoredGuestPortfolio] Parsed data:", parsed);

    const normalized = normalizeStoredGuestPortfolio(parsed);
    console.log("[readStoredGuestPortfolio] Normalized data:", normalized);
    return normalized;
  } catch (error) {
    console.error("[readStoredGuestPortfolio] Error reading portfolio:", error);
    console.log("[readStoredGuestPortfolio] Creating seeded portfolio due to error");
    return createSeededGuestPortfolio();
  }
}

function buildGuestPortfolioSnapshot(
  state: StoredGuestPortfolio
): GuestPortfolioSnapshot {
  const assets = state.assets.map(fromStoredAsset);
  const assetsById = new Map(assets.map(asset => [asset.id, asset]));
  const holdings = state.holdings.flatMap(storedHolding => {
    const holding = fromStoredHolding(storedHolding);
    const asset = assetsById.get(holding.assetId);

    if (!asset) {
      return [];
    }

    return [{ holding, asset }];
  });

  return {
    assets,
    holdings,
    history: Array.isArray(state.history) ? state.history : [],
  };
}

function toStoredAsset(asset: GuestAsset): StoredGuestAsset {
  return {
    ...asset,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

function toStoredHolding(
  holding: GuestHoldingRecord
): StoredGuestHoldingRecord {
  return {
    ...holding,
    annualInterestRate: holding.annualInterestRate ?? null,
    createdAt: holding.createdAt.toISOString(),
    updatedAt: holding.updatedAt.toISOString(),
  };
}

function fromStoredAsset(asset: StoredGuestAsset): GuestAsset {
  return {
    ...asset,
    createdAt: toDate(asset.createdAt),
    updatedAt: toDate(asset.updatedAt),
  };
}

function fromStoredHolding(
  holding: StoredGuestHoldingRecord
): GuestHoldingRecord {
  return {
    ...holding,
    annualInterestRate: holding.annualInterestRate ?? null,
    createdAt: toDate(holding.createdAt),
    updatedAt: toDate(holding.updatedAt),
  };
}

function emitGuestPortfolioUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GUEST_PORTFOLIO_EVENT));
}

function writeStoredGuestPortfolio(state: StoredGuestPortfolio) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    GUEST_PORTFOLIO_STORAGE_KEY,
    JSON.stringify(state)
  );
  emitGuestPortfolioUpdate();
}

export function resetGuestPortfolioToSeed() {
  if (typeof window === "undefined") return;
  writeStoredGuestPortfolio(createSeededGuestPortfolio());
}

function updateStoredGuestPortfolio(
  updater: (state: StoredGuestPortfolio) => StoredGuestPortfolio
) {
  const nextState = updater(readStoredGuestPortfolio());
  writeStoredGuestPortfolio(nextState);
  return nextState;
}

function getGuestPortfolioSnapshot(): GuestPortfolioSnapshot {
  if (typeof window === "undefined") {
    return EMPTY_GUEST_PORTFOLIO_SNAPSHOT;
  }

  const raw = window.localStorage.getItem(GUEST_PORTFOLIO_STORAGE_KEY);

  // Use cache if data hasn't changed
  if (raw === cachedGuestPortfolioRaw) {
    return cachedGuestPortfolioSnapshot;
  }

  // Read fresh state if data has changed
  const state = readStoredGuestPortfolio();
  const snapshot = buildGuestPortfolioSnapshot(state);

  // Update cache
  cachedGuestPortfolioRaw = raw;
  cachedGuestPortfolioSnapshot = snapshot;

  return snapshot;
}

function subscribeGuestPortfolio(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = (event?: Event) => {
    if (
      event instanceof StorageEvent &&
      event.key !== null &&
      event.key !== GUEST_PORTFOLIO_STORAGE_KEY
    ) {
      return;
    }

    onStoreChange();
  };
  window.addEventListener(GUEST_PORTFOLIO_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(GUEST_PORTFOLIO_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function useGuestPortfolio() {
  const snapshot = useSyncExternalStore(
    subscribeGuestPortfolio,
    getGuestPortfolioSnapshot,
    getGuestPortfolioSnapshot
  );

  const createAsset = useCallback((input: CreateGuestAssetInput) => {
    const normalizedSymbol = input.symbol.trim().toUpperCase();
    const now = new Date();
    let createdAsset: GuestAsset | null = null;

    updateStoredGuestPortfolio(state => {
      const existingAsset = state.assets
        .map(fromStoredAsset)
        .find(asset => asset.symbol.toUpperCase() === normalizedSymbol);

      if (existingAsset) {
        createdAsset = existingAsset;
        return state;
      }

      createdAsset = {
        id: state.nextAssetId,
        userId: 0,
        symbol: normalizedSymbol,
        type: input.type,
        name: input.name,
        baseCurrency: input.baseCurrency,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        assets: [...state.assets, toStoredAsset(createdAsset)],
        nextAssetId: state.nextAssetId + 1,
      };
    });

    if (!createdAsset) {
      throw new Error("Failed to create guest asset");
    }

    return createdAsset;
  }, []);

  const addHolding = useCallback((input: AddGuestHoldingInput) => {
    const now = new Date();
    let createdHolding: GuestHoldingRecord | null = null;

    updateStoredGuestPortfolio(state => {
      createdHolding = {
        id: state.nextHoldingId,
        userId: 0,
        assetId: input.assetId,
        quantity: input.quantity,
        costBasis: input.costBasis ?? null,
        annualInterestRate: input.annualInterestRate ?? null,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        holdings: [...state.holdings, toStoredHolding(createdHolding)],
        nextHoldingId: state.nextHoldingId + 1,
      };
    });

    if (!createdHolding) {
      throw new Error("Failed to add guest holding");
    }

    return createdHolding;
  }, []);

  const updateHolding = useCallback((input: UpdateGuestHoldingInput) => {
    let updated = false;

    updateStoredGuestPortfolio(state => ({
      ...state,
      holdings: state.holdings.map(storedHolding => {
        const holding = fromStoredHolding(storedHolding);

        if (holding.id !== input.holdingId) {
          return storedHolding;
        }

        updated = true;

        return toStoredHolding({
          ...holding,
          quantity: input.quantity,
          costBasis: input.costBasis ?? null,
          annualInterestRate: input.annualInterestRate ?? null,
          updatedAt: new Date(),
        });
      }),
    }));

    if (!updated) {
      throw new Error("Holding not found");
    }
  }, []);

  const deleteHolding = useCallback((holdingId: number) => {
    updateStoredGuestPortfolio(state => {
      const holdings = state.holdings.filter(
        holding => holding.id !== holdingId
      );

      return {
        ...state,
        assets: pruneUnusedAssets(state.assets, holdings),
        holdings,
      };
    });
  }, []);

  const replaceAllHoldings = useCallback(
    (inputs: ReplaceGuestHoldingsInput) => {
      updateStoredGuestPortfolio(state => {
        let nextHoldingId = state.nextHoldingId;
        const now = new Date();
        const holdings = inputs.map(input => {
          const nextHolding: GuestHoldingRecord = {
            id: nextHoldingId,
            userId: 0,
            assetId: input.assetId,
            quantity: input.quantity,
            costBasis: input.costBasis ?? null,
            annualInterestRate: input.annualInterestRate ?? null,
            createdAt: now,
            updatedAt: now,
          };

          nextHoldingId += 1;
          return toStoredHolding(nextHolding);
        });

        return {
          ...state,
          assets: pruneUnusedAssets(state.assets, holdings),
          holdings,
          nextHoldingId,
        };
      });
    },
    []
  );

  const previewInput = useMemo(
    () => ({
      assets: snapshot.assets.map(asset => ({
        id: asset.id,
        symbol: asset.symbol,
        type: asset.type as AssetType,
        name: asset.name,
        baseCurrency: asset.baseCurrency,
      })),
      holdings: snapshot.holdings.map(({ holding }) => ({
        id: holding.id,
        assetId: holding.assetId,
        quantity: holding.quantity,
        costBasis: holding.costBasis,
        annualInterestRate: holding.annualInterestRate,
        createdAt: holding.createdAt,
        updatedAt: holding.updatedAt,
      })),
    }),
    [snapshot.assets, snapshot.holdings]
  );

  const recordHistorySnapshot = useCallback((totalValue: number) => {
    updateStoredGuestPortfolio(state => {
      const now = new Date();
      const lastRecord = state.history[state.history.length - 1];
      const roundedTotalValue = Number(totalValue.toFixed(2));

      if (
        lastRecord &&
        Number(lastRecord.totalValue) === roundedTotalValue &&
        now.getTime() - new Date(lastRecord.timestamp).getTime() < 60 * 1000
      ) {
        return state;
      }

      return {
        ...state,
        history: [
          ...state.history,
          {
            timestamp: now.toISOString(),
            totalValue: roundedTotalValue,
          },
        ].slice(-500),
      };
    });
  }, []);

  const ensureHistoryComparisonSeed = useCallback((totalValue: number) => {
    updateStoredGuestPortfolio(state => {
      const roundedTotalValue = Number(totalValue.toFixed(2));

      if (state.history.length >= 2) {
        return state;
      }

      if (state.history.length === 1) {
        const existingValue = Number(state.history[0]?.totalValue ?? 0);

        if (existingValue === 0 || existingValue === roundedTotalValue) {
          return state;
        }
      }

      const baselineTimestamp = new Date(
        state.history.length === 1
          ? new Date(state.history[0].timestamp).getTime() - 60 * 1000
          : Date.now() - 60 * 1000
      );

      return {
        ...state,
        history: [
          {
            timestamp: baselineTimestamp.toISOString(),
            totalValue: 0,
          },
          ...state.history,
        ],
      };
    });
  }, []);

  return {
    assets: snapshot.assets,
    holdings: snapshot.holdings,
    history: snapshot.history,
    previewInput,
    createAsset,
    addHolding,
    updateHolding,
    deleteHolding,
    replaceAllHoldings,
    ensureHistoryComparisonSeed,
    recordHistorySnapshot,
  };
}
