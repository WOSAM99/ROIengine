"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUESTIONS, QUESTION_KEYS, type QuestionKey } from "@/lib/chat/questions";

type QuestionPickerProps = {
  active: QuestionKey | null;
  pending: QuestionKey | null;
  onPick: (key: QuestionKey) => void;
  disabled?: boolean;
};

export function QuestionPicker({ active, pending, onPick, disabled }: QuestionPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUESTION_KEYS.map((key) => {
        const q = QUESTIONS[key];
        const isActive = active === key;
        const isPending = pending === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            disabled={disabled || isPending}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition-all duration-150",
              "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isActive
                ? "bg-gradient-primary shadow-primary-glow border-transparent text-white"
                : "bg-card text-foreground shadow-card hover:shadow-card-hover border-black/5 hover:-translate-y-0.5",
              disabled && "pointer-events-none opacity-50",
            )}
            aria-pressed={isActive}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            <span className="break-words">{q.label}</span>
          </button>
        );
      })}
    </div>
  );
}
