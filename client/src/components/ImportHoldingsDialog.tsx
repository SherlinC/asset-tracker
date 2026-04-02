import { AlertCircle, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ALL_DEFAULT_ASSETS } from "@/components/add-holding/catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { usePortfolioActions } from "@/hooks/usePortfolioActions";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import {
  inferImportedAssetType,
  parseAssetWorkbook,
  type ImportedHoldingPreviewResult,
} from "@/lib/excelImport";
import { getTemplateSheetName } from "@/lib/excelTemplate";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ImportHoldingsDialog({ open, onOpenChange }: Props) {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const portfolioActions = usePortfolioActions();
  const portfolioData = usePortfolioData({
    includeSummary: false,
    includeAssets: open,
    includeHoldings: open,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportedHoldingPreviewResult | null>(
    null
  );
  const text = isZh
    ? {
        title: "导入 Excel 预览",
        description: "仅做本地解析与报错预览，不会写入数据库。",
        pickFile: "选择 Excel 文件",
        helper: "请上传 .xlsx 文件。当前只预览，不保存。",
        selectedFile: "当前文件",
        parsing: "解析中...",
        validRows: "可导入行",
        errorRows: "错误行",
        issues: "问题列表",
        preview: "预览",
        category: "分类",
        symbol: "代码",
        quantity: "数量",
        costBasis: "成本",
        status: "状态",
        valid: "通过",
        invalid: "报错",
        duplicate: "重复，默认跳过",
        importReady: "可导入",
        noRows: "暂无可预览数据。",
        importReadyRows: "待导入行",
        skippedRows: "跳过行",
        importAction: "确认导入",
        importing: "导入中...",
        importSuccess: "Excel 导入完成",
        importFailed: "Excel 导入失败，请稍后重试。",
      }
    : {
        title: "Excel import preview",
        description:
          "This only parses locally and shows validation errors. Nothing is saved yet.",
        pickFile: "Choose Excel file",
        helper: "Upload an .xlsx file. Preview only, no persistence.",
        selectedFile: "Selected file",
        parsing: "Parsing...",
        validRows: "Valid rows",
        errorRows: "Rows with errors",
        issues: "Issues",
        preview: "Preview",
        category: "Category",
        symbol: "Symbol",
        quantity: "Quantity",
        costBasis: "Cost basis",
        status: "Status",
        valid: "Valid",
        invalid: "Error",
        duplicate: "Duplicate, skipped",
        importReady: "Ready",
        noRows: "No preview rows yet.",
        importReadyRows: "Rows to import",
        skippedRows: "Skipped rows",
        importAction: "Confirm import",
        importing: "Importing...",
        importSuccess: "Excel import completed",
        importFailed: "Excel import failed. Please try again.",
      };

  const rows = useMemo(() => preview?.rows ?? [], [preview?.rows]);
  const existingAssets = useMemo(
    () => portfolioData.assets,
    [portfolioData.assets]
  );
  const existingHoldings = useMemo(
    () => portfolioData.holdings,
    [portfolioData.holdings]
  );
  const rowsWithStatus = useMemo(() => {
    const knownAssetsBySymbol = new Map(
      existingAssets.map(asset => [asset.symbol.toUpperCase(), asset])
    );
    const builtInAssetsBySymbol = new Map(
      ALL_DEFAULT_ASSETS.map(asset => [asset.symbol.toUpperCase(), asset])
    );

    return rows.map(row => {
      const existingAsset = knownAssetsBySymbol.get(row.symbol.toUpperCase());
      const builtInAsset = builtInAssetsBySymbol.get(row.symbol.toUpperCase());
      const hasDuplicateHolding = existingHoldings.some(holding => {
        const sameSymbol =
          holding.asset.symbol.toUpperCase() === row.symbol.toUpperCase();
        const sameQuantity =
          row.quantity != null &&
          Math.abs(parseFloat(holding.holding.quantity) - row.quantity) < 1e-8;
        const existingCostBasis = holding.holding.costBasis
          ? parseFloat(holding.holding.costBasis)
          : 0;
        const targetCostBasis = row.costBasis ?? 0;
        const sameCostBasis =
          Math.abs(existingCostBasis - targetCostBasis) < 1e-8;

        return sameSymbol && sameQuantity && sameCostBasis;
      });

      const unresolved =
        !existingAsset &&
        !builtInAsset &&
        ["us_stock", "hk_stock", "crypto", "currency"].includes(row.sheetKey);

      const errors = unresolved
        ? [
            ...row.errors,
            isZh
              ? "系统当前无法识别该代码"
              : "Symbol is not currently recognized by the app",
          ]
        : row.errors;

      const status =
        errors.length > 0
          ? "invalid"
          : hasDuplicateHolding
            ? "duplicate"
            : "ready";

      return {
        ...row,
        errors,
        status,
        existingAsset,
        builtInAsset,
      };
    });
  }, [existingAssets, existingHoldings, isZh, rows]);

  const readyRows = rowsWithStatus.filter(row => row.status === "ready");
  const skippedRows = rowsWithStatus.filter(row => row.status === "duplicate");
  const invalidRows = rowsWithStatus.filter(row => row.status === "invalid");
  const allIssues = useMemo(
    () => [
      ...(preview?.globalErrors.map(issue => ({ label: issue })) ?? []),
      ...rowsWithStatus.flatMap(row =>
        row.errors.map(error => ({
          label: `${row.sheetName} · row ${row.rowNumber}: ${error}`,
        }))
      ),
    ],
    [preview?.globalErrors, rowsWithStatus]
  );

  const handleImport = async () => {
    if (readyRows.length === 0) {
      return;
    }

    setIsImporting(true);

    try {
      const assetCache = new Map(
        existingAssets.map(asset => [asset.symbol.toUpperCase(), asset])
      );

      for (const row of readyRows) {
        let asset = assetCache.get(row.symbol.toUpperCase());

        if (!asset) {
          const fallback = row.builtInAsset;
          asset = await portfolioActions.createAsset(
            {
              symbol: row.symbol,
              type: inferImportedAssetType(row.sheetKey),
              name: fallback?.name ?? row.symbol,
              baseCurrency: fallback?.currency ?? "CNY",
            },
            { deferInvalidate: true }
          );
          assetCache.set(asset.symbol.toUpperCase(), asset);
        }

        await portfolioActions.addHolding(
          {
            assetId: asset.id,
            quantity: String(row.quantity),
            costBasis:
              row.costBasis == null ? undefined : String(row.costBasis),
          },
          { deferInvalidate: true }
        );
      }

      await portfolioActions.finalizeDeferredChanges();

      toast.success(text.importSuccess);
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to import workbook:", error);
      toast.error(text.importFailed);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsParsing(true);

    try {
      const result = await parseAssetWorkbook(file, language);
      setPreview(result);
    } catch (error) {
      setPreview({
        rows: [],
        globalErrors: [
          isZh
            ? "文件解析失败，请确认是 .xlsx 模板。"
            : "Failed to parse file. Please upload a valid .xlsx workbook.",
        ],
      });
      console.error("Failed to parse workbook:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedFileName(null);
      setPreview(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {text.pickFile}
                </p>
                <p className="text-sm text-muted-foreground">{text.helper}</p>
                {selectedFileName ? (
                  <p className="text-xs text-muted-foreground">
                    {text.selectedFile}: {selectedFileName}
                  </p>
                ) : null}
              </div>
              <div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  onClick={() => inputRef.current?.click()}
                  disabled={isParsing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isParsing ? text.parsing : text.pickFile}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                {text.importReadyRows}
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {readyRows.length}
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm text-muted-foreground">{text.errorRows}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {invalidRows.length}
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4 md:col-span-2">
              <p className="text-sm text-muted-foreground">
                {text.skippedRows}
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {skippedRows.length}
              </p>
            </div>
          </div>

          {allIssues.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {text.issues}
              </p>
              <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm text-muted-foreground">
                {allIssues.map(issue => (
                  <p key={issue.label}>{issue.label}</p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={readyRows.length === 0 || isImporting || isParsing}
            >
              {isImporting ? text.importing : text.importAction}
            </Button>
          </div>

          <div className="rounded-xl border bg-background p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              {text.preview}
            </p>
            {rowsWithStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">{text.noRows}</p>
            ) : (
              <div className="max-h-[420px] overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium">
                        {text.category}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {text.symbol}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {text.quantity}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {text.costBasis}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {text.status}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsWithStatus.map(row => (
                      <tr
                        key={`${row.sheetKey}-${row.rowNumber}`}
                        className="border-b align-top"
                      >
                        <td className="px-3 py-2">
                          {getTemplateSheetName(row.sheetKey, language)}
                        </td>
                        <td className="px-3 py-2 font-medium">{row.symbol}</td>
                        <td className="px-3 py-2">{row.quantity ?? "-"}</td>
                        <td className="px-3 py-2">{row.costBasis ?? "-"}</td>
                        <td className="px-3 py-2">
                          {row.status === "ready" ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {text.importReady}
                            </span>
                          ) : row.status === "duplicate" ? (
                            <span className="text-blue-600 dark:text-blue-400">
                              {text.duplicate}
                            </span>
                          ) : (
                            <div className="space-y-1 text-amber-700 dark:text-amber-300">
                              <div>{text.invalid}</div>
                              {row.errors.map(error => (
                                <div
                                  key={error}
                                  className="text-xs text-muted-foreground"
                                >
                                  {error}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
