import {
  AlertCircle,
  Download,
  EyeOff,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { ALL_DEFAULT_ASSETS } from "@/components/add-holding/catalog";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import {
  inferImportedAssetType,
  parseAssetWorkbook,
  type ImportedHoldingPreviewResult,
  type ImportedHoldingPreviewRow,
} from "@/lib/excelImport";
import {
  downloadAssetTemplate,
  getTemplateSheetName,
} from "@/lib/excelTemplate";
import { ROUTE_PATHS } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

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
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [preview, setPreview] = useState<ImportedHoldingPreviewResult | null>(
    null
  );
  const [ignoredRows, setIgnoredRows] = useState<Set<string>>(new Set());
  const [removedRows, setRemovedRows] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const assetsQuery = trpc.assets.list.useQuery();
  const replaceAllHoldings = trpc.holdings.replaceAll.useMutation();
  const createAsset = trpc.assets.create.useMutation();

  const text = isZh
    ? {
        title: "导入预览",
        description:
          "在这里检查、忽略或删除问题行。确认导入后会覆盖当前持仓，但会保留历史折线图。",
        uploadTitle: "导入数据",
        uploadDesc: "上传 Excel 文件以继续，支持拖放。",
        pickFile: "选择文件并上传",
        reUpload: "重新上传",
        downloadTemplate: "下载模板",
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
        downloadStarted: "模板已开始下载",
        downloadFailed: "模板下载失败，请稍后重试。",
        delete: "删除",
        ignore: "忽略",
        restore: "恢复",
        overwriteHint:
          "确认导入后将覆盖当前持仓；系统会保留历史折线图，并记录一个新的历史快照。",
        dragActive: "释放文件以上传",
      }
    : {
        title: "Import Preview",
        description:
          "Review, ignore, or remove problem rows here. Confirming import will overwrite current holdings while preserving the historical line chart.",
        uploadTitle: "Import Data",
        uploadDesc: "Upload an Excel file to continue. Drag and drop supported.",
        pickFile: "Select File & Upload",
        reUpload: "Re-upload",
        downloadTemplate: "Download Template",
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
        downloadStarted: "Template download started",
        downloadFailed: "Failed to download template. Please try again.",
        delete: "Delete",
        ignore: "Ignore",
        restore: "Restore",
        overwriteHint:
          "Confirming import will overwrite current holdings, keep the historical chart, and record a new snapshot.",
        dragActive: "Drop file to upload",
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

  const processFile = async (file: File) => {
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
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

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);

    try {
      downloadAssetTemplate(language);
      toast.success(text.downloadStarted);
    } catch (error) {
      console.error("Failed to download asset template:", error);
      toast.error(text.downloadFailed);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleReUpload = () => {
    setPreview(null);
    setSelectedFileName(null);
    setIgnoredRows(new Set());
    setRemovedRows(new Set());
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-[calc(100vh-12rem)]">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleFileChange}
        />

        {!preview ? (
          <div className="flex h-full flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-300">
            <div
              className={cn(
                "relative flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200 ease-in-out",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="mb-6 rounded-full bg-muted p-4">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {text.uploadTitle}
              </h1>
              <p className="mb-8 max-w-sm text-muted-foreground">
                {isDragging ? text.dragActive : text.uploadDesc}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => inputRef.current?.click()}
                  disabled={isParsing}
                  className="min-w-[160px]"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isParsing ? text.parsing : text.pickFile}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="min-w-[160px]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {text.downloadTemplate}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 py-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <PageHeader
              title={text.title}
              description={
                selectedFileName
                  ? `${text.selectedFile}: ${selectedFileName}`
                  : undefined
              }
              className="px-1"
            />

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <p className="text-sm font-medium text-muted-foreground">
                  {text.readyRows}
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
                  {readyRows.length}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <p className="text-sm font-medium text-muted-foreground">
                  {text.blockedRows}
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
                  {blockedRows.length}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <p className="text-sm font-medium text-muted-foreground">
                  {text.ignoredRows}
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
                  {ignoredRowsList.length}
                </p>
              </div>
            </div>

            {/* Actions & Hint */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex-1">
                {allIssues.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4" />
                      {text.issues}
                    </p>
                    <div className="mt-2 max-h-32 space-y-1 overflow-auto text-sm text-amber-700/80 dark:text-amber-300/80">
                      {allIssues.map((issue, i) => (
                        <p key={i}>{issue.label}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
                    {text.overwriteHint}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleReUpload}
                  disabled={isImporting}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {text.reUpload}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={readyRows.length === 0 || isImporting}
                  className="bg-primary px-8 text-primary-foreground hover:bg-primary/90"
                >
                  {isImporting ? text.importing : text.importAction}
                </Button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b bg-muted/30 px-6 py-4">
                <h3 className="font-semibold text-foreground">
                  {text.preview}
                </h3>
              </div>
              
              {rowsWithStatus.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {text.noRows}
                </div>
              ) : (
                <div className="max-h-[600px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b shadow-sm">
                        <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground">
                          {text.category}
                        </th>
                        <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground">
                          {text.symbol}
                        </th>
                        <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground">
                          {text.quantity}
                        </th>
                        <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground">
                          {text.costBasis}
                        </th>
                        <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground">
                          {text.status}
                        </th>
                        <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground">
                          {text.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rowsWithStatus.map(row => (
                        <tr
                          key={row.rowKey}
                          className={cn(
                            "transition-colors hover:bg-muted/50",
                            row.status === "ignored" && "opacity-60 bg-muted/20"
                          )}
                        >
                          <td className="px-6 py-3">
                            {getTemplateSheetName(row.sheetKey, language)}
                          </td>
                          <td className="px-6 py-3 font-medium text-foreground">
                            {row.symbol}
                          </td>
                          <td className="px-6 py-3 font-mono">
                            {row.quantity ?? "-"}
                          </td>
                          <td className="px-6 py-3 font-mono">
                            {row.costBasis ?? "-"}
                          </td>
                          <td className="px-6 py-3">
                            {row.status === "ready" ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                {text.importReady}
                              </span>
                            ) : row.status === "ignored" ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {text.ignored}
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                                  {text.blocked}
                                </span>
                                {row.errors.map(error => (
                                  <div
                                    key={error}
                                    className="text-xs text-red-600/80 dark:text-red-400/80"
                                  >
                                    {error}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleToggleIgnore(row.rowKey)}
                                title={
                                  row.status === "ignored"
                                    ? text.restore
                                    : text.ignore
                                }
                              >
                                <EyeOff
                                  className={cn(
                                    "h-4 w-4",
                                    row.status === "ignored" && "text-primary"
                                  )}
                                />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveRow(row.rowKey)}
                                title={text.delete}
                              >
                                <Trash2 className="h-4 w-4" />
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
        )}
      </div>
    </DashboardLayout>
  );
}