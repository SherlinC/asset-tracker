import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AssetPicker } from "@/components/add-holding/AssetPicker";
import { PricePreview } from "@/components/add-holding/PricePreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALL_DEFAULT_ASSETS,
  CATEGORY_LABELS,
  CATEGORY_LABELS_ZH,
  CATEGORY_ORDER,
  FUND_SUBCATEGORY_LABELS,
  type FundSubCategory,
  type AssetCategory,
  STOCK_SUBCATEGORY_LABELS,
  type StockSubCategory,
} from "@/components/add-holding/catalog";
import { useAddHoldingSearch } from "@/components/add-holding/useAddHoldingSearch";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

interface Asset {
  id: number;
  userId: number;
  symbol: string;
  type: string;
  name: string;
  baseCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onSuccess: () => void | Promise<void>;
}

export default function AddHoldingDialog({
  open,
  onOpenChange,
  assets,
  onSuccess,
}: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const utils = trpc.useUtils();
  const [selectedCategory, setSelectedCategory] =
    useState<AssetCategory>("stock");
  const [selectedStockSubCategory, setSelectedStockSubCategory] =
    useState<StockSubCategory>("us_stock");
  const [selectedFundSubCategory, setSelectedFundSubCategory] =
    useState<FundSubCategory>("china_fund");
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [costBasis, setCostBasis] = useState<string>("");
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");
  const createAsset = trpc.assets.create.useMutation();
  const {
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
  } = useAddHoldingSearch({
    assets,
    selectedCategory,
    selectedStockSubCategory,
    selectedFundSubCategory,
    selectedAssetSymbol,
  });

  const addHolding = trpc.holdings.add.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.holdings.list.invalidate(),
        utils.portfolio.summary.invalidate(),
        utils.portfolioHistory.get.invalidate(),
        utils.assets.list.invalidate(),
      ]);
      await onSuccess();
      toast.success("Holding added successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(`Failed to add holding: ${error.message}`);
    },
  });

  const fetchPrice = trpc.prices.fetchSingle.useQuery(
    selectedAssetSymbol && selectedAssetSymbol !== ""
      ? {
          assetId: assets.find(a => a.symbol === selectedAssetSymbol)?.id,
          symbol: selectedAssetSymbol,
          type:
            selectedCategory === "fund" &&
            (selectedFundSubCategory === "china_fund" ||
              selectedFundSubCategory === "international_fund")
              ? "fund"
              : selectedCategory === "currency"
                ? "currency"
                : selectedCategory === "crypto"
                  ? "crypto"
                  : "stock",
        }
      : { symbol: "", type: "stock" },
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
    setCurrencyDisplay("USD");
    setSelectedStockSubCategory("us_stock");
    setSelectedFundSubCategory("china_fund");
    resetSearchState();
  };

  const handleCategoryChange = (value: string) => {
    const cat = value as AssetCategory;
    setSelectedCategory(cat);
    setSelectedAssetSymbol("");
    if (cat !== "fund") {
      setFundSearchInput("");
      setInternationalFundSearchInput("");
    }
    if (cat !== "stock") {
      setStockSearchInput("");
    }
    if (cat !== "stock") {
      setSelectedStockSubCategory("us_stock");
    }
    if (cat !== "fund") {
      setSelectedFundSubCategory("china_fund");
    }
  };

  const handleAssetChange = (symbol: string) => {
    setSelectedAssetSymbol(symbol);
    setAssetComboboxOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory || !selectedAssetSymbol || !quantity) {
      toast.error("Please select category, asset and quantity");
      return;
    }

    try {
      // Find or create asset
      let asset = assets.find(a => a.symbol === selectedAssetSymbol);

      if (!asset) {
        const assetToCreate =
          selectedAsset ??
          ALL_DEFAULT_ASSETS.find(a => a.symbol === selectedAssetSymbol);

        if (!assetToCreate) {
          toast.error("Invalid asset selected");
          return;
        }

        const createdAsset = await createAsset.mutateAsync({
          symbol: assetToCreate.symbol,
          type: assetToCreate.type,
          name: assetToCreate.name,
          baseCurrency: assetToCreate.currency ?? "CNY",
        });
        asset = createdAsset;
      }

      // Add holding
      await addHolding.mutateAsync({
        assetId: asset.id,
        quantity,
        costBasis: costBasis || undefined,
      });
    } catch (error) {
      console.error("Error adding holding:", error);
    }
  };

  const currentPrice =
    currencyDisplay === "USD" ? priceData?.priceUSD : priceData?.priceCNY;
  const totalValue =
    currentPrice && quantity ? parseFloat(quantity) * currentPrice : 0;
  const isSubmitting = addHolding.isPending || createAsset.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add New Holding</DialogTitle>
          <DialogDescription>
            Add a new asset to your portfolio with real-time pricing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 w-full space-y-4">
          <div className="space-y-2 min-w-0">
            <Label>Asset type</Label>
            <Tabs
              value={selectedCategory}
              onValueChange={handleCategoryChange}
              className="w-full"
            >
              <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
                {CATEGORY_ORDER.map(cat => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="data-[state=active]:bg-background flex-1 min-w-0"
                  >
                    {isZh ? CATEGORY_LABELS_ZH[cat] : CATEGORY_LABELS[cat]}
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
                onValueChange={value => {
                  setSelectedStockSubCategory(value as StockSubCategory);
                  setSelectedAssetSymbol("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(STOCK_SUBCATEGORY_LABELS) as StockSubCategory[]
                  ).map(sub => (
                    <SelectItem key={sub} value={sub}>
                      {STOCK_SUBCATEGORY_LABELS[sub]}
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
                onValueChange={value => {
                  setSelectedFundSubCategory(value as FundSubCategory);
                  setSelectedAssetSymbol("");
                  setFundSearchInput("");
                  setInternationalFundSearchInput("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(FUND_SUBCATEGORY_LABELS) as FundSubCategory[]
                  ).map(sub => (
                    <SelectItem key={sub} value={sub}>
                      {FUND_SUBCATEGORY_LABELS[sub]}
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
            onAssetChange={handleAssetChange}
            fundSearchInput={fundSearchInput}
            internationalFundSearchInput={internationalFundSearchInput}
            stockSearchInput={stockSearchInput}
            onInputChange={nextValue => {
              if (selectedCategory === "fund") {
                if (selectedFundSubCategory === "china_fund") {
                  setFundSearchInput(nextValue);
                } else {
                  setInternationalFundSearchInput(nextValue);
                }
              } else {
                setStockSearchInput(nextValue);
              }
            }}
            isLoading={isLoading}
            chinaFundQuery={fundSearchQuery}
            internationalFundQuery={internationalFundSearchQuery}
            stockQuery={stockSearchQuery}
          />

          <PricePreview
            selectedAssetSymbol={selectedAssetSymbol}
            isLoading={fetchPrice.isLoading}
            priceData={priceData}
            currencyDisplay={currencyDisplay}
            setCurrencyDisplay={setCurrencyDisplay}
            currentPrice={currentPrice}
            quantity={quantity}
            totalValue={totalValue}
          />

          <div className="space-y-2 min-w-0">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.00000001"
              placeholder="Enter quantity"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="costBasis">Cost Basis (Optional)</Label>
            <Input
              id="costBasis"
              type="number"
              step="0.01"
              placeholder="Enter cost basis in CNY"
              value={costBasis}
              onChange={e => setCostBasis(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || fetchPrice.isLoading}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add Holding"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
