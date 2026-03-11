import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { getLocalizedAssetName } from "@/lib/assetLocalization";
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
  onSuccess: () => void | Promise<void>;
}

type AssetCategory =
  | "stock"
  | "crypto"
  | "precious_metals"
  | "fund"
  | "currency";

type StockSubCategory = "us_stock" | "cn_stock" | "hk_stock";
type FundSubCategory = "china_fund" | "international_fund";

type BackendAssetType = "currency" | "crypto" | "stock" | "fund";

type AssetOption = {
  symbol: string;
  displaySymbol?: string;
  type: BackendAssetType;
  name: string;
  issuer?: string;
  market?: string;
  currency?: string;
  keywords?: string[];
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  stock: "Stock",
  crypto: "Crypto",
  precious_metals: "Precious metals",
  fund: "Fund",
  currency: "Currency",
};

const CATEGORY_LABELS_ZH: Record<AssetCategory, string> = {
  stock: "股票",
  crypto: "虚拟货币",
  precious_metals: "贵金属",
  fund: "基金",
  currency: "货币",
};

const CATEGORY_ORDER: AssetCategory[] = [
  "stock",
  "crypto",
  "precious_metals",
  "fund",
  "currency",
];

const STOCK_SUBCATEGORY_LABELS: Record<StockSubCategory, string> = {
  us_stock: "美股",
  cn_stock: "A股",
  hk_stock: "港股",
};

const FUND_SUBCATEGORY_LABELS: Record<FundSubCategory, string> = {
  china_fund: "中国基金",
  international_fund: "国际基金",
};

const STOCK_ASSETS_BY_SUBCATEGORY: Record<StockSubCategory, AssetOption[]> = {
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

const ASSETS_BY_CATEGORY: Record<AssetCategory, AssetOption[]> = {
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
  ],
};

const ALL_DEFAULT_ASSETS = [
  ...Object.values(STOCK_ASSETS_BY_SUBCATEGORY).flat(),
  ...ASSETS_BY_CATEGORY.crypto,
  ...ASSETS_BY_CATEGORY.precious_metals,
  ...ASSETS_BY_CATEGORY.currency,
];

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
  const [assetComboboxOpen, setAssetComboboxOpen] = useState(false);
  const [quantity, setQuantity] = useState<string>("");
  const [costBasis, setCostBasis] = useState<string>("");
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");
  const [fundSearchInput, setFundSearchInput] = useState("");
  const [fundSearchQuery, setFundSearchQuery] = useState("");
  const [internationalFundSearchInput, setInternationalFundSearchInput] =
    useState("");
  const [internationalFundSearchQuery, setInternationalFundSearchQuery] =
    useState("");
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const createAsset = trpc.assets.create.useMutation();
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
    setAssetComboboxOpen(false);
    setQuantity("");
    setCostBasis("");
    setCurrencyDisplay("USD");
    setSelectedStockSubCategory("us_stock");
    setSelectedFundSubCategory("china_fund");
    setFundSearchInput("");
    setFundSearchQuery("");
    setInternationalFundSearchInput("");
    setInternationalFundSearchQuery("");
    setStockSearchInput("");
    setStockSearchQuery("");
  };

  const handleCategoryChange = (value: string) => {
    const cat = value as AssetCategory;
    setSelectedCategory(cat);
    setSelectedAssetSymbol("");
    if (cat !== "fund") {
      setFundSearchInput("");
      setFundSearchQuery("");
      setInternationalFundSearchInput("");
      setInternationalFundSearchQuery("");
    }
    if (cat !== "stock") {
      setStockSearchInput("");
      setStockSearchQuery("");
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

  const stockListForCategory: AssetOption[] =
    selectedCategory === "stock" && selectedStockSubCategory === "cn_stock"
      ? (stockSearch.data ?? []).map(stock => ({
          symbol: stock.symbol,
          displaySymbol: stock.code,
          type: "stock" as BackendAssetType,
          name: stock.name,
          market: stock.market,
          keywords: [stock.code, stock.pinyin, stock.market],
        }))
      : [];
  const usEtfListForCategory: AssetOption[] =
    selectedCategory === "fund" &&
    selectedFundSubCategory === "international_fund"
      ? (usEtfSearch.data ?? []).map(etf => ({
          symbol: etf.symbol,
          type: "stock" as BackendAssetType,
          name: etf.name,
          issuer: etf.issuer,
          market: etf.exchange,
          keywords: [etf.issuer, etf.exchange, ...(etf.keywords ?? [])],
        }))
      : [];
  const internationalFundListForCategory: AssetOption[] =
    selectedCategory === "fund" &&
    selectedFundSubCategory === "international_fund"
      ? (internationalFundSearch.data ?? []).map(fund => ({
          symbol: fund.symbol,
          displaySymbol: fund.isin,
          type: "fund" as BackendAssetType,
          name: fund.name,
          market: fund.market,
          currency: fund.currency,
          keywords: [fund.isin, fund.externalSymbol, fund.currency].filter(
            Boolean
          ) as string[],
        }))
      : [];
  const internationalFundOptions: AssetOption[] =
    selectedCategory === "fund" &&
    selectedFundSubCategory === "international_fund"
      ? Array.from(
          new Map(
            [...usEtfListForCategory, ...internationalFundListForCategory].map(
              item => [item.symbol, item]
            )
          ).values()
        )
      : [];
  const fundListForCategory: AssetOption[] =
    selectedCategory === "fund" && selectedFundSubCategory === "china_fund"
      ? (fundSearch.data ?? []).map(f => ({
          symbol: f.symbol,
          type: "fund" as BackendAssetType,
          name: f.name,
        }))
      : [];
  const assetsInCategory = selectedCategory
    ? selectedCategory === "stock"
      ? selectedStockSubCategory === "cn_stock"
        ? stockListForCategory
        : STOCK_ASSETS_BY_SUBCATEGORY[selectedStockSubCategory]
      : selectedCategory === "fund"
        ? selectedFundSubCategory === "china_fund"
          ? fundListForCategory
          : internationalFundOptions
        : (ASSETS_BY_CATEGORY[selectedCategory] ?? [])
    : [];
  const selectedExistingAsset = selectedAssetSymbol
    ? assets.find(a => a.symbol === selectedAssetSymbol)
    : undefined;
  const selectedAsset = selectedAssetSymbol
    ? (assetsInCategory.find(a => a.symbol === selectedAssetSymbol) ??
      (selectedExistingAsset
        ? {
            symbol: selectedExistingAsset.symbol,
            type: selectedExistingAsset.type as BackendAssetType,
            name: selectedExistingAsset.name,
          }
        : undefined) ??
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
                  setFundSearchQuery("");
                  setInternationalFundSearchInput("");
                  setInternationalFundSearchQuery("");
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
                        {selectedAsset.displaySymbol ?? selectedAsset.symbol}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {getLocalizedAssetName(
                          selectedAsset.symbol,
                          selectedAsset.name,
                          isZh
                        )}
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
                <Command
                  shouldFilter={
                    !(
                      (selectedCategory === "fund" &&
                        (selectedFundSubCategory === "china_fund" ||
                          selectedFundSubCategory === "international_fund")) ||
                      (selectedCategory === "stock" &&
                        selectedStockSubCategory === "cn_stock")
                    )
                  }
                >
                  {(selectedCategory === "fund" &&
                    (selectedFundSubCategory === "china_fund" ||
                      selectedFundSubCategory === "international_fund")) ||
                  (selectedCategory === "stock" &&
                    selectedStockSubCategory === "cn_stock") ? (
                    <div className="flex items-center border-b px-2">
                      <Input
                        value={
                          selectedCategory === "fund"
                            ? selectedFundSubCategory === "china_fund"
                              ? fundSearchInput
                              : internationalFundSearchInput
                            : stockSearchInput
                        }
                        onChange={e => {
                          const nextValue = e.target.value;

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
                        placeholder={
                          selectedCategory === "fund"
                            ? selectedFundSubCategory === "china_fund"
                              ? "输入基金代码或名称搜索..."
                              : "输入国际基金名称、ETF 代码或 ISIN 搜索..."
                            : "输入股票代码、名称或拼音搜索..."
                        }
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  ) : (
                    <CommandInput placeholder="Type symbol or name..." />
                  )}
                  <CommandList>
                    {(selectedCategory === "fund" &&
                      ((selectedFundSubCategory === "china_fund" &&
                        fundSearch.isLoading) ||
                        (selectedFundSubCategory === "international_fund" &&
                          (internationalFundSearch.isLoading ||
                            usEtfSearch.isLoading)))) ||
                    (selectedCategory === "stock" &&
                      selectedStockSubCategory === "cn_stock" &&
                      stockSearch.isLoading) ? (
                      <div className="flex items-center justify-center py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {selectedCategory === "fund"
                          ? selectedFundSubCategory === "china_fund"
                            ? "加载基金列表..."
                            : "搜索国际基金中..."
                          : "搜索A股中..."}
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>
                          {selectedCategory === "fund" &&
                          selectedFundSubCategory === "china_fund"
                            ? "未找到基金，请换关键词"
                            : selectedCategory === "fund" &&
                                selectedFundSubCategory === "international_fund"
                              ? internationalFundSearchQuery.trim()
                                ? "未找到国际基金，请换名称、ETF 代码或 ISIN"
                                : "请输入国际基金名称、ETF 代码或 ISIN 搜索"
                              : selectedCategory === "stock" &&
                                  selectedStockSubCategory === "cn_stock"
                                ? stockSearchQuery.trim()
                                  ? "未找到A股，请换代码、名称或拼音"
                                  : "请输入股票代码、名称或拼音搜索A股"
                                : "No asset found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {assetsInCategory.map(asset => (
                            <CommandItem
                              key={asset.symbol}
                              value={`${asset.symbol} ${asset.name} ${(asset.keywords ?? []).join(" ")}`}
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
                              <span className="font-medium">
                                {asset.displaySymbol ?? asset.symbol}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {getLocalizedAssetName(
                                  asset.symbol,
                                  asset.name,
                                  isZh
                                )}
                              </span>
                              {asset.issuer ? (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {asset.issuer}
                                </span>
                              ) : null}
                              {asset.market ? (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {asset.market}
                                </span>
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
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
