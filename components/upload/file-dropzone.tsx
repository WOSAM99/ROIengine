"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type FileDropzoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function FileDropzone({ onFile, disabled }: FileDropzoneProps) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) onFile(files[0]);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-border hover:border-foreground/30 hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-10 text-center transition-colors duration-150",
        isDragActive && "border-accent bg-accent/5",
        disabled && "pointer-events-none opacity-60",
      )}
      role="button"
      tabIndex={0}
      aria-label="Upload CSV or XLSX file"
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <UploadCloud className="text-accent size-5" />
      ) : (
        <FileSpreadsheet className="text-muted-foreground size-5" />
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {isDragActive ? "Drop the file to upload" : "Drag & drop a CSV or XLSX"}
        </p>
        <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
          or click to browse · max 4 MB
        </p>
      </div>
    </div>
  );
}
