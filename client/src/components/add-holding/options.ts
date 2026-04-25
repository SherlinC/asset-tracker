import {
  ALL_DEFAULT_ASSETS,
  ASSETS_BY_CATEGORY,
  dedupeAssetOptions,
  type AssetCategory,
  type AssetOption,
  type BackendAssetType,
  type FundSubCategory,
  STOCK_ASSETS_BY_SUBCATEGORY,
  type StockSubCategory,
} from "./catalog";

type ExistingAsset = {
  symbol: string;
  type: string;
  name: string;
};

type StockSearchItem = {
  symbol: string;
  code: string;
  name: string;
  market: string;
  pinyin: string;
};

type UsEtfSearchItem = {
  symbol: string;
  name: string;
  issuer?: string;
  exchange?: string;
  keywords?: string[];
};

type InternationalFundItem = {
  symbol: string;
  isin: string;
  name: string;
  market: string;
  currency: string;
  externalSymbol?: string;
};

type ChinaFundItem = {
  symbol: string;
  name: string;
};

function getAssetSearchTokens(asset: AssetOption) {
  const tokens = new Set<string>();
  const normalizedSymbol = asset.symbol.trim().toUpperCase();

  if (normalizedSymbol) {
    tokens.add(normalizedSymbol);
  }

  const normalizedDisplaySymbol = asset.displaySymbol?.trim().toUpperCase();
  if (normalizedDisplaySymbol) {
    tokens.add(normalizedDisplaySymbol);
  }

  for (const keyword of asset.keywords ?? []) {
    const normalizedKeyword = keyword.trim().toUpperCase();
    if (normalizedKeyword) {
      tokens.add(normalizedKeyword);
    }
  }

  const hkMatch = normalizedSymbol.match(/^(\d{4,5})\.HK$/);
  if (hkMatch) {
    tokens.add(hkMatch[1]);
  }

  const cnMatch = normalizedSymbol.match(/^(\d{6})\.(SS|SZ|BJ)$/);
  if (cnMatch) {
    tokens.add(cnMatch[1]);
  }

  return Array.from(tokens);
}

export function filterAssetOptions(options: AssetOption[], query: string) {
  const normalizedQuery = query.trim().toUpperCase();

  if (!normalizedQuery) {
    return options;
  }

  return options.filter(asset => {
    const haystacks = [
      asset.symbol,
      asset.displaySymbol,
      asset.name,
      asset.market,
      asset.issuer,
      ...(asset.keywords ?? []),
      ...getAssetSearchTokens(asset),
    ]
      .filter(Boolean)
      .map(value => value!.toUpperCase());

    return haystacks.some(value => value.includes(normalizedQuery));
  });
}

export function resolveManualAssetSymbol(
  options: AssetOption[],
  rawInput: string
) {
  const normalizedInput = rawInput.trim().toUpperCase();

  if (!normalizedInput) {
    return "";
  }

  const matched = options.find(asset =>
    getAssetSearchTokens(asset).includes(normalizedInput)
  );

  return matched?.symbol ?? "";
}

export function buildStockListForCategory(
  selectedCategory: AssetCategory,
  selectedStockSubCategory: StockSubCategory,
  stockSearchData: StockSearchItem[] | undefined
): AssetOption[] {
  if (
    !(selectedCategory === "stock" && selectedStockSubCategory === "cn_stock")
  ) {
    return [];
  }

  return (stockSearchData ?? []).map(stock => ({
    symbol: stock.symbol,
    displaySymbol: stock.code,
    type: "stock" as BackendAssetType,
    name: stock.name,
    market: stock.market,
    keywords: [stock.code, stock.pinyin, stock.market],
  }));
}

export function buildInternationalFundOptions(
  selectedCategory: AssetCategory,
  selectedFundSubCategory: FundSubCategory,
  usEtfSearchData: UsEtfSearchItem[] | undefined,
  internationalFundSearchData: InternationalFundItem[] | undefined
): AssetOption[] {
  if (
    !(
      selectedCategory === "fund" &&
      selectedFundSubCategory === "international_fund"
    )
  ) {
    return [];
  }

  const usEtfList = (usEtfSearchData ?? []).map(etf => ({
    symbol: etf.symbol,
    type: "stock" as BackendAssetType,
    name: etf.name,
    issuer: etf.issuer,
    market: etf.exchange,
    keywords: [etf.issuer, etf.exchange, ...(etf.keywords ?? [])].filter(
      Boolean
    ) as string[],
  }));

  const internationalFundList = (internationalFundSearchData ?? []).map(
    fund => ({
      symbol: fund.symbol,
      displaySymbol: fund.isin,
      type: "fund" as BackendAssetType,
      name: fund.name,
      market: fund.market,
      currency: fund.currency,
      keywords: [fund.isin, fund.externalSymbol, fund.currency].filter(
        Boolean
      ) as string[],
    })
  );

  return dedupeAssetOptions([...usEtfList, ...internationalFundList]);
}

export function buildChinaFundListForCategory(
  selectedCategory: AssetCategory,
  selectedFundSubCategory: FundSubCategory,
  fundSearchData: ChinaFundItem[] | undefined
): AssetOption[] {
  if (
    !(selectedCategory === "fund" && selectedFundSubCategory === "china_fund")
  ) {
    return [];
  }

  return (fundSearchData ?? []).map(fund => ({
    symbol: fund.symbol,
    type: "fund" as BackendAssetType,
    name: fund.name,
  }));
}

export function getAssetsInCategory(
  selectedCategory: AssetCategory,
  selectedStockSubCategory: StockSubCategory,
  selectedFundSubCategory: FundSubCategory,
  stockListForCategory: AssetOption[],
  fundListForCategory: AssetOption[],
  internationalFundOptions: AssetOption[]
): AssetOption[] {
  if (selectedCategory === "stock") {
    return selectedStockSubCategory === "cn_stock"
      ? stockListForCategory
      : STOCK_ASSETS_BY_SUBCATEGORY[selectedStockSubCategory];
  }

  if (selectedCategory === "fund") {
    return selectedFundSubCategory === "china_fund"
      ? fundListForCategory
      : internationalFundOptions;
  }

  return ASSETS_BY_CATEGORY[selectedCategory] ?? [];
}

export function getSelectedAsset(
  selectedAssetSymbol: string,
  assetsInCategory: AssetOption[],
  selectedExistingAsset: ExistingAsset | undefined
) {
  if (!selectedAssetSymbol) {
    return null;
  }

  return (
    assetsInCategory.find(asset => asset.symbol === selectedAssetSymbol) ??
    (selectedExistingAsset
      ? {
          symbol: selectedExistingAsset.symbol,
          type: selectedExistingAsset.type as BackendAssetType,
          name: selectedExistingAsset.name,
        }
      : undefined) ??
    ALL_DEFAULT_ASSETS.find(asset => asset.symbol === selectedAssetSymbol) ??
    null
  );
}
