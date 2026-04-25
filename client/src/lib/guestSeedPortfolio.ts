import type { PortfolioHistoryRecord } from "@/components/portfolio-value-chart/types";

export const GUEST_PORTFOLIO_SEED_VERSION = 3;

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
    {
      symbol: "AAPL",
      type: "stock",
      name: "Apple Inc.",
      baseCurrency: "USD",
    },
    {
      symbol: "MSFT",
      type: "stock",
      name: "Microsoft Corporation",
      baseCurrency: "USD",
    },
    {
      symbol: "BTC",
      type: "crypto",
      name: "Bitcoin",
      baseCurrency: "USD",
    },
    {
      symbol: "ETH",
      type: "crypto",
      name: "Ethereum",
      baseCurrency: "USD",
    },
    {
      symbol: "USD",
      type: "currency",
      name: "US Dollar",
      baseCurrency: "USD",
    },
    {
      symbol: "CNY",
      type: "currency",
      name: "Chinese Yuan",
      baseCurrency: "CNY",
    },
  ],
  holdings: [
    {
      symbol: "TSLA",
      quantity: "10",
      costBasis: "700",
    },
    {
      symbol: "AAPL",
      quantity: "5",
      costBasis: "200",
    },
    {
      symbol: "MSFT",
      quantity: "3",
      costBasis: "300",
    },
    {
      symbol: "BTC",
      quantity: "0.1",
      costBasis: "40000",
    },
    {
      symbol: "ETH",
      quantity: "1",
      costBasis: "2000",
    },
    {
      symbol: "USD",
      quantity: "1000",
    },
    {
      symbol: "CNY",
      quantity: "10000",
    },
  ],
  history: [],
};
