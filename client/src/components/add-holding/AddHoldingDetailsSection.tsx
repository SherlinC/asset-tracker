import { Loader2 } from "lucide-react";

import { PricePreview } from "@/components/add-holding/PricePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AddHoldingDetailsProps } from "./types";

export function AddHoldingDetailsSection({
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
  return (
    <>
      <PricePreview
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
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          step="0.00000001"
          placeholder="Enter quantity"
          value={quantity}
          onChange={event => onQuantityChange(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2 min-w-0">
        <Label htmlFor="costBasis">Cost Basis (Optional)</Label>
        <Input
          id="costBasis"
          type="number"
          step="0.01"
          placeholder="Enter cost basis in CNY"
          value={costBasis}
          onChange={event => onCostBasisChange(event.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </span>
          ) : (
            "Add Holding"
          )}
        </Button>
      </div>
    </>
  );
}
