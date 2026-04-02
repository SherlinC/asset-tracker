import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getLocalizedAssetName } from "@/lib/assetLocalization";
import { cn } from "@/lib/utils";

import type {
  AssetCategory,
  AssetOption,
  FundSubCategory,
  StockSubCategory,
} from "./catalog";

type Props = {
  isZh: boolean;
  selectedCategory: AssetCategory;
  selectedStockSubCategory: StockSubCategory;
  selectedFundSubCategory: FundSubCategory;
  assetComboboxOpen: boolean;
  setAssetComboboxOpen: (open: boolean) => void;
  selectedAsset: AssetOption | null;
  selectedAssetSymbol: string;
  assetsInCategory: AssetOption[];
  onAssetChange: (symbol: string) => void;
  fundSearchInput: string;
  internationalFundSearchInput: string;
  stockSearchInput: string;
  onInputChange: (value: string) => void;
  isLoading: boolean;
  internationalFundQuery: string;
  stockQuery: string;
};

function usesRemoteSearch(
  selectedCategory: AssetCategory,
  selectedFundSubCategory: FundSubCategory,
  selectedStockSubCategory: StockSubCategory
) {
  return (
    (selectedCategory === "fund" &&
      (selectedFundSubCategory === "china_fund" ||
        selectedFundSubCategory === "international_fund")) ||
    (selectedCategory === "stock" && selectedStockSubCategory === "cn_stock")
  );
}

export function AssetPicker({
  isZh,
  selectedCategory,
  selectedStockSubCategory,
  selectedFundSubCategory,
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
}: Props) {
  const remoteSearch = usesRemoteSearch(
    selectedCategory,
    selectedFundSubCategory,
    selectedStockSubCategory
  );

  const searchValue =
    selectedCategory === "fund"
      ? selectedFundSubCategory === "china_fund"
        ? fundSearchInput
        : internationalFundSearchInput
      : stockSearchInput;

  const placeholder = isZh
    ? selectedCategory === "fund"
      ? selectedFundSubCategory === "china_fund"
        ? "输入基金代码或名称搜索..."
        : "输入国际基金名称、ETF 代码或 ISIN 搜索..."
      : "输入股票代码、名称或拼音搜索..."
    : selectedCategory === "fund"
      ? selectedFundSubCategory === "china_fund"
        ? "Search fund code or name..."
        : "Search international fund name, ETF code or ISIN..."
      : "Search stock symbol, name or pinyin...";

  const emptyText = isZh
    ? selectedCategory === "fund" && selectedFundSubCategory === "china_fund"
      ? "未找到基金，请换关键词"
      : selectedCategory === "fund" &&
          selectedFundSubCategory === "international_fund"
        ? internationalFundQuery.trim()
          ? "未找到国际基金，请换名称、ETF 代码或 ISIN"
          : "请输入国际基金名称、ETF 代码或 ISIN 搜索"
        : selectedCategory === "stock" &&
            selectedStockSubCategory === "cn_stock"
          ? stockQuery.trim()
            ? "未找到A股，请换代码、名称或拼音"
            : "请输入股票代码、名称或拼音搜索A股"
          : "未找到资产"
    : selectedCategory === "fund" && selectedFundSubCategory === "china_fund"
      ? "No fund found, try different keywords"
      : selectedCategory === "fund" &&
          selectedFundSubCategory === "international_fund"
        ? internationalFundQuery.trim()
          ? "No international fund found, try name, ETF code or ISIN"
          : "Search international fund name, ETF code or ISIN"
        : selectedCategory === "stock" &&
            selectedStockSubCategory === "cn_stock"
          ? stockQuery.trim()
            ? "No A-share found, try symbol, name or pinyin"
            : "Search stock symbol, name or pinyin for A-shares"
          : "No asset found.";

  const internationalFundHint = isZh
    ? "优先显示可直接获取价格的 ETF / 基金代码；部分仅支持 ISIN 的国际基金在当前公开行情源下可能搜不到或无法报价。"
    : "Results prioritize ETFs and fund symbols with direct public pricing; some ISIN-only international funds may be unavailable or unpriceable with the current public data sources.";

  return (
    <div className="space-y-2 min-w-0">
      <Label htmlFor="asset">{isZh ? "资产" : "Asset"}</Label>
      <Popover open={assetComboboxOpen} onOpenChange={setAssetComboboxOpen}>
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
                  ? isZh
                    ? "按代码或名称搜索..."
                    : "Search by symbol or name..."
                  : isZh
                    ? "请先选择类型"
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
          <Command shouldFilter={!remoteSearch}>
            {remoteSearch ? (
              <div className="border-b px-2 py-2">
                <Input
                  value={searchValue}
                  onChange={e => onInputChange(e.target.value)}
                  placeholder={placeholder}
                  className="border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {selectedCategory === "fund" &&
                selectedFundSubCategory === "international_fund" ? (
                  <p className="text-muted-foreground pt-2 text-xs leading-5">
                    {internationalFundHint}
                  </p>
                ) : null}
              </div>
            ) : (
              <CommandInput placeholder="Type symbol or name..." />
            )}
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedCategory === "fund"
                    ? selectedFundSubCategory === "china_fund"
                      ? "加载基金列表..."
                      : "搜索国际基金中..."
                    : "搜索A股中..."}
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {assetsInCategory.map(asset => (
                      <CommandItem
                        key={asset.symbol}
                        value={`${asset.symbol} ${asset.name} ${(asset.keywords ?? []).join(" ")}`}
                        onSelect={() => onAssetChange(asset.symbol)}
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
  );
}
