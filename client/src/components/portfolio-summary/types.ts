export interface PortfolioData {
  totalValueUSD: number;
  totalValueCNY: number;
  exchangeRate: number;
  assets: Array<{
    id: number;
    symbol: string;
    name: string;
    type: string;
    quantity: number;
    priceUSD: number;
    valueUSD: number;
    change24h: number;
    issueCode?: "missing_eodhd_api_key";
    holding: unknown;
  }>;
}

export type AggregatedAsset = {
  symbol: string;
  valueUSD: number;
  type: string;
  name: string;
};

export type PieChartDatum = {
  name: string;
  value: number;
  type: string;
};

export type TypeAllocation = Record<string, number>;

export type CurrencyDisplay = "USD" | "CNY";
