import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

type AuthFormShellProps = {
  title: string;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AuthFormShell({
  title,
  subtitle,
  footer,
  children,
  className,
}: AuthFormShellProps) {
  return (
    <div
      className={cn(
        "shadow-card-elevated bg-card w-full max-w-sm space-y-8 rounded-2xl border border-black/5 p-6 sm:p-8",
        className,
      )}
    >
      <PageHeader as="h2" title={title} description={subtitle} />
      <div className="space-y-5">{children}</div>
      {footer && <div className="text-muted-foreground text-sm">{footer}</div>}
    </div>
  );
}
