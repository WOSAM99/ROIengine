import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FormErrorProps = {
  message?: string | null;
  className?: string;
};

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn("text-danger-700 flex items-start gap-1.5 text-[12px] leading-snug", className)}
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
