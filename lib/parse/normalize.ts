import { Decimal } from "decimal.js";
import { parse as parseDate, isValid } from "date-fns";
import type {
  CanonicalField,
  ColumnMapping,
  NormalizeOutcome,
  NormalizedJob,
  ParseResult,
  ParsedRow,
  RowWarning,
} from "./types";

const CURRENCY_REGEX = /[^0-9.\-]/g;
const DATE_FORMATS = ["M/d/yy", "M/d/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "d-MMM-yy", "d MMM yyyy"];

const PROJECT_TYPE_MAP: Array<[RegExp, NormalizedJob["projectType"]]> = [
  [/water/i, "water"],
  [/mold/i, "mold"],
  [/fire|smoke/i, "fire"],
  [/recon|restor/i, "recon"],
  [/clean/i, "cleaning"],
];

const STATUS_MAP: Array<[RegExp, NormalizedJob["status"]]> = [
  [/cancel/i, "cancelled"],
  [/complete|done|closed/i, "completed"],
  [/waiting/i, "waiting"],
  [/delay/i, "delayed"],
  [/on\s*hold|hold/i, "on_hold"],
  [/in\s*progress|progressing|ongoing/i, "in_progress"],
  [/active|open|new/i, "active"],
];

const AR_BUCKETS = new Set(["current", "0-30", "1-30", "31-60", "61-90", ">90", "90+"]);

export type NormalizeInput = {
  parsed: ParseResult;
  mapping: ColumnMapping;
};

export function normalize({ parsed, mapping }: NormalizeInput): NormalizeOutcome {
  const jobs: NormalizedJob[] = [];
  const warnings: RowWarning[] = [];
  let skippedCount = 0;

  parsed.rows.forEach((row, i) => {
    const rowIndex = i + 1;
    const jobIdValue = readString(row, mapping.jobId);

    if (!jobIdValue) {
      skippedCount += 1;
      warnings.push({
        rowIndex,
        jobId: null,
        field: "jobId",
        level: "warn",
        message: "Row skipped: missing job id",
      });
      return;
    }

    const currencyFields: Array<{
      field: CanonicalField;
      required?: boolean;
      defaultZero?: boolean;
    }> = [
      { field: "invoiceAmount", required: true },
      { field: "jobCost", required: true },
      { field: "cashReceived", defaultZero: true },
      { field: "balanceDue", defaultZero: true },
    ];

    const amounts: Record<string, string> = {};
    let invalidRequired = false;
    for (const { field, required, defaultZero } of currencyFields) {
      const header = mapping[field];
      const raw = header ? row[header] : undefined;
      const parsed = parseCurrency(raw);
      if (parsed === null) {
        if (required) {
          warnings.push({
            rowIndex,
            jobId: jobIdValue,
            field,
            level: "warn",
            message: `Could not parse ${field}: ${formatValueForMessage(raw)}`,
          });
          invalidRequired = true;
        } else if (defaultZero) {
          amounts[field] = "0";
          if (raw !== undefined && raw !== null && raw !== "") {
            warnings.push({
              rowIndex,
              jobId: jobIdValue,
              field,
              level: "info",
              message: `${field} defaulted to 0 (could not parse ${formatValueForMessage(raw)})`,
            });
          }
        }
      } else {
        amounts[field] = parsed.toString();
      }
    }

    if (invalidRequired) {
      skippedCount += 1;
      return;
    }

    const laborHours = parseNumber(row[mapping.laborHours ?? ""]);
    const startDate = parseDateLoose(row[mapping.startDate ?? ""]);
    const finishDate = parseDateLoose(row[mapping.finishDate ?? ""]);
    const arBucket = deriveArBucket(
      readString(row, mapping.arBucket),
      amounts.balanceDue ?? "0",
      finishDate.value,
    );

    if (
      mapping.startDate &&
      row[mapping.startDate] != null &&
      row[mapping.startDate] !== "" &&
      !startDate.value
    ) {
      warnings.push({
        rowIndex,
        jobId: jobIdValue,
        field: "startDate",
        level: "info",
        message: `Could not parse startDate: ${formatValueForMessage(row[mapping.startDate])}`,
      });
    }
    if (
      mapping.finishDate &&
      row[mapping.finishDate] != null &&
      row[mapping.finishDate] !== "" &&
      !finishDate.value
    ) {
      warnings.push({
        rowIndex,
        jobId: jobIdValue,
        field: "finishDate",
        level: "info",
        message: `Could not parse finishDate: ${formatValueForMessage(row[mapping.finishDate])}`,
      });
    }

    const projectTypeRaw = readString(row, mapping.projectType);
    const projectType = mapProjectType(projectTypeRaw);
    if (mapping.projectType && !projectTypeRaw) {
      warnings.push({
        rowIndex,
        jobId: jobIdValue,
        field: "projectType",
        level: "info",
        message: "projectType missing",
      });
    }

    const statusRaw = readString(row, mapping.status);
    const status = mapStatus(statusRaw);
    if (mapping.status && !statusRaw) {
      warnings.push({
        rowIndex,
        jobId: jobIdValue,
        field: "status",
        level: "info",
        message: "status missing",
      });
    }

    jobs.push({
      jobId: jobIdValue,
      clientName: readString(row, mapping.clientName),
      invoiceAmount: amounts.invoiceAmount,
      jobCost: amounts.jobCost,
      cashReceived: amounts.cashReceived ?? "0",
      balanceDue: amounts.balanceDue ?? "0",
      laborHours: laborHours,
      projectType,
      projectManager: readString(row, mapping.projectManager),
      status,
      arBucket,
      startDate: startDate.value,
      finishDate: finishDate.value,
      raw: row,
    });
  });

  return { jobs, warnings, skippedCount };
}

function readString(row: ParsedRow, key?: string): string | null {
  if (!key) return null;
  const value = row[key];
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length === 0 ? null : str;
}

export function parseCurrency(raw: unknown): Decimal | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return new Decimal(raw);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const negative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const stripped = trimmed.replace(CURRENCY_REGEX, "");
  if (stripped === "" || stripped === "-" || stripped === ".") return null;
  try {
    const value = new Decimal(stripped);
    return negative ? value.neg() : value;
  } catch {
    return null;
  }
}

function parseNumber(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const num = Number(trimmed.replace(/,/g, ""));
    if (Number.isFinite(num)) return String(num);
  }
  return null;
}

export function parseDateLoose(raw: unknown): { value: string | null } {
  if (raw === null || raw === undefined || raw === "") return { value: null };

  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial number: days since 1899-12-30
    const ms = Math.round((raw - 25569) * 86_400 * 1000);
    const date = new Date(ms);
    if (!isNaN(date.getTime())) return { value: toISODate(date) };
  }

  const str = typeof raw === "string" ? raw.trim() : String(raw);
  if (!str) return { value: null };

  // ISO first
  const iso = new Date(str);
  if (!isNaN(iso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return { value: toISODate(iso) };
  }

  for (const fmt of DATE_FORMATS) {
    const parsed = parseDate(str, fmt, new Date());
    if (isValid(parsed)) return { value: toISODate(parsed) };
  }
  return { value: null };
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mapProjectType(raw: string | null): NormalizedJob["projectType"] {
  if (!raw) return null;
  for (const [pattern, value] of PROJECT_TYPE_MAP) {
    if (pattern.test(raw)) return value;
  }
  return "other";
}

export function mapStatus(raw: string | null): NormalizedJob["status"] {
  if (!raw) return null;
  for (const [pattern, value] of STATUS_MAP) {
    if (pattern.test(raw)) return value;
  }
  return "unknown";
}

export function deriveArBucket(
  raw: string | null,
  balanceDue: string,
  finishDateIso: string | null,
): string | null {
  if (raw) {
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, "");
    const canonical = normalizeArBucketLabel(normalized);
    if (canonical) return canonical;
  }
  const balance = new Decimal(balanceDue);
  if (balance.lte(0)) return null;
  if (!finishDateIso) return null;
  const now = Date.now();
  const finishMs = Date.parse(`${finishDateIso}T00:00:00Z`);
  if (!Number.isFinite(finishMs)) return null;
  const days = Math.floor((now - finishMs) / 86_400_000);
  if (days < 0) return "Current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return ">90";
}

function normalizeArBucketLabel(value: string): string | null {
  if (value === "current") return "Current";
  if (value === "0-30" || value === "1-30") return "1-30";
  if (value === "31-60") return "31-60";
  if (value === "61-90") return "61-90";
  if (value === ">90" || value === "90+" || value === "90plus") return ">90";
  if (AR_BUCKETS.has(value)) return value;
  return null;
}

function formatValueForMessage(raw: unknown): string {
  if (raw === null || raw === undefined) return "empty";
  const str = String(raw);
  return str.length > 40 ? `${str.slice(0, 37)}...` : str;
}
