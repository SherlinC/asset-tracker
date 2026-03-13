import type { Holding } from "@/components/holdings-list/types";
import type { Language } from "@/contexts/language-context";

import {
  getTemplateSheetName,
  type AssetTemplateSheetKey,
} from "./excelTemplate";

type ExportSheet = {
  key: AssetTemplateSheetKey | "other";
  rows: Array<{
    symbol: string;
    quantity: number;
    costBasis: number | null;
  }>;
};

const EXPORT_TEXT = {
  zh: {
    instructionsSheet: "说明",
    instructionHeader: ["项目", "说明"],
    instructionRows: [
      ["用途", "这是你当前 holdings 的导出备份，按分类拆分到不同 sheet。"],
      ["导出内容", "每一行对应一条 holding 记录，不会合并同标的的多次买入。"],
      ["字段说明", "包含：标的代码、数量、成本（人民币）。"],
    ],
    columns: ["标的代码", "数量", "成本（人民币）"],
    other: "其他",
  },
  en: {
    instructionsSheet: "Instructions",
    instructionHeader: ["Item", "Details"],
    instructionRows: [
      [
        "Purpose",
        "This workbook exports your current holdings as a categorized backup.",
      ],
      [
        "Export shape",
        "Each row represents one holding record. Repeated buys stay as separate rows.",
      ],
      ["Columns", "Includes symbol, quantity, and cost basis in CNY."],
    ],
    columns: ["Symbol", "Quantity", "Cost Basis (CNY)"],
    other: "Other",
  },
} as const;

function buildExportFileName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const timestamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("") +
    "_" +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(
      ""
    );

  return `坐吃山空_${timestamp}.xlsx`;
}

function getAssetTemplateSheetKey(
  asset: Holding["asset"]
): AssetTemplateSheetKey | "other" {
  const symbol = asset.symbol.toUpperCase();

  if (asset.type === "stock") {
    if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) return "a_stock";
    if (symbol.endsWith(".HK")) return "hk_stock";
    return "us_stock";
  }

  if (asset.type === "fund") {
    if (
      symbol.endsWith(".EUFUND") ||
      /^[A-Z]{2}[A-Z0-9]{10}(\.[A-Z]+)?$/.test(symbol)
    ) {
      return "international_fund";
    }
    return "china_fund";
  }

  if (asset.type === "crypto") return "crypto";
  if (asset.type === "currency") return "currency";

  return "other";
}

const EXPORT_ORDER: Array<AssetTemplateSheetKey | "other"> = [
  "a_stock",
  "hk_stock",
  "us_stock",
  "china_fund",
  "international_fund",
  "crypto",
  "currency",
  "other",
];

export async function downloadCurrentHoldingsWorkbook(
  language: Language,
  holdings: Holding[]
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const text = EXPORT_TEXT[language];

  const instructionsSheet = workbook.addWorksheet(text.instructionsSheet, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  instructionsSheet.columns = [
    { header: text.instructionHeader[0], key: "item", width: 18 },
    { header: text.instructionHeader[1], key: "details", width: 72 },
  ];
  text.instructionRows.forEach(([item, details]) => {
    instructionsSheet.addRow({ item, details });
  });

  const grouped = new Map<
    AssetTemplateSheetKey | "other",
    ExportSheet["rows"]
  >();

  holdings.forEach(item => {
    const key = getAssetTemplateSheetKey(item.asset);
    const rows = grouped.get(key) ?? [];
    rows.push({
      symbol: item.asset.symbol,
      quantity: parseFloat(item.holding.quantity),
      costBasis: item.holding.costBasis
        ? parseFloat(item.holding.costBasis)
        : null,
    });
    grouped.set(key, rows);
  });

  for (const key of EXPORT_ORDER) {
    const rows = grouped.get(key) ?? [];
    if (rows.length === 0) {
      continue;
    }

    const worksheet = workbook.addWorksheet(
      key === "other" ? text.other : getTemplateSheetName(key, language),
      { views: [{ state: "frozen", ySplit: 1 }] }
    );
    worksheet.columns = [
      { header: text.columns[0], key: "symbol", width: 24 },
      { header: text.columns[1], key: "quantity", width: 14 },
      { header: text.columns[2], key: "costBasis", width: 18 },
    ];

    rows.forEach(row => {
      worksheet.addRow({
        symbol: row.symbol,
        quantity: row.quantity,
        costBasis: row.costBasis,
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = buildExportFileName();
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
