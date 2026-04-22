import {
  REQUIRED_FIELDS,
  type CanonicalField,
  type ColumnMapping,
  type ParseResult,
} from "./types";

export type FileValidationIssue = { code: string; message: string };
export type MappingValidationIssue = { field: CanonicalField; message: string };

export function validateFile(parsed: ParseResult): FileValidationIssue[] {
  const issues: FileValidationIssue[] = [];
  if (parsed.headers.length === 0) {
    issues.push({
      code: "no_headers",
      message: "No headers found. File appears empty or unreadable.",
    });
  }
  if (parsed.rows.length === 0) {
    issues.push({ code: "no_rows", message: "No data rows found." });
  }
  return issues;
}

export function validateMapping(mapping: ColumnMapping): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!mapping[field]) {
      issues.push({ field, message: `Required field "${field}" is not mapped.` });
    }
  }
  return issues;
}
