import { SYNONYMS } from "./synonyms";
import { CANONICAL_FIELDS, type CanonicalField, type ColumnMapping } from "./types";

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[()$#/]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHeaderAgainstAlias(normalizedHeader: string, alias: string): number {
  const normalizedAlias = normalizeHeader(alias);
  if (normalizedHeader === normalizedAlias) return 1;
  if (normalizedHeader.startsWith(normalizedAlias)) return 0.9;
  if (normalizedHeader.includes(normalizedAlias)) return 0.75;
  if (normalizedAlias.includes(normalizedHeader) && normalizedHeader.length >= 3) return 0.6;
  return 0;
}

function bestMatchForHeader(header: string): { field: CanonicalField; score: number } | null {
  const normalized = normalizeHeader(header);
  let best: { field: CanonicalField; score: number } | null = null;

  for (const field of CANONICAL_FIELDS) {
    for (const alias of SYNONYMS[field]) {
      const score = scoreHeaderAgainstAlias(normalized, alias);
      if (score > 0 && (!best || score > best.score)) {
        best = { field, score };
      }
    }
  }
  return best;
}

export type SuggestMappingOptions = {
  headers: string[];
  savedMapping?: ColumnMapping;
  minScore?: number;
};

export function suggestMapping(options: SuggestMappingOptions): ColumnMapping {
  const { headers, savedMapping, minScore = 0.6 } = options;
  const mapping: ColumnMapping = {};

  if (savedMapping) {
    for (const [field, header] of Object.entries(savedMapping)) {
      if (header && headers.includes(header)) {
        mapping[field as CanonicalField] = header;
      }
    }
  }

  // For each header, pick its best canonical field. Highest-scoring header wins per field.
  const candidates = new Map<CanonicalField, { header: string; score: number }>();
  for (const header of headers) {
    if (Object.values(mapping).includes(header)) continue;
    const match = bestMatchForHeader(header);
    if (!match || match.score < minScore) continue;
    if (mapping[match.field]) continue; // already locked in by saved mapping
    const existing = candidates.get(match.field);
    if (!existing || match.score > existing.score) {
      candidates.set(match.field, { header, score: match.score });
    }
  }

  for (const [field, { header }] of candidates) {
    mapping[field] = header;
  }

  return mapping;
}

export function unmappedHeaders(headers: string[], mapping: ColumnMapping): string[] {
  const mapped = new Set(Object.values(mapping).filter(Boolean) as string[]);
  return headers.filter((h) => !mapped.has(h));
}
