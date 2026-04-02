import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLocalizedAssetName } from "@/lib/assetLocalization";

import {
  TYPE_LABELS_ZH,
  getAssetSubTypeLabel,
  getProfitLossColor,
  getTypeColor,
} from "./constants";
import { formatDateTime, formatMoney, formatQuantity } from "./utils";

import type {
  AggregatedHolding,
  CurrencyDisplay,
  EditHoldingState,
} from "./types";

type Props = {
  isZh: boolean;
  currencyDisplay: CurrencyDisplay;
  exchangeRate: number;
  totalPortfolioUSD: number;
  groups: AggregatedHolding[];
  expandedAssets: Record<number, boolean>;
  onToggleExpanded: (assetId: number) => void;
  onStartEdit: React.Dispatch<React.SetStateAction<EditHoldingState | null>>;
  onExpandAsset: (assetId: number) => void;
  onDeleteHolding: (holdingId: number) => void;
  deletePending: boolean;
};

export function HoldingsCategoryTable({
  isZh,
  currencyDisplay,
  exchangeRate,
  totalPortfolioUSD,
  groups,
  expandedAssets,
  onToggleExpanded,
  onStartEdit,
  onExpandAsset,
  onDeleteHolding,
  deletePending,
}: Props) {
  return (
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
              {isZh ? "当前价" : "Current Price"} ({currencyDisplay})
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
          {groups.map(group => {
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
            const issueMessage =
              group.issueCode === "missing_eodhd_api_key"
                ? isZh
                  ? currentPriceUSD > 0
                    ? "缺少行情源配置，当前显示缓存价格"
                    : "缺少行情源配置，当前无法获取价格"
                  : currentPriceUSD > 0
                    ? "Missing market data configuration; showing cached price"
                    : "Missing market data configuration; price unavailable"
                : null;

            return (
              <Fragment key={asset.id}>
                <TableRow>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-0.5 h-8 w-8 p-0"
                        onClick={() => onToggleExpanded(asset.id)}
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
                      <div className="text-left">
                        <p className="flex items-center gap-1 font-semibold text-foreground">
                          {asset.symbol}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getLocalizedAssetName(
                            asset.symbol,
                            asset.name,
                            isZh
                          )}
                        </p>
                        {issueMessage ? (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            {issueMessage}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isZh
                            ? `${records.length} 条操作记录`
                            : `${records.length} operation record${records.length > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${getTypeColor(asset.type)}`}
                      >
                        {isZh
                          ? (TYPE_LABELS_ZH[asset.type] ?? asset.type)
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
                        {isZh ? "成本未填" : "Incomplete cost basis"}
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
                          {formatMoney(Math.abs(profitLossDisplay), symbol)}
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
                            onStartEdit({
                              id: first.holding.id,
                              quantity: first.holding.quantity,
                              costBasis: first.holding.costBasis ?? "",
                              annualInterestRate:
                                first.holding.annualInterestRate ?? "",
                              assetName: getLocalizedAssetName(
                                asset.symbol,
                                asset.name,
                                isZh
                              ),
                              symbol: asset.symbol,
                              assetType: asset.type,
                            });
                            onExpandAsset(asset.id);
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
                    <TableCell colSpan={10} className="bg-muted/20 py-0">
                      <div className="space-y-2 px-4 py-3">
                        <div className="text-sm font-medium text-foreground">
                          {isZh ? "操作记录" : "Operation records"}
                        </div>
                        {records.map(({ holding }) => {
                          const recordQuantity = parseFloat(holding.quantity);
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
                                  {formatDateTime(holding.createdAt)}
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
                                {holding.annualInterestRate ? (
                                  <p className="text-sm text-muted-foreground">
                                    {isZh ? "年利率：" : "Annual rate: "}
                                    {holding.annualInterestRate}%
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onStartEdit({
                                      id: holding.id,
                                      quantity: holding.quantity,
                                      costBasis: holding.costBasis ?? "",
                                      annualInterestRate:
                                        holding.annualInterestRate ?? "",
                                      assetName: getLocalizedAssetName(
                                        asset.symbol,
                                        asset.name,
                                        isZh
                                      ),
                                      symbol: asset.symbol,
                                      assetType: asset.type,
                                    });
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteHolding(holding.id)}
                                  disabled={deletePending}
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
  );
}
