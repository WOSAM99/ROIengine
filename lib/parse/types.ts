export const CANONICAL_FIELDS = [
  "jobId",
  "clientName",
  "invoiceAmount",
  "jobCost",
  "cashReceived",
  "balanceDue",
  "laborHours",
  "projectType",
  "projectManager",
  "status",
  "arBucket",
  "startDate",
  "finishDate",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export const REQUIRED_FIELDS: readonly CanonicalField[] = ["jobId", "invoiceAmount", "jobCost"];

export type ColumnMapping = Partial<Record<CanonicalField, string>>;

export type ParsedRow = Record<string, unknown>;

export type ParseResult = {
  headers: string[];
  rows: ParsedRow[];
};

export type WarningLevel = "info" | "warn";

export type RowWarning = {
  rowIndex: number; // 1-based index in the data rows (header excluded)
  jobId: string | null;
  field: CanonicalField | null;
  level: WarningLevel;
  message: string;
};

export type NormalizedJob = {
  jobId: string;
  clientName: string | null;
  invoiceAmount: string; // string to preserve Decimal precision
  jobCost: string;
  cashReceived: string;
  balanceDue: string;
  laborHours: string | null;
  projectType: "water" | "mold" | "fire" | "recon" | "cleaning" | "other" | null;
  projectManager: string | null;
  status:
    | "active"
    | "in_progress"
    | "on_hold"
    | "delayed"
    | "waiting"
    | "completed"
    | "cancelled"
    | "unknown"
    | null;
  arBucket: string | null;
  startDate: string | null; // YYYY-MM-DD
  finishDate: string | null; // YYYY-MM-DD
  raw: ParsedRow;
};

export type NormalizeOutcome = {
  jobs: NormalizedJob[];
  warnings: RowWarning[];
  skippedCount: number;
};
