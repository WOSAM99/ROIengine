"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CANONICAL_FIELDS,
  REQUIRED_FIELDS,
  type CanonicalField,
  type ColumnMapping,
} from "@/lib/parse/types";
import { canonicalLabel } from "@/lib/parse/synonyms";

const UNMAPPED_VALUE = "__unmapped__";

type ColumnMapperProps = {
  headers: string[];
  mapping: ColumnMapping;
  preview: Record<string, unknown>[];
  onChange: (mapping: ColumnMapping) => void;
};

export function ColumnMapper({ headers, mapping, preview, onChange }: ColumnMapperProps) {
  function handleChange(field: CanonicalField, nextHeader: string) {
    const next: ColumnMapping = { ...mapping };
    if (nextHeader === UNMAPPED_VALUE) {
      delete next[field];
    } else {
      next[field] = nextHeader;
    }
    onChange(next);
  }

  const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));
  const unmapped = headers.filter((h) => !mappedHeaders.has(h));

  return (
    <div className="space-y-5">
      <div className="border-border divide-border/60 divide-y rounded-xl border">
        {CANONICAL_FIELDS.map((field) => {
          const isRequired = REQUIRED_FIELDS.includes(field);
          const selected = mapping[field] ?? UNMAPPED_VALUE;
          const selectId = `map-${field}`;
          const samples =
            selected !== UNMAPPED_VALUE
              ? preview
                  .map((row) => row[selected])
                  .filter((value) => value !== null && value !== undefined && value !== "")
                  .slice(0, 3)
                  .map((value) => String(value))
              : [];

          return (
            <div
              key={field}
              className="grid grid-cols-1 items-center gap-3 px-3 py-2.5 sm:grid-cols-[1fr_1fr_1fr]"
            >
              <div className="flex items-center gap-2">
                <Label htmlFor={selectId} className="text-sm font-medium">
                  {canonicalLabel(field)}
                </Label>
                {isRequired && <Badge variant="accent">Required</Badge>}
              </div>
              <Select value={selected} onValueChange={(v) => handleChange(field, v)}>
                <SelectTrigger id={selectId} size="sm" className="w-full">
                  <SelectValue placeholder="Select source column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNMAPPED_VALUE}>— Unmapped —</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-muted-foreground font-numeric text-[11px]">
                {samples.length > 0 ? (
                  <span className="truncate">e.g. {samples.join(" · ")}</span>
                ) : (
                  <span className="italic">no preview</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unmapped.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Unmapped columns · kept in raw row, not surfaced in metrics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unmapped.map((header) => (
              <Badge key={header} variant="outline" className="normal-case">
                {header}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
