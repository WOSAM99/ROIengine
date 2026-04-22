"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "./file-dropzone";
import { PreviewTable } from "./preview-table";
import { ColumnMapper } from "./column-mapper";
import { validateMapping } from "@/lib/parse/validate";
import { cn } from "@/lib/utils";
import type { ColumnMapping } from "@/lib/parse/types";

const EYEBROW =
  "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent-700";

type Step = "upload" | "preview" | "map" | "confirm";

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "map", label: "Map" },
  { key: "confirm", label: "Confirm" },
];

type PreviewData = {
  filename: string;
  format: "csv" | "xlsx";
  totalRows: number;
  headers: string[];
  preview: Record<string, unknown>[];
  suggestedMapping: ColumnMapping;
  unmappedHeaders: string[];
  defaultMappingName: string | null;
};

export function UploadWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingName, setMappingName] = useState("Default mapping");
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [targetMargin, setTargetMargin] = useState(0.3);
  const [isBusy, setIsBusy] = useState(false);

  const handleFileSelected = useCallback(async (picked: File) => {
    setFile(picked);
    setIsBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", picked);
      const res = await fetch("/api/uploads/preview", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Could not read file");
        setFile(null);
        return;
      }
      setPreview(body);
      setMapping(body.suggestedMapping);
      setMappingName(body.defaultMappingName ?? "Default mapping");
      setStep("preview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsBusy(false);
    }
  }, []);

  async function handleConfirm() {
    if (!file || !preview) return;
    const issues = validateMapping(mapping);
    if (issues.length > 0) {
      toast.error(issues[0].message);
      return;
    }
    setIsBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "meta",
        JSON.stringify({
          mapping,
          targetMargin,
          mappingName,
          saveAsDefault,
        }),
      );
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Upload failed");
        return;
      }
      toast.success(
        `Imported ${body.imported} jobs${body.skipped ? ` (${body.skipped} skipped)` : ""}`,
      );
      router.replace(`/uploads/${body.uploadId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <StepIndicator step={step} />

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload a file</CardTitle>
            <CardDescription>CSV or XLSX, up to 4 MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileDropzone onFile={handleFileSelected} disabled={isBusy} />
            {isBusy && (
              <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Parsing…
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === "preview" && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              <span className="font-mono">{preview.filename}</span> · {preview.totalRows} rows ·
              showing first {preview.preview.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <PreviewTable headers={preview.headers} rows={preview.preview} />
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="size-4" />
                Choose different file
              </Button>
              <Button variant="accent" onClick={() => setStep("map")}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "map" && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Map columns</CardTitle>
            <CardDescription>
              Confirm each canonical field points to the right source column.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ColumnMapper
              headers={preview.headers}
              mapping={mapping}
              preview={preview.preview}
              onChange={setMapping}
            />
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("preview")}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button variant="accent" onClick={() => setStep("confirm")}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Finalize</CardTitle>
            <CardDescription>
              Name this mapping and set the target margin used for profit-leak detection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="mappingName" className={EYEBROW}>
                Mapping name
              </Label>
              <Input
                id="mappingName"
                value={mappingName}
                onChange={(e) => setMappingName(e.target.value)}
                placeholder="Default mapping"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetMargin" className={EYEBROW}>
                Target margin
              </Label>
              <div className="relative">
                <Input
                  id="targetMargin"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={Math.round(targetMargin * 100)}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    if (!Number.isFinite(pct)) return;
                    setTargetMargin(Math.max(0, Math.min(100, pct)) / 100);
                  }}
                  className="pr-8 font-mono"
                />
                <span
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
                >
                  %
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Jobs with a margin below this value are flagged as profit leaks.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="accent-accent border-input size-4 rounded"
              />
              Save as default mapping for this workspace
            </label>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button variant="accent" size="lg" onClick={handleConfirm} disabled={isBusy}>
                {isBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Import {preview.totalRows} rows
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Upload progress">
      {STEPS.map((s, i) => {
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        return (
          <li key={s.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border font-mono text-[11px] font-semibold transition-all duration-150",
                  isActive &&
                    "bg-gradient-primary shadow-primary-glow border-transparent text-white",
                  isDone &&
                    "bg-accent-50 text-accent-700 border-accent-200 ring-accent-200/60 ring-1",
                  !isActive && !isDone && "bg-muted/40 border-border text-muted-foreground",
                )}
              >
                {isDone ? <Check className="size-3.5" /> : String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold tracking-wider uppercase transition-colors duration-150",
                  isActive
                    ? "text-accent-700"
                    : isDone
                      ? "text-accent-600/80"
                      : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px w-6 transition-colors duration-150 sm:w-10",
                  isDone ? "from-accent-500 to-accent-200 bg-gradient-to-r" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
