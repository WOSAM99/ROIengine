import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
  /** Heading level. Default h1 for page roots; use h2 inside surfaces/auth card. */
  as?: "h1" | "h2";
  className?: string;
};

/**
 * The unified page/section header.
 * Replaces the prior SectionHeader / inline auth header / lone <h1> patterns.
 * See design-dna.md → Typography for the exact type scale.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  as = "h1",
  className,
}: PageHeaderProps) {
  const Heading = as;
  return (
    <header
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <span className="text-accent-700 text-[11px] font-semibold tracking-wider uppercase">
            {eyebrow}
          </span>
        )}
        <Heading className="text-2xl font-semibold tracking-[-0.02em] break-words sm:text-3xl">
          {title}
        </Heading>
        {description && <p className="text-muted-foreground text-sm break-words">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
