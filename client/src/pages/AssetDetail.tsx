import { ArrowLeft, TrendingUp } from "lucide-react";
import { useLocation, useParams } from "wouter";

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTE_PATHS } from "@/lib/navigation";

export default function AssetDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const assetId = params?.id ? parseInt(params.id) : null;

  if (!assetId) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTE_PATHS.dashboard)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </Button>

        {/* Asset Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">¥0.00</div>
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: just now
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  +0.18%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Market moving up
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Holdings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">0.00</div>
              <p className="text-xs text-muted-foreground mt-2">
                Total value: ¥0.00
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Price Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Price History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Chart coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
