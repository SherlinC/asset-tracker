import type {
  AssetCategory,
  AssetOption,
  FundSubCategory,
  StockSubCategory,
} from "./catalog";

export type ExistingAsset = {
  id: number;
  userId: number;
  symbol: string;
  type: string;
  name: string;
  baseCurrency: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AddHoldingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: ExistingAsset[];
  onSuccess: () => void | Promise<void>;
};

export type CurrencyDisplay = "USD" | "CNY";

export type PriceData = {
  priceUSD: number;
  priceCNY: number;
  change24h: number;
};

export type AddHoldingSelectionProps = {
  isZh: boolean;
  selectedCategory: AssetCategory;
  onCategoryChange: (value: string) => void;
  selectedStockSubCategory: StockSubCategory;
  onStockSubCategoryChange: (value: string) => void;
  selectedFundSubCategory: FundSubCategory;
  onFundSubCategoryChange: (value: string) => void;
  assetComboboxOpen: boolean;
  setAssetComboboxOpen: (open: boolean) => void;
  selectedAsset: AssetOption | null;
  selectedAssetSymbol: string;
  assetsInCategory: AssetOption[];
  onAssetChange: (symbol: string) => void;
  fundSearchInput: string;
  internationalFundSearchInput: string;
  stockSearchInput: string;
  onInputChange: (value: string) => void;
  isLoading: boolean;
  internationalFundQuery: string;
  stockQuery: string;
};

export type AddHoldingDetailsProps = {
  selectedAssetSymbol: string;
  priceLoading: boolean;
  priceData: PriceData | undefined;
  currencyDisplay: CurrencyDisplay;
  onCurrencyDisplayChange: (value: CurrencyDisplay) => void;
  currentPrice: number | undefined;
  quantity: string;
  onQuantityChange: (value: string) => void;
  costBasis: string;
  onCostBasisChange: (value: string) => void;
  totalValue: number;
  onCancel: () => void;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
};
