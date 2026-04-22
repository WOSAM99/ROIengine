"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ALL_UPLOADS_VALUE = "all";

type UploadSwitcherProps = {
  uploads: Array<{ id: string; filename: string }>;
  activeId: string | null;
};

export function UploadSwitcher({ uploads, activeId }: UploadSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (uploads.length === 0) return null;

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("uploadId", value);
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const value = activeId ?? uploads[0]?.id ?? undefined;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-auto min-w-[200px]" aria-label="Switch upload">
        <SelectValue placeholder="Select upload" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL_UPLOADS_VALUE}>All uploads (aggregate)</SelectItem>
        {uploads.length > 0 && <SelectSeparator />}
        {uploads.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.filename}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
