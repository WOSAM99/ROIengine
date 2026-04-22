import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { ParsedRow, ParseResult } from "./types";

export type FileFormat = "csv" | "xlsx";

export function detectFormat(filename: string, contentType?: string): FileFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) return "xlsx";
  if (contentType?.includes("csv")) return "csv";
  if (contentType?.includes("spreadsheetml")) return "xlsx";
  return null;
}

export async function readFileBuffer(
  buffer: ArrayBuffer,
  format: FileFormat,
): Promise<ParseResult> {
  if (format === "csv") {
    const text = new TextDecoder("utf-8").decode(buffer);
    return readCsvString(text);
  }
  return readXlsxBuffer(buffer);
}

function readCsvString(text: string): ParseResult {
  const cleaned = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<ParsedRow>(cleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const headers = parsed.meta.fields ?? [];
  const rows = (parsed.data ?? []).filter((row) =>
    Object.values(row).some((v) => v !== "" && v !== null && v !== undefined),
  );
  return { headers, rows };
}

async function readXlsxBuffer(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? `column_${colNumber}`).trim();
  });

  const rows: ParsedRow[] = [];
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    const record: ParsedRow = {};
    let hasValue = false;
    for (let colIndex = 1; colIndex <= headers.length; colIndex += 1) {
      const key = headers[colIndex - 1];
      if (!key) continue;
      const cell = row.getCell(colIndex);
      const value = extractCellValue(cell.value);
      record[key] = value;
      if (value !== null && value !== "") hasValue = true;
    }
    if (hasValue) rows.push(record);
  }
  return { headers, rows };
}

function extractCellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    if ("result" in value) return value.result;
    if ("sharedFormula" in value) return null;
  }
  return value as unknown;
}

export function previewFromResult(result: ParseResult, limit = 5): ParseResult {
  return { headers: result.headers, rows: result.rows.slice(0, limit) };
}
