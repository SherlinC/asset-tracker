import { AssetPicker } from "@/components/add-holding/AssetPicker";
import {
  CATEGORY_LABELS,
  CATEGORY_LABELS_ZH,
  CATEGORY_ORDER,
  FUND_SUBCATEGORY_ORDER,
  FUND_SUBCATEGORY_LABELS,
  STOCK_SUBCATEGORY_ORDER,
  STOCK_SUBCATEGORY_LABELS,
} from "@/components/add-holding/catalog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { AddHoldingSelectionProps } from "./types";

export function AddHoldingSelectionSection({
  isZh,
  selectedCategory,
  onCategoryChange,
  selectedStockSubCategory,
  onStockSubCategoryChange,
  selectedFundSubCategory,
  onFundSubCategoryChange,
  assetComboboxOpen,
  setAssetComboboxOpen,
  selectedAsset,
  selectedAssetSymbol,
  assetsInCategory,
  onAssetChange,
  fundSearchInput,
  internationalFundSearchInput,
  stockSearchInput,
  onInputChange,
  isLoading,
  internationalFundQuery,
  stockQuery,
}: AddHoldingSelectionProps) {
  const text = isZh
    ? {
        assetType: "资产类型",
        stockMarket: "股票市场",
        fundType: "基金类型",
      }
    : {
        assetType: "Asset type",
        stockMarket: "Stock market",
        fundType: "Fund type",
      };

  return (
    <>
      <div className="space-y-2 min-w-0">
        <Label>{text.assetType}</Label>
        <Tabs
          value={selectedCategory}
          onValueChange={onCategoryChange}
          className="w-full"
        >
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            {CATEGORY_ORDER.map(category => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-background flex-1 min-w-0"
              >
                {isZh
                  ? CATEGORY_LABELS_ZH[category]
                  : CATEGORY_LABELS[category]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {selectedCategory === "stock" && (
        <div className="space-y-2 min-w-0">
          <Label>{text.stockMarket}</Label>
          <Select
            value={selectedStockSubCategory}
            onValueChange={onStockSubCategoryChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STOCK_SUBCATEGORY_ORDER.map(subCategory => (
                <SelectItem key={subCategory} value={subCategory}>
                  {STOCK_SUBCATEGORY_LABELS[subCategory]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedCategory === "fund" && (
        <div className="space-y-2 min-w-0">
          <Label>{text.fundType}</Label>
          <Select
            value={selectedFundSubCategory}
            onValueChange={onFundSubCategoryChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUND_SUBCATEGORY_ORDER.map(subCategory => (
                <SelectItem key={subCategory} value={subCategory}>
                  {FUND_SUBCATEGORY_LABELS[subCategory]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <AssetPicker
        isZh={isZh}
        selectedCategory={selectedCategory}
        selectedStockSubCategory={selectedStockSubCategory}
        selectedFundSubCategory={selectedFundSubCategory}
        assetComboboxOpen={assetComboboxOpen}
        setAssetComboboxOpen={setAssetComboboxOpen}
        selectedAsset={selectedAsset}
        selectedAssetSymbol={selectedAssetSymbol}
        assetsInCategory={assetsInCategory}
        onAssetChange={onAssetChange}
        fundSearchInput={fundSearchInput}
        internationalFundSearchInput={internationalFundSearchInput}
        stockSearchInput={stockSearchInput}
        onInputChange={onInputChange}
        isLoading={isLoading}
        internationalFundQuery={internationalFundQuery}
        stockQuery={stockQuery}
      />
    </>
  );
}
