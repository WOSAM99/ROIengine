import { cn } from "@/lib/utils";
import { TONE_TILE_CLASS, type ToneKey } from "@/lib/design-tokens";

type KpiTileProps = {
  label: string;
  value: string;
  tone?: ToneKey;
  sublabel?: string;
  className?: string;
};

export function KpiTile({ label, value, tone = "slate", sublabel, className }: KpiTileProps) {
  return (
    <div
      className={cn(
        "space-y-1 rounded-xl p-3 transition-transform duration-200 hover:-translate-y-0.5",
        TONE_TILE_CLASS[tone],
        className,
      )}
    >
      <p className="text-[10px] font-semibold tracking-wider uppercase opacity-80">{label}</p>
      <p className="font-mono text-lg font-bold break-words tabular-nums">{value}</p>
      {sublabel && <p className="text-[11px] opacity-75">{sublabel}</p>}
    </div>
  );
}
