import type { Language } from "@/contexts/language-context";

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
  example: [string | number, number, number];
};

const TEMPLATE_COLUMNS = {
  zh: ["标的代码", "数量", "成本（人民币）"],
  en: ["Symbol", "Quantity", "Cost Basis (CNY)"],
} as const;

const TEMPLATE_SHEETS: SheetDefinition[] = [
  {
    key: "a_stock",
    zh: "A股",
    en: "A-Shares",
    example: ["600519.SS", 10, 16000],
  },
  {
    key: "hk_stock",
    zh: "港股",
    en: "HK Stocks",
    example: ["0700.HK", 50, 16500],
  },
  {
    key: "us_stock",
    zh: "美股",
    en: "US Stocks",
    example: ["AAPL", 12, 13200],
  },
  {
    key: "china_fund",
    zh: "中国基金",
    en: "China Funds",
    example: [161725, 1000, 2800],
  },
  {
    key: "international_fund",
    zh: "国际基金",
    en: "International Funds",
    example: ["LU0633140727.EUFUND", 200, 5400],
  },
  {
    key: "crypto",
    zh: "虚拟货币",
    en: "Crypto",
    example: ["BTC", 0.25, 98000],
  },
  {
    key: "currency",
    zh: "货币现金",
    en: "Cash & Currency",
    example: ["USD", 5000, 34500],
  },
];

const TEMPLATE_TEXT = {
  zh: {
    fileName: "资产模板.xlsx",
    instructionsSheet: "说明",
    instructionHeader: ["项目", "说明"],
    instructionRows: [
      ["用途", "按 sheet 分类填写资产，后续可直接用于批量导入。"],
      ["填写规则", "只填代码、数量、成本（人民币）；首行为表头，不要删除。"],
      ["代码要求", "系统会自动识别标的代码；识别失败时，预览页会报错。"],
      ["隐私提示", "不要在模板里填写账号、密码、私钥、助记词等敏感信息。"],
    ],
  },
  en: {
    fileName: "asset-template.xlsx",
    instructionsSheet: "Instructions",
    instructionHeader: ["Item", "Details"],
    instructionRows: [
      ["Purpose", "Fill assets by worksheet category for future bulk import."],
      [
        "Rules",
        "Only enter symbol, quantity, and cost basis in CNY. Keep the header row.",
      ],
      [
        "Symbol handling",
        "The app will auto-detect symbols. Unknown symbols will fail in preview.",
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

export async function downloadAssetTemplate(language: Language) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const text = TEMPLATE_TEXT[language];
  const columns = TEMPLATE_COLUMNS[language];

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
      { header: columns[2], key: "costBasis", width: 18 },
    ];

    worksheet.addRow({
      symbol: sheet.example[0],
      quantity: sheet.example[1],
      costBasis: sheet.example[2],
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };

    const exampleRow = worksheet.getRow(2);
    exampleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
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
