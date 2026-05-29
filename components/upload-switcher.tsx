"use client";

import { useState, useTransition } from "react";
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
  const [, startTransition] = useTransition();

  const resolvedActive = activeId ?? uploads[0]?.id ?? undefined;

  // Optimistic selection: the trigger value is otherwise driven solely by the
  // server-rendered `activeId`, which only arrives after the route re-renders.
  // Switching to "ALL" triggers a full aggregate recompute, so without an
  // optimistic value the trigger looks unselected for the whole round-trip.
  // We reflect the click immediately (onChange), then reconcile when the
  // server-confirmed selection changes — via the "adjust state during render"
  // pattern (no effect → no cascading renders), which also covers back/forward
  // and other external navigation.
  const [value, setValue] = useState(resolvedActive);
  const [lastConfirmed, setLastConfirmed] = useState(resolvedActive);
  if (resolvedActive !== lastConfirmed) {
    setLastConfirmed(resolvedActive);
    setValue(resolvedActive);
  }

  if (uploads.length === 0) return null;

  function onChange(next: string) {
    setValue(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("uploadId", next);
    // Soft navigation re-renders this dynamic route with the new searchParams;
    // a separate router.refresh() would race the replace, so it's omitted.
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  // Resolve the trigger label explicitly. Radix <SelectValue> with no children
  // portals the label from the *mounted* SelectItem — but the items only mount
  // when the dropdown is open, so a controlled value (e.g. ?uploadId=all) renders
  // a blank trigger on initial load. Passing children renders the label directly.
  const selectedLabel =
    value === ALL_UPLOADS_VALUE ? "ALL" : uploads.find((u) => u.id === value)?.filename;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-auto min-w-[200px]" aria-label="Switch upload">
        <SelectValue placeholder="Select upload">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL_UPLOADS_VALUE}>ALL</SelectItem>
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
