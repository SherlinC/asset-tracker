import { Trash2, Edit2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

interface HoldingWithPrice {
  holdingId: number;
  assetId: number;
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
  value: number;
  change24h: number;
}

interface Props {
  holdings: HoldingWithPrice[];
  onRefresh: () => void;
}

export default function HoldingsListEnhanced({ holdings, onRefresh }: Props) {
  const deleteHolding = trpc.holdings.delete.useMutation({
    onSuccess: () => {
      toast.success("Holding deleted successfully");
      onRefresh();
    },
    onError: (error) => {
      toast.error(`Failed to delete holding: ${error.message}`);
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value < 1) {
      return value.toFixed(8).replace(/\.?0+$/, "");
    }
    return value.toFixed(2);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
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

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 dark:text-green-400";
    if (change < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
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
      <CardHeader>
        <CardTitle>Your Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">24h Change</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((holding) => (
                <TableRow key={holding.holdingId}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">
                        {holding.symbol}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {holding.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeColor(
                        holding.type
                      )}`}
                    >
                      {holding.type.charAt(0).toUpperCase() + holding.type.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(holding.quantity)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(holding.price)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(holding.value)}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${getChangeColor(holding.change24h)}`}>
                    <div className="flex items-center justify-end gap-1">
                      {holding.change24h > 0 && <TrendingUp className="w-4 h-4" />}
                      {holding.change24h < 0 && <TrendingDown className="w-4 h-4" />}
                      {formatPercent(holding.change24h)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast.info("Edit feature coming soon");
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteHolding.mutate({ holdingId: holding.holdingId });
                        }}
                        disabled={deleteHolding.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
