import type { BackendAssetType, FundSubCategory } from "./catalog";
import type { ExistingAsset } from "./types";

function getFetchPriceType(
  selectedCategory: string,
  selectedFundSubCategory: FundSubCategory
): BackendAssetType {
  if (
    selectedCategory === "fund" &&
    (selectedFundSubCategory === "china_fund" ||
      selectedFundSubCategory === "international_fund")
  ) {
    return "fund";
  }

  if (selectedCategory === "currency") {
    return "currency";
  }

  if (selectedCategory === "crypto") {
    return "crypto";
  }

  return "stock";
}

export function buildFetchPriceInput(params: {
  assets: ExistingAsset[];
  selectedAssetSymbol: string;
  selectedCategory: string;
  selectedFundSubCategory: FundSubCategory;
}) {
  const {
    assets,
    selectedAssetSymbol,
    selectedCategory,
    selectedFundSubCategory,
  } = params;

  if (!selectedAssetSymbol) {
    return { symbol: "", type: "stock" as const };
  }

  return {
    assetId: assets.find(asset => asset.symbol === selectedAssetSymbol)?.id,
    symbol: selectedAssetSymbol,
    type: getFetchPriceType(selectedCategory, selectedFundSubCategory),
  };
}
