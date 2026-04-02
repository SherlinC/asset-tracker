import ExcelJSImport from "exceljs";

type ExcelJsCell = {
  value: unknown;
};

type ExcelJsRow = {
  values: unknown[];
  font?: unknown;
  fill?: unknown;
  getCell(index: number): ExcelJsCell;
};

type ExcelJsWorksheet = {
  name: string;
  columns?: unknown;
  getRow(index: number): ExcelJsRow;
  addRow(data: unknown): unknown;
  eachRow(callback: (row: ExcelJsRow, rowNumber: number) => void): void;
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
