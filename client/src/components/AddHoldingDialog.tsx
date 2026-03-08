import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

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
  onSuccess: () => void;
}

type AssetCategory =
  | "stock"
  | "crypto"
  | "precious_metals"
  | "fund_etf"
  | "currency";
type BackendAssetType = "currency" | "crypto" | "stock";

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  stock: "Stock",
  crypto: "Crypto",
  precious_metals: "Precious metals",
  fund_etf: "Fund ETF",
  currency: "Currency",
};

const ASSETS_BY_CATEGORY: Record<
  AssetCategory,
  { symbol: string; type: BackendAssetType; name: string }[]
> = {
  stock: [
    { symbol: "AAPL", type: "stock", name: "Apple Inc." },
    { symbol: "AMD", type: "stock", name: "Advanced Micro Devices Inc." },
    { symbol: "BABA", type: "stock", name: "Alibaba Group Holding Limited" },
    { symbol: "COIN", type: "stock", name: "Coinbase Global Inc." },
    { symbol: "DBB", type: "stock", name: "Invesco DB Base Metals Fund" },
    { symbol: "FIG", type: "stock", name: "FIG" },
    { symbol: "GOOGL", type: "stock", name: "Alphabet Inc." },
    { symbol: "AMZN", type: "stock", name: "Amazon.com Inc." },
    { symbol: "JPM", type: "stock", name: "JPMorgan Chase & Co." },
    { symbol: "META", type: "stock", name: "Meta Platforms Inc." },
    { symbol: "MSFT", type: "stock", name: "Microsoft Corporation" },
    { symbol: "NFLX", type: "stock", name: "Netflix Inc." },
    { symbol: "NVDA", type: "stock", name: "NVIDIA Corporation" },
    { symbol: "QQQ", type: "stock", name: "Invesco QQQ Trust" },
    { symbol: "TSLA", type: "stock", name: "Tesla Inc." },
    { symbol: "USO", type: "stock", name: "United States Oil Fund LP" },
  ],
  crypto: [
    { symbol: "BTC", type: "crypto", name: "Bitcoin" },
    { symbol: "ETH", type: "crypto", name: "Ethereum" },
    { symbol: "OKB", type: "crypto", name: "OKB" },
  ],
  precious_metals: [
    { symbol: "GLD", type: "stock", name: "SPDR Gold Shares" },
    { symbol: "SLV", type: "stock", name: "iShares Silver Trust" },
  ],
  fund_etf: [
    { symbol: "SPY", type: "stock", name: "SPDR S&P 500 ETF" },
    { symbol: "QQQ", type: "stock", name: "Invesco QQQ Trust" },
    { symbol: "VOO", type: "stock", name: "Vanguard S&P 500 ETF" },
  ],
  currency: [
    { symbol: "USD", type: "currency", name: "US Dollar" },
    { symbol: "HKD", type: "currency", name: "Hong Kong Dollar" },
  ],
};

const ALL_DEFAULT_ASSETS = Object.values(ASSETS_BY_CATEGORY).flat();

export default function AddHoldingDialog({
  open,
  onOpenChange,
  assets,
  onSuccess,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "">(
    ""
  );
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>("");
  const [assetComboboxOpen, setAssetComboboxOpen] = useState(false);
  const [quantity, setQuantity] = useState<string>("");
  const [costBasis, setCostBasis] = useState<string>("");
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");
  const createAsset = trpc.assets.create.useMutation();
  const addHolding = trpc.holdings.add.useMutation({
    onSuccess: () => {
      toast.success("Holding added successfully");
      resetForm();
      onOpenChange(false);
      onSuccess();
    },
    onError: error => {
      toast.error(`Failed to add holding: ${error.message}`);
    },
  });

  const selectedAssetType = selectedAssetSymbol
    ? (ALL_DEFAULT_ASSETS.find(a => a.symbol === selectedAssetSymbol)?.type ??
      "stock")
    : "stock";

  const fetchPrice = trpc.prices.fetchSingle.useQuery(
    selectedAssetSymbol && selectedAssetSymbol !== ""
      ? {
          symbol: selectedAssetSymbol,
          type: selectedAssetType,
        }
      : { symbol: "", type: "stock" },
    {
      enabled: selectedAssetSymbol !== "",
      retry: 1,
    }
  );

  const priceData = fetchPrice.data;

  const resetForm = () => {
    setSelectedCategory("");
    setSelectedAssetSymbol("");
    setAssetComboboxOpen(false);
    setQuantity("");
    setCostBasis("");
    setCurrencyDisplay("USD");
  };

  const handleCategoryChange = (value: string) => {
    const cat = value as AssetCategory | "";
    setSelectedCategory(cat);
    setSelectedAssetSymbol("");
  };

  const handleAssetChange = (symbol: string) => {
    setSelectedAssetSymbol(symbol);
    setAssetComboboxOpen(false);
  };

  const assetsInCategory = selectedCategory
    ? (ASSETS_BY_CATEGORY[selectedCategory] ?? [])
    : [];
  const selectedAsset = selectedAssetSymbol
    ? (assetsInCategory.find(a => a.symbol === selectedAssetSymbol) ??
      ALL_DEFAULT_ASSETS.find(a => a.symbol === selectedAssetSymbol))
    : null;

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
        const defaultAsset = ALL_DEFAULT_ASSETS.find(
          a => a.symbol === selectedAssetSymbol
        );
        if (!defaultAsset) {
          toast.error("Invalid asset selected");
          return;
        }

        const createdAsset = await createAsset.mutateAsync({
          symbol: defaultAsset.symbol,
          type: defaultAsset.type,
          name: defaultAsset.name,
          baseCurrency: "CNY",
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
            <Select
              value={selectedCategory || undefined}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select type (Stock / Crypto / Precious metals / Fund ETF / Currency)" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="asset">Asset</Label>
            <Popover
              open={assetComboboxOpen}
              onOpenChange={setAssetComboboxOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  id="asset"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={assetComboboxOpen}
                  disabled={!selectedCategory}
                  className={cn(
                    "w-full min-w-0 justify-between font-normal",
                    !selectedAsset && "text-muted-foreground"
                  )}
                >
                  {selectedAsset ? (
                    <span className="min-w-0 truncate">
                      <span className="font-medium">
                        {selectedAsset.symbol}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {selectedAsset.name}
                      </span>
                    </span>
                  ) : (
                    <span className="truncate">
                      {selectedCategory
                        ? "Search by symbol or name..."
                        : "Select type first"}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
                align="start"
              >
                <Command shouldFilter={true}>
                  <CommandInput placeholder="Type symbol or name..." />
                  <CommandList>
                    <CommandEmpty>No asset found.</CommandEmpty>
                    <CommandGroup>
                      {assetsInCategory.map(asset => (
                        <CommandItem
                          key={asset.symbol}
                          value={`${asset.symbol} ${asset.name}`}
                          onSelect={() => handleAssetChange(asset.symbol)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedAssetSymbol === asset.symbol
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="font-medium">{asset.symbol}</span>
                          <span className="text-muted-foreground ml-2">
                            {asset.name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Real-time Price Display */}
          {selectedAssetSymbol && (
            <Card className="p-4 bg-muted/50">
              {fetchPrice.isLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching real-time price...</span>
                </div>
              ) : priceData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Price
                      </p>
                      <p className="text-2xl font-bold">
                        {currencyDisplay === "USD" ? "$" : "¥"}
                        {currentPrice?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          currencyDisplay === "USD" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrencyDisplay("USD")}
                      >
                        USD
                      </Button>
                      <Button
                        type="button"
                        variant={
                          currencyDisplay === "CNY" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrencyDisplay("CNY")}
                      >
                        CNY
                      </Button>
                    </div>
                  </div>
                  {priceData.change24h !== undefined && (
                    <p
                      className={`text-sm ${priceData.change24h >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      24h Change: {priceData.change24h >= 0 ? "+" : ""}
                      {priceData.change24h.toFixed(2)}%
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Unable to fetch price
                </p>
              )}
            </Card>
          )}

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

          {/* Total Value Display */}
          {currentPrice && quantity && (
            <Card className="p-3 bg-accent/10 border-accent/20">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-xl font-semibold">
                {currencyDisplay === "USD" ? "$" : "¥"}
                {totalValue.toFixed(2)}
              </p>
            </Card>
          )}

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
              disabled={
                addHolding.isPending ||
                createAsset.isPending ||
                fetchPrice.isLoading
              }
            >
              {addHolding.isPending ? "Adding..." : "Add Holding"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
