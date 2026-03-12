export type Holding = {
  holding: {
    id: number;
    userId: number;
    assetId: number;
    quantity: string;
    costBasis: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  asset: {
    id: number;
    userId: number;
    symbol: string;
    type: string;
    name: string;
    baseCurrency: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type HoldingsListProps = {
  holdings: Holding[];
  onRefresh: () => void;
  scrollToCategory?: string | null;
  onScrollToCategoryHandled?: () => void;
};

export type AggregatedHolding = {
  asset: Holding["asset"];
  records: Holding[];
  totalQuantity: number;
  currentPriceUSD: number;
  totalValueUSD: number;
  totalCostBasisUSD: number | null;
  profitLossUSD: number | null;
  profitLossPercent: number | null;
  change24h: number;
};

export type HoldingCategoryKey =
  | "crypto"
  | "us_stock"
  | "a_stock"
  | "hk_stock"
  | "us_etf"
  | "fund"
  | "currency"
  | "other";

export type EditHoldingState = {
  id: number;
  quantity: string;
  costBasis: string;
  assetName: string;
  symbol: string;
};

export type CurrencyDisplay = "USD" | "CNY";

export type PortfolioAssetSummary = {
  id: number;
  priceUSD: number;
  change24h: number;
};
