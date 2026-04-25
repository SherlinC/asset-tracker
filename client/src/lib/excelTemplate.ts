import type { Language } from "@/contexts/language-context";

import { loadExcelJs } from "./exceljs";

export type AssetTemplateSheetKey =
  | "a_stock"
  | "hk_stock"
  | "us_stock"
  | "china_fund"
  | "international_fund"
  | "crypto"
  | "currency";

type SheetDefinition = {
  key: AssetTemplateSheetKey;
  zh: string;
  en: string;
  example: [string | number, number];
};

const DARK_GOLD = {
  bg: "FF111111",
  bgSoft: "FF1C1917",
  bgMuted: "FF292524",
  gold: "FFFBBF24",
  goldSoft: "FFFDE68A",
  border: "FFB45309",
  text: "FFF8FAFC",
  textMuted: "FFFDE68A",
  exampleBg: "FFFFFBEB",
};

const TEMPLATE_COLUMNS = {
  zh: ["标的代码", "数量"],
  en: ["Symbol", "Quantity"],
} as const;

const TEMPLATE_SHEETS: SheetDefinition[] = [
  {
    key: "a_stock",
    zh: "A股",
    en: "A-Shares",
    example: ["600519", 10],
  },
  {
    key: "hk_stock",
    zh: "港股",
    en: "HK Stocks",
    example: ["0700", 50],
  },
  {
    key: "us_stock",
    zh: "美股",
    en: "US Stocks",
    example: ["AAPL", 12],
  },
  {
    key: "china_fund",
    zh: "中国基金",
    en: "China Funds",
    example: [161725, 1000],
  },
  {
    key: "international_fund",
    zh: "国际基金",
    en: "International Funds",
    example: ["LU0633140727.EUFUND", 200],
  },
  {
    key: "crypto",
    zh: "虚拟货币",
    en: "Crypto",
    example: ["BTC", 0.25],
  },
  {
    key: "currency",
    zh: "货币现金",
    en: "Cash & Currency",
    example: ["USD", 5000],
  },
];

const TEMPLATE_TEXT = {
  zh: {
    fileName: "资产模板.xlsx",
    instructionsSheet: "说明",
    instructionsTitle: "资产导入模板指南",
    instructionsSubtitle:
      "黑金高亮版说明：按分类 sheet 填写，预览确认后再导入。",
    instructionHeader: ["项目", "说明"],
    instructionRows: [
      ["用途", "按 sheet 分类填写资产，后续可直接用于批量导入。"],
      ["填写规则", "只填代码和数量；首行为表头，不要删除。"],
      ["示例说明", "每个 sheet 默认只提供一行示例数据，可自行增加或删除行。"],
      [
        "代码要求",
        "A股 sheet 可直接填 600519、000001；港股 sheet 可直接填 0700、9988，系统会自动补全市场后缀。",
      ],
      [
        "识别逻辑",
        "A股按代码前缀推断 .SS / .SZ；港股自动识别为 .HK；美股、虚拟货币、货币现金保持原代码即可。",
      ],
      ["隐私提示", "不要在模板里填写账号、密码、私钥、助记词等敏感信息。"],
    ],
  },
  en: {
    fileName: "asset-template.xlsx",
    instructionsSheet: "Instructions",
    instructionsTitle: "Asset Import Template Guide",
    instructionsSubtitle:
      "Dark gold guide: fill by worksheet category, then review before import.",
    instructionHeader: ["Item", "Details"],
    instructionRows: [
      ["Purpose", "Fill assets by worksheet category for future bulk import."],
      [
        "Rules",
        "Only enter symbol and quantity. Keep the header row.",
      ],
      [
        "Sample rows",
        "Each sheet starts with a single example row only. You can add or remove rows as needed.",
      ],
      [
        "Symbol handling",
        "In A-share sheets you can enter codes like 600519 or 000001. In HK sheets you can enter 0700 or 9988. The app will add the market suffix automatically.",
      ],
      [
        "Market inference",
        "A-share suffixes are inferred from the code prefix (.SS / .SZ). HK sheets always normalize to .HK. US stocks, crypto, and cash keep their original symbols.",
      ],
      [
        "Privacy",
        "Do not include passwords, private keys, seed phrases, or account secrets.",
      ],
    ],
  },
} as const;

export function getTemplateSheetName(
  key: AssetTemplateSheetKey,
  language: Language
) {
  const sheet = TEMPLATE_SHEETS.find(item => item.key === key);
  if (!sheet) {
    throw new Error(`Unknown template sheet key: ${key}`);
  }

  return language === "zh" ? sheet.zh : sheet.en;
}

export function getTemplateSheetKeyByName(name: string) {
  const normalized = name.trim().toLowerCase();

  return (
    TEMPLATE_SHEETS.find(
      item =>
        item.zh.toLowerCase() === normalized ||
        item.en.toLowerCase() === normalized
    )?.key ?? null
  );
}

export function getTemplateColumns(language: Language) {
  return [...TEMPLATE_COLUMNS[language]];
}

function applyTitleCellStyle(cell: {
  font?: unknown;
  fill?: unknown;
  alignment?: unknown;
  border?: unknown;
}) {
  cell.font = {
    bold: true,
    size: 16,
    color: { argb: DARK_GOLD.gold },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: DARK_GOLD.bg },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };
  cell.border = {
    bottom: {
      style: "medium",
      color: { argb: DARK_GOLD.border },
    },
  };
}

function applySubtitleCellStyle(cell: {
  font?: unknown;
  fill?: unknown;
  alignment?: unknown;
  border?: unknown;
}) {
  cell.font = {
    size: 11,
    color: { argb: DARK_GOLD.textMuted },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: DARK_GOLD.bgSoft },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
  };
  cell.border = {
    bottom: {
      style: "thin",
      color: { argb: DARK_GOLD.border },
    },
  };
}

function applyInstructionHeaderStyle(cell: {
  font?: unknown;
  fill?: unknown;
  alignment?: unknown;
  border?: unknown;
}) {
  cell.font = {
    bold: true,
    color: { argb: DARK_GOLD.text },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: DARK_GOLD.bgMuted },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  cell.border = {
    top: {
      style: "thin",
      color: { argb: DARK_GOLD.border },
    },
    bottom: {
      style: "thin",
      color: { argb: DARK_GOLD.border },
    },
  };
}

function applyInstructionBodyStyle(itemCell: {
  font?: unknown;
  fill?: unknown;
  alignment?: unknown;
  border?: unknown;
}, detailsCell: {
  font?: unknown;
  fill?: unknown;
  alignment?: unknown;
  border?: unknown;
}) {
  itemCell.font = {
    bold: true,
    color: { argb: DARK_GOLD.goldSoft },
  };
  itemCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: DARK_GOLD.bgSoft },
  };
  itemCell.alignment = {
    vertical: "top",
    horizontal: "left",
  };
  itemCell.border = {
    bottom: {
      style: "thin",
      color: { argb: DARK_GOLD.border },
    },
  };

  detailsCell.font = {
    color: { argb: DARK_GOLD.text },
  };
  detailsCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: DARK_GOLD.bgMuted },
  };
  detailsCell.alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };
  detailsCell.border = {
    bottom: {
      style: "thin",
      color: { argb: DARK_GOLD.border },
    },
  };
}

function applySheetHeaderStyle(cell: {
  font?: unknown;
  fill?: unknown;
  alignment?: unknown;
  border?: unknown;
}) {
  cell.font = {
    bold: true,
    color: { argb: DARK_GOLD.text },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: DARK_GOLD.bg },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  cell.border = {
    bottom: {
      style: "thin",
      color: { argb: DARK_GOLD.border },
    },
  };
}

function applyExampleRowStyle(cell: {
  font?: unknown;
  fill?: unknown;
  border?: unknown;
}) {
  cell.font = {
    color: { argb: DARK_GOLD.bg },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: DARK_GOLD.exampleBg },
  };
  cell.border = {
    bottom: {
      style: "thin",
      color: { argb: "FFFCD34D" },
    },
  };
}

export async function downloadAssetTemplate(language: Language) {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  const text = TEMPLATE_TEXT[language];
  const columns = TEMPLATE_COLUMNS[language];

  const instructionsSheet = workbook.addWorksheet(text.instructionsSheet, {
    views: [{ state: "frozen", ySplit: 3 }],
  });
  instructionsSheet.columns = [
    { header: text.instructionHeader[0], key: "item", width: 18 },
    { header: text.instructionHeader[1], key: "details", width: 72 },
  ];
  instructionsSheet.mergeCells("A1:B1");
  instructionsSheet.getCell("A1").value = text.instructionsTitle;
  instructionsSheet.mergeCells("A2:B2");
  instructionsSheet.getCell("A2").value = text.instructionsSubtitle;
  instructionsSheet.addRow({
    item: text.instructionHeader[0],
    details: text.instructionHeader[1],
  });
  text.instructionRows.forEach(([item, details]) => {
    instructionsSheet.addRow({ item, details });
  });

  instructionsSheet.getRow(1).height = 28;
  instructionsSheet.getRow(2).height = 24;
  instructionsSheet.getRow(3).height = 22;
  applyTitleCellStyle(instructionsSheet.getCell("A1"));
  applySubtitleCellStyle(instructionsSheet.getCell("A2"));
  applyInstructionHeaderStyle(instructionsSheet.getCell("A3"));
  applyInstructionHeaderStyle(instructionsSheet.getCell("B3"));
  instructionsSheet.autoFilter = "A3:B3";

  for (let rowNumber = 4; rowNumber <= instructionsSheet.rowCount; rowNumber += 1) {
    const row = instructionsSheet.getRow(rowNumber);
    row.height = 34;
    applyInstructionBodyStyle(row.getCell(1), row.getCell(2));
  }

  for (const sheet of TEMPLATE_SHEETS) {
    const worksheet = workbook.addWorksheet(
      language === "zh" ? sheet.zh : sheet.en,
      {
        views: [{ state: "frozen", ySplit: 1 }],
      }
    );

    worksheet.columns = [
      { header: columns[0], key: "symbol", width: 24 },
      { header: columns[1], key: "quantity", width: 14 },
    ];

    worksheet.addRow({
      symbol: sheet.example[0],
      quantity: sheet.example[1],
    });

    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      applySheetHeaderStyle(cell);
    });

    const exampleRow = worksheet.getRow(2);
    exampleRow.height = 22;
    exampleRow.eachCell(cell => {
      applyExampleRowStyle(cell);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = text.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
