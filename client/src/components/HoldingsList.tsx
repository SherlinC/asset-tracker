import {
  Edit2,
  ExternalLink,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export default function HoldingsList({ holdings, onRefresh }: Props) {
  const [, navigate] = useLocation();
  const [currencyDisplay, setCurrencyDisplay] = useState<"USD" | "CNY">("USD");

  // Fetch exchange rates from portfolio summary
  const portfolioSummary = trpc.portfolio.summary.useQuery();
  const exchangeRate = portfolioSummary.data?.exchangeRate ?? 7.2;

  const deleteHolding = trpc.holdings.delete.useMutation({
    onSuccess: () => {
      toast.success("Holding deleted successfully");
      onRefresh();
    },
    onError: error => {
      toast.error(`Failed to delete holding: ${error.message}`);
    },
  });

  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    return num.toFixed(8).replace(/\.?0+$/, "");
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "currency":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "crypto":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
      case "stock":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getProfitLossColor = (profitLoss: number) => {
    if (profitLoss > 0) {
      return "text-green-600 dark:text-green-400";
    } else if (profitLoss < 0) {
      return "text-red-600 dark:text-red-400";
    }
    return "text-muted-foreground";
  };

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No holdings yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first asset to get started tracking your portfolio
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Your Holdings</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Display:</span>
          <Select
            value={currencyDisplay}
            onValueChange={value => setCurrencyDisplay(value as "USD" | "CNY")}
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">
                  Current Price ({currencyDisplay})
                </TableHead>
                <TableHead className="text-right">
                  Total Value ({currencyDisplay})
                </TableHead>
                <TableHead className="text-right">
                  Cost Basis ({currencyDisplay})
                </TableHead>
                <TableHead className="text-right">Profit/Loss</TableHead>
                <TableHead className="text-right">24h Change</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map(({ holding, asset }) => {
                // Find corresponding asset data from portfolio summary
                const assetData = portfolioSummary.data?.assets?.find(
                  a => a.id === asset.id
                );

                const quantity = parseFloat(holding.quantity);
                // API returns prices in USD
                const currentPriceUSD = assetData?.priceUSD || 0;
                const totalValueUSD = assetData?.valueUSD || 0;
                const costBasis = holding.costBasis
                  ? parseFloat(holding.costBasis)
                  : null;
                const costBasisTotalUSD = costBasis
                  ? costBasis * quantity
                  : null;
                const profitLossUSD = costBasisTotalUSD
                  ? totalValueUSD - costBasisTotalUSD
                  : null;
                const profitLossPercent = costBasisTotalUSD
                  ? ((totalValueUSD - costBasisTotalUSD) / costBasisTotalUSD) *
                    100
                  : null;
                const change24h = assetData?.change24h || 0;

                // Convert to display currency
                const currentPriceDisplay =
                  currencyDisplay === "USD"
                    ? currentPriceUSD
                    : currentPriceUSD * exchangeRate;
                const totalValueDisplay =
                  currencyDisplay === "USD"
                    ? totalValueUSD
                    : totalValueUSD * exchangeRate;
                const costBasisDisplay = costBasis
                  ? currencyDisplay === "USD"
                    ? costBasis
                    : costBasis * exchangeRate
                  : null;
                const profitLossDisplay = profitLossUSD
                  ? currencyDisplay === "USD"
                    ? profitLossUSD
                    : profitLossUSD * exchangeRate
                  : null;

                const symbol = currencyDisplay === "USD" ? "$" : "¥";

                return (
                  <TableRow key={holding.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => navigate(`/asset/${asset.id}`)}
                        className="text-left hover:opacity-80 transition-opacity"
                      >
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          {asset.symbol}
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {asset.name}
                        </p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeColor(
                          asset.type
                        )}`}
                      >
                        {asset.type.charAt(0).toUpperCase() +
                          asset.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(holding.quantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      {currentPriceDisplay > 0
                        ? `${symbol}${currentPriceDisplay.toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {totalValueDisplay > 0
                        ? `${symbol}${totalValueDisplay.toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {costBasisDisplay
                        ? `${symbol}${costBasisDisplay.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right ${profitLossDisplay !== null ? getProfitLossColor(profitLossDisplay) : ""}`}
                    >
                      {profitLossDisplay !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          {profitLossDisplay >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {`${symbol}${Math.abs(
                              profitLossDisplay
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                            <span className="text-xs ml-1">
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
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/asset/${asset.id}`)}
                          title="查看详情"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement edit functionality
                            toast.info("Edit feature coming soon");
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            deleteHolding.mutate({ holdingId: holding.id });
                          }}
                          disabled={deleteHolding.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
