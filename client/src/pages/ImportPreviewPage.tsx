import { AlertCircle, ArrowLeft, EyeOff, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import DashboardLayout from "@/components/DashboardLayout";
import { ALL_DEFAULT_ASSETS } from "@/components/add-holding/catalog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import {
  inferImportedAssetType,
  parseAssetWorkbook,
  type ImportedHoldingPreviewResult,
  type ImportedHoldingPreviewRow,
} from "@/lib/excelImport";
import { getTemplateSheetName } from "@/lib/excelTemplate";
import { ROUTE_PATHS } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

type PreviewStatus = "ready" | "invalid" | "ignored";

type PreviewRowViewModel = ImportedHoldingPreviewRow & {
  rowKey: string;
  errors: string[];
  status: PreviewStatus;
  builtInAsset?: (typeof ALL_DEFAULT_ASSETS)[number];
};

function getRowKey(row: ImportedHoldingPreviewRow) {
  return `${row.sheetKey}-${row.rowNumber}-${row.symbol}`;
}

function getDuplicateSignature(row: ImportedHoldingPreviewRow) {
  return JSON.stringify([
    row.sheetKey,
    row.symbol.toUpperCase(),
    row.quantity,
    row.costBasis,
  ]);
}

export default function ImportPreviewPage() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const isZh = language === "zh";
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportedHoldingPreviewResult | null>(
    null
  );
  const [ignoredRows, setIgnoredRows] = useState<Set<string>>(new Set());
  const [removedRows, setRemovedRows] = useState<Set<string>>(new Set());

  const assetsQuery = trpc.assets.list.useQuery();
  const replaceAllHoldings = trpc.holdings.replaceAll.useMutation();
  const createAsset = trpc.assets.create.useMutation();

  const text = isZh
    ? {
        title: "导入预览",
        description:
          "在这里检查、忽略或删除问题行。确认导入后会覆盖当前持仓，但会保留历史折线图。",
        back: "返回资产组合",
        pickFile: "选择 Excel 文件",
        helper: "请上传 .xlsx 文件。当前页面只在确认导入后才会写入数据。",
        selectedFile: "当前文件",
        parsing: "解析中...",
        readyRows: "待导入行",
        blockedRows: "阻断行",
        ignoredRows: "已忽略行",
        issues: "问题列表",
        duplicateInFile: "上传文件中存在完全重复的行，请删除或忽略其中一条",
        preview: "预览",
        category: "分类",
        symbol: "代码",
        quantity: "数量",
        costBasis: "成本",
        status: "状态",
        actions: "操作",
        importReady: "可导入",
        blocked: "阻断",
        ignored: "已忽略",
        noRows: "暂无可预览数据。",
        importAction: "确认覆盖导入",
        importing: "导入中...",
        importSuccess: "导入完成，当前持仓已覆盖，历史记录已保留。",
        importFailed: "导入失败，请稍后重试。",
        parseFailed: "文件解析失败，请确认是有效的 .xlsx 文件。",
        delete: "删除",
        ignore: "忽略",
        restore: "恢复",
        overwriteHint:
          "确认导入后将覆盖当前持仓；系统会保留历史折线图，并记录一个新的历史快照。",
      }
    : {
        title: "Import Preview",
        description:
          "Review, ignore, or remove problem rows here. Confirming import will overwrite current holdings while preserving the historical line chart.",
        back: "Back to Portfolio",
        pickFile: "Choose Excel File",
        helper:
          "Upload an .xlsx file. Nothing is persisted until you confirm the import.",
        selectedFile: "Selected file",
        parsing: "Parsing...",
        readyRows: "Rows to import",
        blockedRows: "Blocked rows",
        ignoredRows: "Ignored rows",
        issues: "Issues",
        duplicateInFile:
          "This upload contains fully duplicated rows. Delete or ignore one of them before importing.",
        preview: "Preview",
        category: "Category",
        symbol: "Symbol",
        quantity: "Quantity",
        costBasis: "Cost basis",
        status: "Status",
        actions: "Actions",
        importReady: "Ready",
        blocked: "Blocked",
        ignored: "Ignored",
        noRows: "No preview rows yet.",
        importAction: "Confirm overwrite import",
        importing: "Importing...",
        importSuccess:
          "Import completed. Current holdings were replaced and history was preserved.",
        importFailed: "Import failed. Please try again.",
        parseFailed:
          "Failed to parse the file. Please upload a valid .xlsx workbook.",
        delete: "Delete",
        ignore: "Ignore",
        restore: "Restore",
        overwriteHint:
          "Confirming import will overwrite current holdings, keep the historical chart, and record a new snapshot.",
      };

  const rawRows = useMemo(() => preview?.rows ?? [], [preview?.rows]);
  const existingAssets = useMemo(
    () => assetsQuery.data ?? [],
    [assetsQuery.data]
  );

  const rowsWithStatus = useMemo<PreviewRowViewModel[]>(() => {
    const knownAssetsBySymbol = new Map(
      existingAssets.map(asset => [asset.symbol.toUpperCase(), asset])
    );
    const builtInAssetsBySymbol = new Map(
      ALL_DEFAULT_ASSETS.map(asset => [asset.symbol.toUpperCase(), asset])
    );

    const activeRows = rawRows.filter(row => !removedRows.has(getRowKey(row)));
    const duplicateCounts = new Map<string, number>();

    activeRows.forEach(row => {
      const rowKey = getRowKey(row);
      if (ignoredRows.has(rowKey)) {
        return;
      }

      const signature = getDuplicateSignature(row);
      duplicateCounts.set(signature, (duplicateCounts.get(signature) ?? 0) + 1);
    });

    return activeRows.map(row => {
      const rowKey = getRowKey(row);
      const builtInAsset = builtInAssetsBySymbol.get(row.symbol.toUpperCase());
      const existingAsset = knownAssetsBySymbol.get(row.symbol.toUpperCase());
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
        : [...row.errors];

      const hasDuplicateInFile =
        duplicateCounts.get(getDuplicateSignature(row)) != null &&
        duplicateCounts.get(getDuplicateSignature(row))! > 1;

      if (hasDuplicateInFile) {
        errors.push(text.duplicateInFile);
      }

      const status = ignoredRows.has(rowKey)
        ? "ignored"
        : errors.length > 0
          ? "invalid"
          : "ready";

      return {
        ...row,
        rowKey,
        errors,
        status,
        builtInAsset,
      };
    });
  }, [
    existingAssets,
    ignoredRows,
    rawRows,
    removedRows,
    text.duplicateInFile,
    isZh,
  ]);

  const readyRows = rowsWithStatus.filter(row => row.status === "ready");
  const blockedRows = rowsWithStatus.filter(row => row.status === "invalid");
  const ignoredRowsList = rowsWithStatus.filter(
    row => row.status === "ignored"
  );

  const allIssues = useMemo(
    () => [
      ...(preview?.globalErrors.map(issue => ({ label: issue })) ?? []),
      ...blockedRows.flatMap(row =>
        row.errors.map(error => ({
          label: `${row.sheetName} · row ${row.rowNumber}: ${error}`,
        }))
      ),
    ],
    [blockedRows, preview?.globalErrors]
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsParsing(true);
    setIgnoredRows(new Set());
    setRemovedRows(new Set());

    try {
      const result = await parseAssetWorkbook(file, language);
      setPreview(result);
    } catch (error) {
      setPreview({ rows: [], globalErrors: [text.parseFailed] });
      console.error("Failed to parse workbook:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleIgnore = (rowKey: string) => {
    setIgnoredRows(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const handleRemoveRow = (rowKey: string) => {
    setRemovedRows(prev => new Set(prev).add(rowKey));
    setIgnoredRows(prev => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
  };

  const handleImport = async () => {
    if (readyRows.length === 0) {
      return;
    }

    setIsImporting(true);

    try {
      const assetCache = new Map(
        existingAssets.map(asset => [asset.symbol.toUpperCase(), asset])
      );
      const nextHoldings: Array<{
        assetId: number;
        quantity: string;
        costBasis?: string;
      }> = [];

      for (const row of readyRows) {
        let asset = assetCache.get(row.symbol.toUpperCase());

        if (!asset) {
          asset = await createAsset.mutateAsync({
            symbol: row.symbol,
            type: inferImportedAssetType(row.sheetKey),
            name: row.builtInAsset?.name ?? row.symbol,
            baseCurrency: row.builtInAsset?.currency ?? "CNY",
          });
          assetCache.set(asset.symbol.toUpperCase(), asset);
        }

        nextHoldings.push({
          assetId: asset.id,
          quantity: String(row.quantity),
          costBasis: row.costBasis == null ? undefined : String(row.costBasis),
        });
      }

      await replaceAllHoldings.mutateAsync({ holdings: nextHoldings });

      await Promise.all([
        utils.assets.list.invalidate(),
        utils.holdings.list.invalidate(),
        utils.portfolio.summary.invalidate(),
        utils.portfolioHistory.get.invalidate(),
        utils.portfolioHistory.getByRange.invalidate(),
      ]);

      toast.success(text.importSuccess);
      setLocation(ROUTE_PATHS.dashboard);
    } catch (error) {
      console.error("Failed to import workbook:", error);
      toast.error(text.importFailed);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 w-fit"
                onClick={() => setLocation(ROUTE_PATHS.dashboard)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {text.back}
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {text.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {text.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={() => inputRef.current?.click()}
                disabled={isParsing || isImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isParsing ? text.parsing : text.pickFile}
              </Button>
              <p className="max-w-md text-sm text-muted-foreground md:text-right">
                {text.helper}
              </p>
              {selectedFileName ? (
                <p className="text-xs text-muted-foreground">
                  {text.selectedFile}: {selectedFileName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
            {text.overwriteHint}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">{text.readyRows}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {readyRows.length}
            </p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">{text.blockedRows}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {blockedRows.length}
            </p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">{text.ignoredRows}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {ignoredRowsList.length}
            </p>
          </div>
        </div>

        {allIssues.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              {text.issues}
            </p>
            <div className="mt-3 max-h-48 space-y-2 overflow-auto text-sm text-muted-foreground">
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
            <div className="max-h-[560px] overflow-auto rounded-lg border">
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
                    <th className="px-3 py-2 text-left font-medium">
                      {text.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowsWithStatus.map(row => (
                    <tr key={row.rowKey} className="border-b align-top">
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
                        ) : row.status === "ignored" ? (
                          <span className="text-slate-500 dark:text-slate-400">
                            {text.ignored}
                          </span>
                        ) : (
                          <div className="space-y-1 text-amber-700 dark:text-amber-300">
                            <div>{text.blocked}</div>
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
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleIgnore(row.rowKey)}
                          >
                            <EyeOff className="mr-2 h-4 w-4" />
                            {row.status === "ignored"
                              ? text.restore
                              : text.ignore}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(row.rowKey)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {text.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
