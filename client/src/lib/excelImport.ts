import {
  ALL_DEFAULT_ASSETS,
  ASSETS_BY_CATEGORY,
} from "@/components/add-holding/catalog";
import type { Language } from "@/contexts/language-context";

import {
  getTemplateColumns,
  getTemplateSheetKeyByName,
  type AssetTemplateSheetKey,
} from "./excelTemplate";
import { loadExcelJs } from "./exceljs";

export type ImportedAssetType = "currency" | "crypto" | "stock" | "fund";

export type ImportedHoldingPreviewRow = {
  sheetKey: AssetTemplateSheetKey;
  sheetName: string;
  rowNumber: number;
  symbol: string;
  quantity: number | null;
  costBasis: number | null;
  errors: string[];
};

export type ImportedHoldingPreviewResult = {
  rows: ImportedHoldingPreviewRow[];
  globalErrors: string[];
};

export function inferImportedAssetType(
  sheetKey: AssetTemplateSheetKey
): ImportedAssetType {
  switch (sheetKey) {
    case "currency":
      return "currency";
    case "crypto":
      return "crypto";
    case "china_fund":
    case "international_fund":
      return "fund";
    case "a_stock":
    case "hk_stock":
    case "us_stock":
      return "stock";
  }
}

function getCellPrimitive(value: unknown): string | number | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "object") {
    const cell = value as Record<string, unknown>;
    if (typeof cell.text === "string") return cell.text;
    if (typeof cell.result === "string" || typeof cell.result === "number") {
      return cell.result;
    }
    if (typeof cell.hyperlink === "string") return cell.hyperlink;
    if (Array.isArray(cell.richText)) {
      return cell.richText
        .map(part => String((part as { text?: string }).text ?? ""))
        .join("");
    }
  }

  return String(value);
}

function toNumber(value: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replaceAll(",", "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeSymbol(
  sheetKey: AssetTemplateSheetKey,
  raw: string | number | null
) {
  if (raw == null) return "";

  if (sheetKey === "china_fund") {
    const digits = String(raw).replace(/\D/g, "");
    return digits ? digits.padStart(6, "0").slice(-6) : "";
  }

  return String(raw).trim().toUpperCase();
}

function validateSymbol(sheetKey: AssetTemplateSheetKey, symbol: string) {
  if (!symbol) {
    return "Missing symbol";
  }

  switch (sheetKey) {
    case "a_stock":
      return /^\d{6}\.(SS|SZ)$/i.test(symbol)
        ? null
        : "A-share symbols must look like 600519.SS or 000001.SZ";
    case "hk_stock":
      return /^\d{4,5}\.HK$/i.test(symbol)
        ? null
        : "HK symbols must look like 0700.HK";
    case "us_stock":
      return /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)
        ? null
        : "US symbols must look like AAPL or VOO";
    case "china_fund":
      return /^\d{6}$/.test(symbol)
        ? null
        : "China fund codes must be 6 digits";
    case "international_fund":
      return /^[A-Z][A-Z0-9.-]{0,31}$/.test(symbol)
        ? null
        : "International fund symbols must be a ticker or *.EUFUND code";
    case "crypto":
      return /^[A-Z0-9]{2,20}$/.test(symbol)
        ? null
        : "Crypto symbols must look like BTC or ETH";
    case "currency": {
      const allowed = new Set(
        ASSETS_BY_CATEGORY.currency.map(asset => asset.symbol.toUpperCase())
      );
      return allowed.has(symbol)
        ? null
        : `Currency must be one of: ${Array.from(allowed).join(", ")}`;
    }
  }
}

function validateRow(
  sheetKey: AssetTemplateSheetKey,
  row: ImportedHoldingPreviewRow
) {
  const errors = [...row.errors];
  const symbolError = validateSymbol(sheetKey, row.symbol);
  if (symbolError) {
    errors.push(symbolError);
  }

  if (row.quantity == null || row.quantity <= 0) {
    errors.push("Quantity must be a positive number");
  }

  if (row.costBasis != null && row.costBasis < 0) {
    errors.push("Cost basis must be zero or a positive number");
  }

  return {
    ...row,
    errors,
  };
}

function rowHasContent(values: Array<string | number | null>) {
  return values.some(value => {
    if (value == null) return false;
    if (typeof value === "number") return true;
    return value.trim().length > 0;
  });
}

export async function parseAssetWorkbook(
  file: File,
  language: Language
): Promise<ImportedHoldingPreviewResult> {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  const globalErrors: string[] = [];

  await workbook.xlsx.load(buffer);

  const expectedHeaders = new Set([
    getTemplateColumns(language).join("|"),
    getTemplateColumns(language === "zh" ? "en" : "zh").join("|"),
  ]);

  const rows: ImportedHoldingPreviewRow[] = [];

  workbook.worksheets.forEach(worksheet => {
    const sheetKey = getTemplateSheetKeyByName(worksheet.name);
    if (!sheetKey) {
      return;
    }

    const headerCells = worksheet.getRow(1).values as Array<
      string | number | null
    >;
    const normalizedHeader = headerCells
      .slice(1, 4)
      .map(value => String(getCellPrimitive(value) ?? "").trim())
      .join("|");

    if (!expectedHeaders.has(normalizedHeader)) {
      globalErrors.push(`Sheet "${worksheet.name}" has unexpected headers.`);
    }

    worksheet.eachRow((worksheetRow, index) => {
      if (index === 1) {
        return;
      }

      const values = [1, 2, 3].map(cellIndex =>
        getCellPrimitive(worksheetRow.getCell(cellIndex).value)
      );

      if (!rowHasContent(values)) {
        return;
      }

      const parsedRow = validateRow(sheetKey, {
        sheetKey,
        sheetName: worksheet.name,
        rowNumber: index,
        symbol: normalizeSymbol(sheetKey, values[0]),
        quantity: toNumber(values[1]),
        costBasis: toNumber(values[2]),
        errors: [],
      });

      rows.push(parsedRow);
    });
  });

  if (rows.length === 0 && globalErrors.length === 0) {
    globalErrors.push("No importable rows found in the workbook.");
  }

  const knownSymbols = new Set(
    ALL_DEFAULT_ASSETS.map(asset => asset.symbol.toUpperCase())
  );
  rows.forEach(row => {
    if (
      row.errors.length === 0 &&
      ["us_stock", "hk_stock", "crypto", "currency"].includes(row.sheetKey) &&
      !knownSymbols.has(row.symbol)
    ) {
      row.errors.push("Symbol is not in the current built-in catalog");
    }
  });

  return { rows, globalErrors };
}
