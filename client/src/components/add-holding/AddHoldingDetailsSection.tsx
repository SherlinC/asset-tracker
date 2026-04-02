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
  selectedCategory,
  priceLoading,
  priceData,
  currencyDisplay,
  onCurrencyDisplayChange,
  currentPrice,
  quantity,
  onQuantityChange,
  costBasis,
  onCostBasisChange,
  annualInterestRate,
  onAnnualInterestRateChange,
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
        annualInterestRate: "定期存款年利率（可选）",
        annualInterestRatePlaceholder: "输入年利率，例如 2.35 表示 2.35%",
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
        annualInterestRate: "Annual Deposit Rate (Optional)",
        annualInterestRatePlaceholder: "Enter annual rate, e.g. 2.35 for 2.35%",
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

      {selectedCategory === "currency" ? (
        <div className="space-y-2 min-w-0">
          <Label htmlFor="annualInterestRate">{text.annualInterestRate}</Label>
          <Input
            id="annualInterestRate"
            type="number"
            step="0.01"
            placeholder={text.annualInterestRatePlaceholder}
            value={annualInterestRate}
            onChange={event => onAnnualInterestRateChange(event.target.value)}
          />
        </div>
      ) : null}

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
        <Button type="button" variant="outline" onClick={onImportExcel}>
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
