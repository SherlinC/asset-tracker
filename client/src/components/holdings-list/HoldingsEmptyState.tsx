import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HoldingsEmptyState({ isZh }: { isZh: boolean }) {
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
