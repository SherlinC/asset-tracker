import { AssetPicker } from "@/components/add-holding/AssetPicker";
import {
  CATEGORY_LABELS,
  CATEGORY_LABELS_ZH,
  CATEGORY_ORDER,
  FUND_SUBCATEGORY_LABELS,
  STOCK_SUBCATEGORY_LABELS,
  type FundSubCategory,
  type StockSubCategory,
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
  return (
    <>
      <div className="space-y-2 min-w-0">
        <Label>Asset type</Label>
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
          <Label>Stock market</Label>
          <Select
            value={selectedStockSubCategory}
            onValueChange={onStockSubCategoryChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.keys(STOCK_SUBCATEGORY_LABELS) as StockSubCategory[]
              ).map(subCategory => (
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
          <Label>Fund type</Label>
          <Select
            value={selectedFundSubCategory}
            onValueChange={onFundSubCategoryChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FUND_SUBCATEGORY_LABELS) as FundSubCategory[]).map(
                subCategory => (
                  <SelectItem key={subCategory} value={subCategory}>
                    {FUND_SUBCATEGORY_LABELS[subCategory]}
                  </SelectItem>
                )
              )}
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
