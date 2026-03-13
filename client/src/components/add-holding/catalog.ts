export type AssetCategory =
  | "stock"
  | "crypto"
  | "precious_metals"
  | "fund"
  | "currency";

export type StockSubCategory = "us_stock" | "cn_stock" | "hk_stock";
export type FundSubCategory = "china_fund" | "international_fund";

export type BackendAssetType = "currency" | "crypto" | "stock" | "fund";

export type AssetOption = {
  symbol: string;
  displaySymbol?: string;
  type: BackendAssetType;
  name: string;
  issuer?: string;
  market?: string;
  currency?: string;
  keywords?: string[];
};

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  stock: "Stock",
  crypto: "Crypto",
  precious_metals: "Precious metals",
  fund: "Fund",
  currency: "Currency",
};

export const CATEGORY_LABELS_ZH: Record<AssetCategory, string> = {
  stock: "股票",
  crypto: "虚拟货币",
  precious_metals: "贵金属",
  fund: "基金",
  currency: "货币",
};

export const CATEGORY_ORDER: AssetCategory[] = [
  "stock",
  "fund",
  "crypto",
  "currency",
  "precious_metals",
];

export const STOCK_SUBCATEGORY_ORDER: StockSubCategory[] = [
  "cn_stock",
  "hk_stock",
  "us_stock",
];

export const FUND_SUBCATEGORY_ORDER: FundSubCategory[] = [
  "china_fund",
  "international_fund",
];

export const STOCK_SUBCATEGORY_LABELS: Record<StockSubCategory, string> = {
  us_stock: "美股",
  cn_stock: "A股",
  hk_stock: "港股",
};

export const FUND_SUBCATEGORY_LABELS: Record<FundSubCategory, string> = {
  china_fund: "中国基金",
  international_fund: "国际基金",
};

export const STOCK_ASSETS_BY_SUBCATEGORY: Record<
  StockSubCategory,
  AssetOption[]
> = {
  us_stock: [
    { symbol: "AAPL", type: "stock", name: "Apple Inc." },
    { symbol: "AMD", type: "stock", name: "Advanced Micro Devices Inc." },
    { symbol: "AMZN", type: "stock", name: "Amazon.com Inc." },
    { symbol: "BABA", type: "stock", name: "Alibaba Group Holding Limited" },
    { symbol: "COIN", type: "stock", name: "Coinbase Global Inc." },
    { symbol: "DBB", type: "stock", name: "Invesco DB Base Metals Fund" },
    { symbol: "GOOGL", type: "stock", name: "Alphabet Inc." },
    { symbol: "IVV", type: "stock", name: "iShares Core S&P 500 ETF" },
    { symbol: "JPM", type: "stock", name: "JPMorgan Chase & Co." },
    { symbol: "META", type: "stock", name: "Meta Platforms Inc." },
    { symbol: "MSFT", type: "stock", name: "Microsoft Corporation" },
    { symbol: "NFLX", type: "stock", name: "Netflix Inc." },
    { symbol: "NVDA", type: "stock", name: "NVIDIA Corporation" },
    { symbol: "QQQ", type: "stock", name: "Invesco QQQ Trust" },
    { symbol: "SPY", type: "stock", name: "SPDR S&P 500 ETF Trust" },
    { symbol: "TSLA", type: "stock", name: "Tesla Inc." },
    { symbol: "USO", type: "stock", name: "United States Oil Fund" },
    { symbol: "VOO", type: "stock", name: "Vanguard S&P 500 ETF" },
    { symbol: "VTI", type: "stock", name: "Vanguard Total Stock Market ETF" },
  ],
  cn_stock: [
    {
      symbol: "000001.SZ",
      type: "stock",
      name: "Ping An Bank",
      keywords: ["平安银行", "平安", "银行", "000001"],
    },
    {
      symbol: "000858.SZ",
      type: "stock",
      name: "Wuliangye Yibin",
      keywords: ["五粮液", "白酒", "000858"],
    },
    {
      symbol: "002594.SZ",
      type: "stock",
      name: "BYD Co., Ltd.",
      keywords: ["比亚迪", "新能源车", "002594"],
    },
    {
      symbol: "300750.SZ",
      type: "stock",
      name: "CATL",
      keywords: ["宁德时代", "电池", "300750"],
    },
    {
      symbol: "600519.SS",
      type: "stock",
      name: "Kweichow Moutai",
      keywords: ["贵州茅台", "茅台", "白酒", "600519"],
    },
    {
      symbol: "601318.SS",
      type: "stock",
      name: "Ping An Insurance",
      keywords: ["中国平安", "平安", "保险", "601318"],
    },
  ],
  hk_stock: [
    {
      symbol: "0005.HK",
      type: "stock",
      name: "HSBC Holdings",
      keywords: ["汇丰", "汇丰控股", "0005"],
    },
    {
      symbol: "0700.HK",
      type: "stock",
      name: "Tencent Holdings",
      keywords: ["腾讯", "腾讯控股", "0700"],
    },
    {
      symbol: "1299.HK",
      type: "stock",
      name: "AIA Group",
      keywords: ["友邦保险", "友邦", "1299"],
    },
    {
      symbol: "1810.HK",
      type: "stock",
      name: "Xiaomi Corporation",
      keywords: ["小米", "小米集团", "1810"],
    },
    {
      symbol: "3690.HK",
      type: "stock",
      name: "Meituan",
      keywords: ["美团", "3690"],
    },
    {
      symbol: "9988.HK",
      type: "stock",
      name: "Alibaba Group (HK)",
      keywords: ["阿里巴巴", "阿里", "9988"],
    },
  ],
};

export const ASSETS_BY_CATEGORY: Record<AssetCategory, AssetOption[]> = {
  stock: [],
  crypto: [
    { symbol: "BTC", type: "crypto", name: "Bitcoin" },
    { symbol: "ETH", type: "crypto", name: "Ethereum" },
    { symbol: "OKB", type: "crypto", name: "OKB" },
  ],
  precious_metals: [
    { symbol: "GLD", type: "stock", name: "SPDR Gold Shares" },
    { symbol: "SLV", type: "stock", name: "iShares Silver Trust" },
  ],
  fund: [],
  currency: [
    { symbol: "USD", type: "currency", name: "US Dollar" },
    { symbol: "CNY", type: "currency", name: "人民币" },
    { symbol: "EUR", type: "currency", name: "欧元" },
    { symbol: "HKD", type: "currency", name: "Hong Kong Dollar" },
    { symbol: "RUB", type: "currency", name: "俄罗斯卢布" },
    { symbol: "USDT", type: "currency", name: "USDT 稳定币" },
  ],
};

export const ALL_DEFAULT_ASSETS = [
  ...Object.values(STOCK_ASSETS_BY_SUBCATEGORY).flat(),
  ...ASSETS_BY_CATEGORY.crypto,
  ...ASSETS_BY_CATEGORY.precious_metals,
  ...ASSETS_BY_CATEGORY.currency,
];

export function dedupeAssetOptions(options: AssetOption[]) {
  return Array.from(new Map(options.map(item => [item.symbol, item])).values());
}
