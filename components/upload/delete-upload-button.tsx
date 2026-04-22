"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteUploadButtonProps = {
  uploadId: string;
  filename: string;
  /** Appearance: compact icon for list cards, full button for detail page. */
  variant?: "icon" | "button";
  /** Where to navigate after successful delete. Defaults to refreshing the current page. */
  onDeletedRedirectTo?: string;
};

export function DeleteUploadButton({
  uploadId,
  filename,
  variant = "icon",
  onDeletedRedirectTo,
}: DeleteUploadButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/uploads/${uploadId}`, { method: "DELETE" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(body.error ?? "Failed to delete upload");
          return;
        }
        toast.success(`Deleted "${filename}"`);
        setOpen(false);
        if (onDeletedRedirectTo) {
          router.replace(onDeletedRedirectTo);
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete upload");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${filename}`}
            className="text-muted-foreground hover:text-danger-700 hover:bg-danger-50"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm">
            <Trash2 className="size-4" />
            Delete upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this upload?</DialogTitle>
          <DialogDescription className="break-words">
            This permanently deletes <span className="font-mono">{filename}</span> and every job
            imported from it. Any chat history tied to this upload will be detached from the file.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
