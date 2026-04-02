import type { PortfolioHistoryRecord } from "@/components/portfolio-value-chart/types";

export const GUEST_PORTFOLIO_SEED_VERSION = 1;

export type GuestSeedAsset = {
  symbol: string;
  type: "currency" | "crypto" | "stock" | "fund";
  name: string;
  baseCurrency: string;
};

export type GuestSeedHolding = {
  symbol: string;
  quantity: string;
  costBasis?: string;
};

export type GuestSeedPortfolio = {
  assets: GuestSeedAsset[];
  holdings: GuestSeedHolding[];
  history: PortfolioHistoryRecord[];
};

export const DEFAULT_GUEST_SEED_PORTFOLIO: GuestSeedPortfolio = {
  assets: [
    {
      symbol: "TSLA",
      type: "stock",
      name: "Tesla Inc.",
      baseCurrency: "USD",
    },
  ],
  holdings: [
    {
      symbol: "TSLA",
      quantity: "10",
    },
  ],
  history: [],
};
