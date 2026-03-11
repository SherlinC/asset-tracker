import { useEffect, useMemo, useState } from "react";

import type {
  AssetCategory,
  FundSubCategory,
  StockSubCategory,
} from "@/components/add-holding/catalog";
import {
  buildChinaFundListForCategory,
  buildInternationalFundOptions,
  buildStockListForCategory,
  getAssetsInCategory,
  getSelectedAsset,
} from "@/components/add-holding/options";
import { trpc } from "@/lib/trpc";

type ExistingAsset = {
  id: number;
  symbol: string;
  type: string;
  name: string;
};

type Params = {
  assets: ExistingAsset[];
  selectedCategory: AssetCategory;
  selectedStockSubCategory: StockSubCategory;
  selectedFundSubCategory: FundSubCategory;
  selectedAssetSymbol: string;
};

export function useAddHoldingSearch({
  assets,
  selectedCategory,
  selectedStockSubCategory,
  selectedFundSubCategory,
  selectedAssetSymbol,
}: Params) {
  const [assetComboboxOpen, setAssetComboboxOpen] = useState(false);
  const [fundSearchInput, setFundSearchInput] = useState("");
  const [fundSearchQuery, setFundSearchQuery] = useState("");
  const [internationalFundSearchInput, setInternationalFundSearchInput] =
    useState("");
  const [internationalFundSearchQuery, setInternationalFundSearchQuery] =
    useState("");
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [stockSearchQuery, setStockSearchQuery] = useState("");

  const fundSearch = trpc.fund.search.useQuery(
    { q: fundSearchQuery, limit: 50 },
    {
      enabled:
        selectedCategory === "fund" && selectedFundSubCategory === "china_fund",
      staleTime: 60 * 1000,
    }
  );
  const usEtfSearch = trpc.fund.usEtfSearch.useQuery(
    { q: internationalFundSearchQuery, limit: 50 },
    {
      enabled:
        selectedCategory === "fund" &&
        selectedFundSubCategory === "international_fund" &&
        internationalFundSearchQuery.trim().length > 0,
      staleTime: 60 * 1000,
    }
  );
  const internationalFundSearch = trpc.fund.internationalSearch.useQuery(
    { q: internationalFundSearchQuery, limit: 20 },
    {
      enabled:
        selectedCategory === "fund" &&
        selectedFundSubCategory === "international_fund" &&
        internationalFundSearchQuery.trim().length > 0,
      staleTime: 60 * 1000,
    }
  );
  const stockSearch = trpc.stock.search.useQuery(
    { q: stockSearchQuery, limit: 50 },
    {
      enabled:
        selectedCategory === "stock" &&
        selectedStockSubCategory === "cn_stock" &&
        stockSearchQuery.trim().length > 0,
      staleTime: 60 * 1000,
    }
  );

  useEffect(() => {
    if (
      selectedCategory !== "fund" ||
      selectedFundSubCategory !== "china_fund"
    ) {
      return;
    }
    const t = setTimeout(() => setFundSearchQuery(fundSearchInput), 400);
    return () => clearTimeout(t);
  }, [selectedCategory, selectedFundSubCategory, fundSearchInput]);

  useEffect(() => {
    if (
      selectedCategory !== "stock" ||
      selectedStockSubCategory !== "cn_stock"
    ) {
      return;
    }

    const t = setTimeout(() => setStockSearchQuery(stockSearchInput), 400);
    return () => clearTimeout(t);
  }, [selectedCategory, selectedStockSubCategory, stockSearchInput]);

  useEffect(() => {
    if (
      selectedCategory !== "fund" ||
      selectedFundSubCategory !== "international_fund"
    ) {
      return;
    }

    const t = setTimeout(
      () => setInternationalFundSearchQuery(internationalFundSearchInput),
      400
    );
    return () => clearTimeout(t);
  }, [selectedCategory, selectedFundSubCategory, internationalFundSearchInput]);

  const stockListForCategory = useMemo(
    () =>
      buildStockListForCategory(
        selectedCategory,
        selectedStockSubCategory,
        stockSearch.data
      ),
    [selectedCategory, selectedStockSubCategory, stockSearch.data]
  );
  const internationalFundOptions = useMemo(
    () =>
      buildInternationalFundOptions(
        selectedCategory,
        selectedFundSubCategory,
        usEtfSearch.data,
        internationalFundSearch.data
      ),
    [
      selectedCategory,
      selectedFundSubCategory,
      usEtfSearch.data,
      internationalFundSearch.data,
    ]
  );
  const fundListForCategory = useMemo(
    () =>
      buildChinaFundListForCategory(
        selectedCategory,
        selectedFundSubCategory,
        fundSearch.data
      ),
    [selectedCategory, selectedFundSubCategory, fundSearch.data]
  );

  const assetsInCategory = useMemo(
    () =>
      getAssetsInCategory(
        selectedCategory,
        selectedStockSubCategory,
        selectedFundSubCategory,
        stockListForCategory,
        fundListForCategory,
        internationalFundOptions
      ),
    [
      selectedCategory,
      selectedStockSubCategory,
      selectedFundSubCategory,
      stockListForCategory,
      fundListForCategory,
      internationalFundOptions,
    ]
  );

  const selectedExistingAsset = useMemo(
    () =>
      selectedAssetSymbol
        ? assets.find(asset => asset.symbol === selectedAssetSymbol)
        : undefined,
    [assets, selectedAssetSymbol]
  );

  const selectedAsset = useMemo(
    () =>
      getSelectedAsset(
        selectedAssetSymbol,
        assetsInCategory,
        selectedExistingAsset
      ),
    [selectedAssetSymbol, assetsInCategory, selectedExistingAsset]
  );

  const isLoading =
    (selectedCategory === "fund" &&
      ((selectedFundSubCategory === "china_fund" && fundSearch.isLoading) ||
        (selectedFundSubCategory === "international_fund" &&
          (internationalFundSearch.isLoading || usEtfSearch.isLoading)))) ||
    (selectedCategory === "stock" &&
      selectedStockSubCategory === "cn_stock" &&
      stockSearch.isLoading);

  const resetSearchState = () => {
    setAssetComboboxOpen(false);
    setFundSearchInput("");
    setFundSearchQuery("");
    setInternationalFundSearchInput("");
    setInternationalFundSearchQuery("");
    setStockSearchInput("");
    setStockSearchQuery("");
  };

  return {
    assetComboboxOpen,
    setAssetComboboxOpen,
    fundSearchInput,
    setFundSearchInput,
    fundSearchQuery,
    internationalFundSearchInput,
    setInternationalFundSearchInput,
    internationalFundSearchQuery,
    stockSearchInput,
    setStockSearchInput,
    stockSearchQuery,
    assetsInCategory,
    selectedExistingAsset,
    selectedAsset,
    isLoading,
    resetSearchState,
  };
}
