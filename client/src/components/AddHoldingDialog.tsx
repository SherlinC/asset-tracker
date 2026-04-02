import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { AddHoldingDetailsSection } from "@/components/add-holding/AddHoldingDetailsSection";
import { AddHoldingSelectionSection } from "@/components/add-holding/AddHoldingSelectionSection";
import {
  ALL_DEFAULT_ASSETS,
  type AssetCategory,
  type FundSubCategory,
  type StockSubCategory,
} from "@/components/add-holding/catalog";
import { buildFetchPriceInput } from "@/components/add-holding/helpers";
import type {
  AddHoldingDialogProps as Props,
  CurrencyDisplay,
} from "@/components/add-holding/types";
import { useAddHoldingSearch } from "@/components/add-holding/useAddHoldingSearch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { usePortfolioActions } from "@/hooks/usePortfolioActions";
import { ROUTE_PATHS } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

export default function AddHoldingDialog({
  open,
  onOpenChange,
  assets,
  onSuccess,
}: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const portfolioActions = usePortfolioActions();
  const [, setLocation] = useLocation();

  const text = isZh
    ? {
        title: "添加资产",
        description: "添加新资产到您的投资组合，实时价格",
        importExcel: "批量导入",
        errorSelectAll: "请选择资产类型、资产和数量",
        errorInvalidAsset: "选择的资产无效",
        success: "持仓添加成功",
        errorAdd: "添加持仓失败：",
      }
    : {
        title: "Add Asset",
        description: "Add a new asset to your portfolio with real-time pricing",
        importExcel: "Bulk Import",
        errorSelectAll: "Please select category, asset and quantity",
        errorInvalidAsset: "Invalid asset selected",
        success: "Holding added successfully",
        errorAdd: "Failed to add holding: ",
      };

  const [selectedCategory, setSelectedCategory] =
    useState<AssetCategory>("stock");
  const [selectedStockSubCategory, setSelectedStockSubCategory] =
    useState<StockSubCategory>("cn_stock");
  const [selectedFundSubCategory, setSelectedFundSubCategory] =
    useState<FundSubCategory>("china_fund");
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [annualInterestRate, setAnnualInterestRate] = useState("");
  const [currencyDisplay, setCurrencyDisplay] =
    useState<CurrencyDisplay>("USD");
  const {
    assetComboboxOpen,
    setAssetComboboxOpen,
    fundSearchInput,
    setFundSearchInput,
    internationalFundSearchInput,
    setInternationalFundSearchInput,
    internationalFundSearchQuery,
    stockSearchInput,
    setStockSearchInput,
    stockSearchQuery,
    assetsInCategory,
    selectedAsset,
    isLoading,
    resetSearchState,
  } = useAddHoldingSearch({
    assets,
    selectedCategory,
    selectedStockSubCategory,
    selectedFundSubCategory,
    selectedAssetSymbol,
  });

  const fetchPrice = trpc.prices.fetchSingle.useQuery(
    buildFetchPriceInput({
      assets,
      selectedAssetSymbol,
      selectedCategory,
      selectedFundSubCategory,
    }),
    {
      enabled: selectedAssetSymbol !== "",
      retry: 1,
    }
  );

  const priceData = fetchPrice.data;

  const resetForm = () => {
    setSelectedCategory("stock");
    setSelectedAssetSymbol("");
    setQuantity("");
    setCostBasis("");
    setAnnualInterestRate("");
    setCurrencyDisplay("USD");
    setSelectedStockSubCategory("cn_stock");
    setSelectedFundSubCategory("china_fund");
    resetSearchState();
  };

  const handleCategoryChange = (value: string) => {
    const category = value as AssetCategory;

    setSelectedCategory(category);
    setSelectedAssetSymbol("");

    if (category !== "fund") {
      setFundSearchInput("");
      setInternationalFundSearchInput("");
      setSelectedFundSubCategory("china_fund");
    }

    if (category !== "stock") {
      setStockSearchInput("");
      setSelectedStockSubCategory("cn_stock");
    }

    if (category !== "currency") {
      setAnnualInterestRate("");
    }
  };

  const handleStockSubCategoryChange = (value: string) => {
    setSelectedStockSubCategory(value as StockSubCategory);
    setSelectedAssetSymbol("");
  };

  const handleFundSubCategoryChange = (value: string) => {
    setSelectedFundSubCategory(value as FundSubCategory);
    setSelectedAssetSymbol("");
    setFundSearchInput("");
    setInternationalFundSearchInput("");
  };

  const handleAssetChange = (symbol: string) => {
    setSelectedAssetSymbol(symbol);
    setAssetComboboxOpen(false);
  };

  const handleAssetInputChange = (nextValue: string) => {
    if (selectedCategory === "fund") {
      if (selectedFundSubCategory === "china_fund") {
        setFundSearchInput(nextValue);
      } else {
        setInternationalFundSearchInput(nextValue);
      }

      return;
    }

    setStockSearchInput(nextValue);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCategory || !selectedAssetSymbol || !quantity) {
      toast.error(text.errorSelectAll);
      return;
    }

    try {
      let asset = assets.find(item => item.symbol === selectedAssetSymbol);

      if (!asset) {
        const assetToCreate =
          selectedAsset ??
          ALL_DEFAULT_ASSETS.find(item => item.symbol === selectedAssetSymbol);

        if (!assetToCreate) {
          toast.error(text.errorInvalidAsset);
          return;
        }

        asset = await portfolioActions.createAsset({
          symbol: assetToCreate.symbol,
          type: assetToCreate.type,
          name: assetToCreate.name,
          baseCurrency: assetToCreate.currency ?? "CNY",
        });
      }

      await portfolioActions.addHolding({
        assetId: asset.id,
        quantity,
        costBasis: costBasis || undefined,
        annualInterestRate:
          selectedCategory === "currency"
            ? annualInterestRate || undefined
            : undefined,
      });

      resetForm();
      onOpenChange(false);
      toast.success(text.success);
      void Promise.resolve(onSuccess()).catch(error => {
        console.error("Error refreshing portfolio after add:", error);
      });
    } catch (error) {
      console.error("Error adding holding:", error);
      const message =
        error instanceof Error && error.message
          ? `${text.errorAdd}${error.message}`
          : text.errorAdd;
      toast.error(message);
    }
  };

  const currentPrice =
    currencyDisplay === "USD" ? priceData?.priceUSD : priceData?.priceCNY;
  const totalValue =
    currentPrice && quantity ? parseFloat(quantity) * currentPrice : 0;
  const isSubmitting =
    portfolioActions.isAddingHolding || portfolioActions.isCreatingAsset;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <div>
            <DialogTitle>{text.title}</DialogTitle>
            <DialogDescription>{text.description}</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 w-full space-y-4">
          <AddHoldingSelectionSection
            isZh={isZh}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            selectedStockSubCategory={selectedStockSubCategory}
            onStockSubCategoryChange={handleStockSubCategoryChange}
            selectedFundSubCategory={selectedFundSubCategory}
            onFundSubCategoryChange={handleFundSubCategoryChange}
            assetComboboxOpen={assetComboboxOpen}
            setAssetComboboxOpen={setAssetComboboxOpen}
            selectedAsset={selectedAsset}
            selectedAssetSymbol={selectedAssetSymbol}
            assetsInCategory={assetsInCategory}
            onAssetChange={handleAssetChange}
            fundSearchInput={fundSearchInput}
            internationalFundSearchInput={internationalFundSearchInput}
            stockSearchInput={stockSearchInput}
            onInputChange={handleAssetInputChange}
            isLoading={isLoading}
            internationalFundQuery={internationalFundSearchQuery}
            stockQuery={stockSearchQuery}
          />

          <AddHoldingDetailsSection
            isZh={isZh}
            onImportExcel={() => {
              onOpenChange(false);
              setLocation(ROUTE_PATHS.importPreview);
            }}
            selectedAssetSymbol={selectedAssetSymbol}
            selectedCategory={selectedCategory}
            priceLoading={fetchPrice.isLoading}
            priceData={priceData}
            currencyDisplay={currencyDisplay}
            onCurrencyDisplayChange={setCurrencyDisplay}
            currentPrice={currentPrice}
            quantity={quantity}
            onQuantityChange={setQuantity}
            costBasis={costBasis}
            onCostBasisChange={setCostBasis}
            annualInterestRate={annualInterestRate}
            onAnnualInterestRateChange={setAnnualInterestRate}
            totalValue={totalValue}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            isSubmitDisabled={isSubmitting || fetchPrice.isLoading}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
