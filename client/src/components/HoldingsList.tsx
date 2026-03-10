import {
  ChevronDown,
  ChevronUp,
  Edit2,
  ExternalLink,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

interface Holding {
  holding: {
    id: number;
    userId: number;
    assetId: number;
    quantity: string;
    costBasis: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  asset: {
    id: number;
    userId: number;
    symbol: string;
    type: string;
    name: string;
    baseCurrency: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface Props {
  holdings: Holding[];
  onRefresh: () => void;
  /** When set, switch to the tab that matches this asset type and clear after handling */
  scrollToCategory?: string | null;
  onScrollToCategoryHandled?: () => void;
}

type AggregatedHolding = {
  asset: Holding["asset"];
  records: Holding[];
  totalQuantity: number;
  currentPriceUSD: number;
  totalValueUSD: number;
  totalCostBasisUSD: number | null;
  profitLossUSD: number | null;
  profitLossPercent: number | null;
  change24h: number;
};

const getAssetSubTypeLabel = (asset: Holding["asset"]) => {
  const symbol = asset.symbol.toUpperCase();

  if (asset.type === "stock") {
    if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) {
      return "A股";
    }
    if (symbol.endsWith(".HK")) {
      return "港股";
    }
    return "美股";
  }

  if (asset.type === "fund") {
    if (
      symbol.endsWith(".EUFUND") ||
      /^[A-Z]{2}[A-Z0-9]{10}(\.[A-Z]+)?$/.test(symbol)
    ) {
      return "国际基金";
    }
    return "中国基金";
  }

  if (asset.type === "crypto") {
    return "加密货币";
  }

  if (asset.type === "currency") {
    return "货币";
  }

  return null;
};

export type HoldingCategoryKey =
  | "crypto"
  | "us_stock"
  | "a_stock"
  | "hk_stock"
  | "us_etf"
  | "fund"
  | "currency"
  | "other";

const getAssetCategoryKey = (asset: Holding["asset"]): HoldingCategoryKey => {
  const label = getAssetSubTypeLabel(asset);
  switch (label) {
    case "加密货币":
      return "crypto";
    case "美股":
      return "us_stock";
    case "A股":
      return "a_stock";
    case "港股":
      return "hk_stock";
    case "国际基金":
      return "us_etf";
    case "中国基金":
      return "fund";
    case "货币":
      return "currency";
    default:
      return "other";
  }
};

const CATEGORY_ORDER: HoldingCategoryKey[] = [
  "crypto",
  "us_stock",
  "a_stock",
  "hk_stock",
  "us_etf",
  "fund",
  "currency",
  "other",
];

const CATEGORY_LABELS: Record<HoldingCategoryKey, string> = {
  crypto: "虚拟货币",
  us_stock: "美股",
  a_stock: "A股",
  hk_stock: "港股",
  us_etf: "国际基金",
  fund: "中国基金",
  currency: "货币",
  other: "其他",
};

const CATEGORY_LABELS_EN: Record<HoldingCategoryKey, string> = {
  crypto: "Crypto",
  us_stock: "US Stocks",
  a_stock: "A-Shares",
  hk_stock: "HK Stocks",
  us_etf: "International Fund",
  fund: "China Fund",
  currency: "Currency",
  other: "Other",
};

const TYPE_LABELS_ZH: Record<string, string> = {
  currency: "货币",
  crypto: "虚拟货币",
  stock: "股票",
  fund: "基金",
};

type EditHoldingState = {
  id: number;
  quantity: string;
  costBasis: string;
  assetName: string;
  symbol: string;
};

export default function HoldingsList({
  holdings,
  onRefresh,
  scrollToCategory,
  onScrollToCategoryHandled,
}: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [, navigate] = useLocation();
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");
  const [expandedAssets, setExpandedAssets] = useState<Record<number, boolean>>(
    {}
  );
  const [editHolding, setEditHolding] = useState<EditHoldingState | null>(null);

  const portfolioSummary = trpc.portfolio.summary.useQuery();
  const exchangeRate = portfolioSummary.data?.exchangeRate ?? 7.2;
  const totalPortfolioUSD = portfolioSummary.data?.totalValueUSD ?? 0;

  const updateHolding = trpc.holdings.update.useMutation({
    onSuccess: async () => {
      toast.success("已更新持仓");
      setEditHolding(null);
      onRefresh();
    },
    onError: error => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteHolding = trpc.holdings.delete.useMutation({
    onSuccess: () => {
      toast.success(isZh ? "已删除持仓" : "Holding deleted successfully");
      onRefresh();
    },
    onError: error => {
      toast.error(
        isZh
          ? `删除失败: ${error.message}`
          : `Failed to delete holding: ${error.message}`
      );
    },
  });

  const formatQuantity = (value: number) => {
    return value.toFixed(8).replace(/\.?0+$/, "");
  };

  const formatDateTime = (value: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const formatMoney = (value: number, symbol: string) => {
    return `${symbol}${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "currency":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "crypto":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
      case "stock":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "fund":
        return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getProfitLossColor = (profitLoss: number) => {
    if (profitLoss > 0) return "text-green-600 dark:text-green-400";
    if (profitLoss < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHolding || !editHolding.quantity.trim()) return;
    updateHolding.mutate({
      holdingId: editHolding.id,
      quantity: editHolding.quantity.trim(),
      costBasis: editHolding.costBasis.trim() || undefined,
    });
  };

  const aggregatedHoldings = useMemo<AggregatedHolding[]>(() => {
    const portfolioAssets = portfolioSummary.data?.assets ?? [];
    const grouped = new Map<number, Holding[]>();

    for (const item of holdings) {
      const existing = grouped.get(item.asset.id) ?? [];
      existing.push(item);
      grouped.set(item.asset.id, existing);
    }

    return Array.from(grouped.values())
      .map(records => {
        const asset = records[0].asset;
        const assetSummary = portfolioAssets.find(a => a.id === asset.id);
        const currentPriceUSD = assetSummary?.priceUSD ?? 0;
        const totalQuantity = records.reduce(
          (sum, record) => sum + parseFloat(record.holding.quantity),
          0
        );
        const totalValueUSD = totalQuantity * currentPriceUSD;
        const allHaveCostBasis = records.every(
          record => record.holding.costBasis !== null
        );
        const totalCostBasisUSD = allHaveCostBasis
          ? records.reduce((sum, record) => {
              const quantity = parseFloat(record.holding.quantity);
              const costBasis = parseFloat(record.holding.costBasis ?? "0");
              return sum + quantity * costBasis;
            }, 0)
          : null;
        const profitLossUSD =
          totalCostBasisUSD !== null ? totalValueUSD - totalCostBasisUSD : null;
        const profitLossPercent =
          totalCostBasisUSD && totalCostBasisUSD !== 0 && profitLossUSD !== null
            ? (profitLossUSD / totalCostBasisUSD) * 100
            : null;

        return {
          asset,
          records: [...records].sort(
            (a, b) =>
              new Date(b.holding.createdAt).getTime() -
              new Date(a.holding.createdAt).getTime()
          ),
          totalQuantity,
          currentPriceUSD,
          totalValueUSD,
          totalCostBasisUSD,
          profitLossUSD,
          profitLossPercent,
          change24h: assetSummary?.change24h ?? 0,
        };
      })
      .sort((a, b) => b.totalValueUSD - a.totalValueUSD);
  }, [holdings, portfolioSummary.data?.assets]);

  const { holdingsByCategory, orderedCategories } = useMemo(() => {
    const map = new Map<HoldingCategoryKey, AggregatedHolding[]>();
    for (const group of aggregatedHoldings) {
      const key = getAssetCategoryKey(group.asset);
      const list = map.get(key) ?? [];
      list.push(group);
      map.set(key, list);
    }
    const ordered = CATEGORY_ORDER.filter(
      k => (map.get(k)?.length ?? 0) > 0
    ) as HoldingCategoryKey[];
    return { holdingsByCategory: map, orderedCategories: ordered };
  }, [aggregatedHoldings]);

  const defaultTab =
    orderedCategories.length > 0 ? orderedCategories[0] : "other";

  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (scrollToCategory == null || orderedCategories.length === 0) return;
    const type = scrollToCategory;
    const stockTabs: HoldingCategoryKey[] = [
      "us_stock",
      "a_stock",
      "hk_stock",
      "us_etf",
    ];
    const target =
      type === "currency"
        ? "currency"
        : type === "crypto"
          ? "crypto"
          : type === "fund"
            ? "fund"
            : type === "stock"
              ? (stockTabs.find(t => orderedCategories.includes(t)) ?? null)
              : null;
    if (target && orderedCategories.includes(target as HoldingCategoryKey)) {
      setActiveTab(target);
    }
    onScrollToCategoryHandled?.();
  }, [scrollToCategory, orderedCategories, onScrollToCategoryHandled]);

  const toggleExpanded = (assetId: number) => {
    setExpandedAssets(prev => ({
      ...prev,
      [assetId]: !prev[assetId],
    }));
  };

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "我的持仓" : "Your Holdings"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              {isZh ? "暂无持仓" : "No holdings yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isZh
                ? "添加第一个资产开始追踪组合"
                : "Add your first asset to get started tracking your portfolio"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id="holdings-section" className="scroll-mt-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{isZh ? "我的持仓" : "Your Holdings"}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isZh ? "显示：" : "Display:"}
            </span>
            <Select
              value={currencyDisplay}
              onValueChange={value =>
                setCurrencyDisplay(value as "USD" | "CNY")
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab ?? defaultTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-3 flex flex-wrap gap-1">
              {orderedCategories.map(cat => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-background"
                >
                  {isZh ? CATEGORY_LABELS[cat] : CATEGORY_LABELS_EN[cat]}
                  <span className="ml-1.5 text-muted-foreground">
                    ({(holdingsByCategory.get(cat) ?? []).length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {orderedCategories.map(cat => (
              <TabsContent key={cat} value={cat} className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isZh ? "资产" : "Asset"}</TableHead>
                        <TableHead>{isZh ? "类型" : "Type"}</TableHead>
                        <TableHead className="text-right">
                          {isZh ? "数量" : "Quantity"}
                        </TableHead>
                        <TableHead className="text-right">
                          {isZh ? "当前价" : "Current Price"} ({currencyDisplay}
                          )
                        </TableHead>
                        <TableHead className="text-right">
                          {isZh ? "总市值" : "Total Value"} ({currencyDisplay})
                        </TableHead>
                        <TableHead className="text-right">
                          {isZh ? "仓位占比" : "Allocation %"}
                        </TableHead>
                        <TableHead className="text-right">
                          {isZh ? "成本" : "Cost Basis"} ({currencyDisplay})
                        </TableHead>
                        <TableHead className="text-right">
                          {isZh ? "盈亏" : "Profit/Loss"}
                        </TableHead>
                        <TableHead className="text-right">
                          {isZh ? "24h涨跌" : "24h Change"}
                        </TableHead>
                        <TableHead className="text-right">
                          {isZh ? "操作" : "Actions"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(holdingsByCategory.get(cat) ?? []).map(group => {
                        const {
                          asset,
                          records,
                          totalQuantity,
                          currentPriceUSD,
                          totalValueUSD,
                          totalCostBasisUSD,
                          profitLossUSD,
                          profitLossPercent,
                          change24h,
                        } = group;
                        const isExpanded = expandedAssets[asset.id] ?? false;
                        const assetSubType = getAssetSubTypeLabel(asset);
                        const currentPriceDisplay =
                          currencyDisplay === "USD"
                            ? currentPriceUSD
                            : currentPriceUSD * exchangeRate;
                        const totalValueDisplay =
                          currencyDisplay === "USD"
                            ? totalValueUSD
                            : totalValueUSD * exchangeRate;
                        const allocationPercent =
                          totalPortfolioUSD > 0
                            ? (totalValueUSD / totalPortfolioUSD) * 100
                            : null;
                        const costBasisDisplay =
                          totalCostBasisUSD !== null
                            ? currencyDisplay === "USD"
                              ? totalCostBasisUSD
                              : totalCostBasisUSD * exchangeRate
                            : null;
                        const profitLossDisplay =
                          profitLossUSD !== null
                            ? currencyDisplay === "USD"
                              ? profitLossUSD
                              : profitLossUSD * exchangeRate
                            : null;
                        const symbol = currencyDisplay === "USD" ? "$" : "¥";

                        return (
                          <Fragment key={asset.id}>
                            <TableRow key={asset.id}>
                              <TableCell>
                                <div className="flex items-start gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-0.5 h-8 w-8 p-0"
                                    onClick={() => toggleExpanded(asset.id)}
                                    title={
                                      isExpanded
                                        ? isZh
                                          ? "收起操作记录"
                                          : "Hide operation records"
                                        : isZh
                                          ? "展开操作记录"
                                          : "Show operation records"
                                    }
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(`/asset/${asset.id}`)
                                    }
                                    className="text-left transition-opacity hover:opacity-80"
                                  >
                                    <p className="flex items-center gap-1 font-semibold text-foreground">
                                      {asset.symbol}
                                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {asset.name}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {isZh
                                        ? `${records.length} 条操作记录`
                                        : `${records.length} operation record${records.length > 1 ? "s" : ""}`}
                                    </p>
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={`inline-block rounded px-2 py-1 text-xs font-medium ${getTypeColor(
                                      asset.type
                                    )}`}
                                  >
                                    {isZh
                                      ? (TYPE_LABELS_ZH[asset.type] ??
                                        asset.type)
                                      : asset.type.charAt(0).toUpperCase() +
                                        asset.type.slice(1)}
                                  </span>
                                  {assetSubType ? (
                                    <span className="text-xs text-muted-foreground">
                                      {assetSubType}
                                    </span>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatQuantity(totalQuantity)}
                              </TableCell>
                              <TableCell className="text-right">
                                {currentPriceDisplay > 0
                                  ? formatMoney(currentPriceDisplay, symbol)
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {totalValueDisplay > 0
                                  ? formatMoney(totalValueDisplay, symbol)
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {allocationPercent != null
                                  ? `${allocationPercent.toFixed(1)}%`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {costBasisDisplay !== null ? (
                                  formatMoney(costBasisDisplay, symbol)
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {isZh
                                      ? "成本未填"
                                      : "Incomplete cost basis"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell
                                className={`text-right ${profitLossDisplay !== null ? getProfitLossColor(profitLossDisplay) : ""}`}
                              >
                                {profitLossDisplay !== null ? (
                                  <div className="flex items-center justify-end gap-1">
                                    {profitLossDisplay >= 0 ? (
                                      <TrendingUp className="h-4 w-4" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4" />
                                    )}
                                    <span>
                                      {formatMoney(
                                        Math.abs(profitLossDisplay),
                                        symbol
                                      )}
                                      <span className="ml-1 text-xs">
                                        ({profitLossPercent?.toFixed(2)}%)
                                      </span>
                                    </span>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell
                                className={`text-right ${change24h >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {change24h.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const first = records[0];
                                      if (first) {
                                        setEditHolding({
                                          id: first.holding.id,
                                          quantity: first.holding.quantity,
                                          costBasis:
                                            first.holding.costBasis ?? "",
                                          assetName: asset.name,
                                          symbol: asset.symbol,
                                        });
                                        setExpandedAssets(prev => ({
                                          ...prev,
                                          [asset.id]: true,
                                        }));
                                      }
                                    }}
                                    title="编辑持仓"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell
                                  colSpan={10}
                                  className="bg-muted/20 py-0"
                                >
                                  <div className="space-y-2 px-4 py-3">
                                    <div className="text-sm font-medium text-foreground">
                                      {isZh ? "操作记录" : "Operation records"}
                                    </div>
                                    {records.map(({ holding }) => {
                                      const recordQuantity = parseFloat(
                                        holding.quantity
                                      );
                                      const recordCostBasis = holding.costBasis
                                        ? parseFloat(holding.costBasis)
                                        : null;
                                      const recordCostBasisDisplay =
                                        recordCostBasis !== null
                                          ? currencyDisplay === "USD"
                                            ? recordCostBasis
                                            : recordCostBasis * exchangeRate
                                          : null;

                                      return (
                                        <div
                                          key={holding.id}
                                          className="flex flex-col gap-3 rounded-md border bg-background p-3 md:flex-row md:items-center md:justify-between"
                                        >
                                          <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground">
                                              {isZh ? "添加于 " : "Added "}
                                              {formatDateTime(
                                                holding.createdAt
                                              )}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {isZh ? "数量：" : "Quantity: "}
                                              {formatQuantity(recordQuantity)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {isZh ? "成本：" : "Cost basis: "}
                                              {recordCostBasisDisplay !== null
                                                ? formatMoney(
                                                    recordCostBasisDisplay,
                                                    symbol
                                                  )
                                                : "-"}
                                            </p>
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setEditHolding({
                                                  id: holding.id,
                                                  quantity: holding.quantity,
                                                  costBasis:
                                                    holding.costBasis ?? "",
                                                  assetName: asset.name,
                                                  symbol: asset.symbol,
                                                });
                                              }}
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                deleteHolding.mutate({
                                                  holdingId: holding.id,
                                                });
                                              }}
                                              disabled={deleteHolding.isPending}
                                            >
                                              <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={!!editHolding}
        onOpenChange={open => !open && setEditHolding(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>编辑持仓</DialogTitle>
            <DialogDescription>
              {editHolding
                ? `${editHolding.symbol} ${editHolding.assetName}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editHolding && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">数量</Label>
                <Input
                  id="edit-quantity"
                  type="text"
                  inputMode="decimal"
                  value={editHolding.quantity}
                  onChange={e =>
                    setEditHolding(prev =>
                      prev ? { ...prev, quantity: e.target.value } : null
                    )
                  }
                  placeholder="例如 10 或 0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">成本（可选）</Label>
                <Input
                  id="edit-cost"
                  type="text"
                  inputMode="decimal"
                  value={editHolding.costBasis}
                  onChange={e =>
                    setEditHolding(prev =>
                      prev ? { ...prev, costBasis: e.target.value } : null
                    )
                  }
                  placeholder="留空则不修改"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditHolding(null)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !editHolding.quantity.trim() || updateHolding.isPending
                  }
                >
                  {updateHolding.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
