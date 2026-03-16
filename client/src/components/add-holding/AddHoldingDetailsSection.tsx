import { Loader2 } from "lucide-react";

import { PricePreview } from "@/components/add-holding/PricePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AddHoldingDetailsProps } from "./types";

export function AddHoldingDetailsSection({
  isZh,
  onImportExcel,
  selectedAssetSymbol,
  priceLoading,
  priceData,
  currencyDisplay,
  onCurrencyDisplayChange,
  currentPrice,
  quantity,
  onQuantityChange,
  costBasis,
  onCostBasisChange,
  totalValue,
  onCancel,
  isSubmitting,
  isSubmitDisabled,
}: AddHoldingDetailsProps) {
  const text = isZh
    ? {
        importExcel: "Excel 批量导入",
        quantity: "数量",
        quantityPlaceholder: "输入数量",
        costBasis: "成本（可选）",
        costBasisPlaceholder: "输入成本（人民币）",
        cancel: "取消",
        adding: "添加中...",
        addHolding: "添加",
      }
    : {
        importExcel: "Excel Bulk Import",
        quantity: "Quantity",
        quantityPlaceholder: "Enter quantity",
        costBasis: "Cost Basis (Optional)",
        costBasisPlaceholder: "Enter cost basis in CNY",
        cancel: "Cancel",
        adding: "Adding...",
        addHolding: "Add",
      };

  return (
    <>
      <PricePreview
        isZh={isZh}
        selectedAssetSymbol={selectedAssetSymbol}
        isLoading={priceLoading}
        priceData={priceData}
        currencyDisplay={currencyDisplay}
        onCurrencyDisplayChange={onCurrencyDisplayChange}
        currentPrice={currentPrice}
        quantity={quantity}
        totalValue={totalValue}
      />

      <div className="space-y-2 min-w-0">
        <Label htmlFor="quantity">{text.quantity}</Label>
        <Input
          id="quantity"
          type="number"
          step="0.00000001"
          placeholder={text.quantityPlaceholder}
          value={quantity}
          onChange={event => onQuantityChange(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2 min-w-0">
        <Label htmlFor="costBasis">{text.costBasis}</Label>
        <Input
          id="costBasis"
          type="number"
          step="0.01"
          placeholder={text.costBasisPlaceholder}
          value={costBasis}
          onChange={event => onCostBasisChange(event.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onImportExcel}
        >
          {text.importExcel}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {text.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitDisabled} variant="default">
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {text.adding}
              </span>
            ) : (
              text.addHolding
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
