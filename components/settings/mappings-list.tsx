import { Badge } from "@/components/ui/badge";

type MappingSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  fieldCount: number;
  createdAt: Date;
};

export function MappingsList({ mappings }: { mappings: MappingSummary[] }) {
  if (mappings.length === 0) {
    return (
      <div className="border-border/80 bg-muted/30 rounded-2xl border border-dashed p-6 text-sm">
        <p className="text-muted-foreground break-words">
          No saved mappings yet. Upload a file and check &quot;Save as default&quot; during
          confirmation — it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {mappings.map((m) => (
        <li
          key={m.id}
          className="shadow-card hover:shadow-card-hover bg-card space-y-2 rounded-2xl border border-black/5 p-4 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold break-words">{m.name}</p>
            {m.isDefault && <Badge variant="success">Default</Badge>}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[11px] tracking-wider uppercase">
            <span className="font-numeric">{m.fieldCount} fields</span>
            <span aria-hidden>·</span>
            <time dateTime={m.createdAt.toISOString()} className="font-numeric">
              {m.createdAt.toLocaleDateString()}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
