import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { EditHoldingState } from "./types";

type Props = {
  editHolding: EditHoldingState | null;
  setEditHolding: React.Dispatch<React.SetStateAction<EditHoldingState | null>>;
  onSubmit: (event: React.FormEvent) => void;
  isPending: boolean;
};

export function HoldingsEditDialog({
  editHolding,
  setEditHolding,
  onSubmit,
  isPending,
}: Props) {
  return (
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
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">数量</Label>
              <Input
                id="edit-quantity"
                type="text"
                inputMode="decimal"
                value={editHolding.quantity}
                onChange={event =>
                  setEditHolding(prev =>
                    prev ? { ...prev, quantity: event.target.value } : null
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
                onChange={event =>
                  setEditHolding(prev =>
                    prev ? { ...prev, costBasis: event.target.value } : null
                  )
                }
                placeholder="留空则不修改"
              />
            </div>
            {editHolding.assetType === "currency" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-annual-rate">定期存款年利率（可选）</Label>
                <Input
                  id="edit-annual-rate"
                  type="text"
                  inputMode="decimal"
                  value={editHolding.annualInterestRate}
                  onChange={event =>
                    setEditHolding(prev =>
                      prev
                        ? {
                            ...prev,
                            annualInterestRate: event.target.value,
                          }
                        : null
                    )
                  }
                  placeholder="例如 2.35 表示 2.35%"
                />
              </div>
            ) : null}
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
                disabled={!editHolding.quantity.trim() || isPending}
              >
                {isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
