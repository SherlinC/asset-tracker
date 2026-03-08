import { RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/_core/hooks/useAuth";
import AddHoldingDialog from "@/components/AddHoldingDialog";
import DashboardLayout from "@/components/DashboardLayout";
import HoldingsList from "@/components/HoldingsList";
import PortfolioSummary from "@/components/PortfolioSummary";
import PortfolioValueChart from "@/components/PortfolioValueChart";
import { Button } from "@/components/ui/button";
import { usePriceUpdates } from "@/hooks/usePriceUpdates";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { loading: authLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const hasRecordedThisSession = useRef(false);

  const utils = trpc.useUtils();
  const portfolioSummary = trpc.portfolio.summary.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
  });
  const holdings = trpc.holdings.list.useQuery();
  const assets = trpc.assets.list.useQuery();

  const recordPortfolio = trpc.portfolioHistory.record.useMutation({
    onSuccess: () => {
      void utils.portfolioHistory.get.invalidate();
    },
  });
  const { mutate: recordPortfolioMutate } = recordPortfolio;
  const { refetch: refetchPortfolioSummary } = portfolioSummary;

  usePriceUpdates(10 * 60 * 1000);

  // Record current portfolio value once when dashboard loads with holdings (so chart has linked data)
  useEffect(() => {
    if (hasRecordedThisSession.current || !holdings.data?.length) return;
    hasRecordedThisSession.current = true;
    recordPortfolioMutate(undefined);
  }, [holdings.data?.length, recordPortfolioMutate]);

  // Mutations
  const refreshPrices = trpc.prices.refresh.useMutation({
    onSuccess: () => {
      toast.success("Prices refreshed successfully");
      refetchPortfolioSummary();
      holdings.refetch();
    },
    onError: error => {
      toast.error(`Failed to refresh prices: ${error.message}`);
    },
  });

  // Refetch portfolio when holdings change
  useEffect(() => {
    refetchPortfolioSummary();
  }, [holdings.data, refetchPortfolioSummary]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPrices.mutateAsync();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Asset Portfolio
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your investments in real-time
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || refreshPrices.isPending}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              Add Asset
            </Button>
          </div>
        </div>

        {/* Portfolio Summary */}
        {portfolioSummary.isLoading ? (
          <div className="bg-card rounded-lg p-8 text-center text-muted-foreground">
            Loading portfolio...
          </div>
        ) : (
          <PortfolioSummary data={portfolioSummary.data} />
        )}

        {/* Portfolio Value Trend Chart */}
        <PortfolioValueChart />

        {/* Holdings List */}
        {holdings.isLoading ? (
          <div className="bg-card rounded-lg p-8 text-center text-muted-foreground">
            Loading holdings...
          </div>
        ) : (
          <HoldingsList
            holdings={holdings.data || []}
            onRefresh={() => {
              holdings.refetch();
              void utils.portfolioHistory.get.invalidate();
            }}
          />
        )}

        {/* Add Holding Dialog */}
        <AddHoldingDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          assets={assets.data || []}
          onSuccess={async () => {
            setShowAddDialog(false);
            await Promise.all([
              holdings.refetch(),
              refetchPortfolioSummary(),
              utils.portfolioHistory.get.invalidate(),
            ]);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
