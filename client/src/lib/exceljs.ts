import ExcelJSImport from "exceljs";

type ExcelJsCell = {
  value: unknown;
  font?: unknown;
  fill?: unknown;
  alignment?: unknown;
  border?: unknown;
};

type ExcelJsRow = {
  values: unknown[];
  height?: number;
  font?: unknown;
  fill?: unknown;
  getCell(index: number): ExcelJsCell;
  eachCell(callback: (cell: ExcelJsCell, colNumber: number) => void): void;
};

type ExcelJsWorksheet = {
  name: string;
  rowCount: number;
  columns?: unknown;
  autoFilter?: string;
  getRow(index: number): ExcelJsRow;
  getCell(address: string): ExcelJsCell;
  addRow(data: unknown): unknown;
  eachRow(callback: (row: ExcelJsRow, rowNumber: number) => void): void;
  mergeCells(range: string): void;
};

type ExcelJsModule = {
  Workbook: new () => {
    xlsx: {
      load(data: ArrayBuffer): Promise<unknown>;
      writeBuffer(): Promise<ArrayBuffer>;
    };
    addWorksheet(name: string, options?: unknown): ExcelJsWorksheet;
    worksheets: ExcelJsWorksheet[];
  };
};

export async function loadExcelJs(): Promise<ExcelJsModule> {
  if (
    typeof (ExcelJSImport as { Workbook?: unknown }).Workbook === "function"
  ) {
    return ExcelJSImport as unknown as ExcelJsModule;
  }

  throw new Error("ExcelJS failed to load correctly");
}
