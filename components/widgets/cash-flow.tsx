import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArBucketRow, CashFlow } from "@/lib/metrics/types";
import { formatMoney, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AR_BUCKET_GRADIENT, AR_BUCKET_HINT, type ArBucketKey } from "@/lib/design-tokens";
import { KpiTile } from "./kpi-tile";

type CashFlowWidgetProps = {
  data: CashFlow;
};

const BUCKET_ORDER: ArBucketKey[] = ["Current", "1-30", "31-60", "61-90", ">90"];

export function CashFlowWidget({ data }: CashFlowWidgetProps) {
  const ordered: ArBucketRow[] = BUCKET_ORDER.map((b) =>
    data.buckets.find((x) => x.bucket === b),
  ).filter((b): b is ArBucketRow => Boolean(b));

  const maxAmount = ordered.reduce((acc, b) => Math.max(acc, Number(b.amount)), 0);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Cash Flow / A/R</CardTitle>
            <CardDescription className="break-words">
              <span className="font-numeric">{formatMoney(data.cashCollected)}</span> collected of{" "}
              <span className="font-numeric">{formatMoney(data.totalBilled)}</span> billed
            </CardDescription>
          </div>
          <EfficiencyRing pct={data.collectionEfficiencyPct} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Collected" value={formatMoney(data.cashCollected)} tone="success" />
          <KpiTile label="Outstanding" value={formatMoney(data.outstanding)} tone="slate" />
          <KpiTile label="Gap" value={formatMoney(data.collectionGap)} tone="warning" />
          <KpiTile
            label="Efficiency"
            value={formatPct(data.collectionEfficiencyPct)}
            tone="accent"
          />
        </div>

        {ordered.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No outstanding balances.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                A/R by age
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                  data.arRiskPct > 40
                    ? "bg-danger-50 text-danger-700"
                    : data.arRiskPct > 20
                      ? "bg-accent-50 text-accent-700"
                      : "bg-success-50 text-success-700",
                )}
              >
                Risk {formatPct(data.arRiskPct)}
              </span>
            </div>
            <ul className="space-y-3">
              {BUCKET_ORDER.map((bucket) => {
                const found = data.buckets.find((b) => b.bucket === bucket);
                const amount = found ? Number(found.amount) : 0;
                const pct = maxAmount === 0 ? 0 : (amount / maxAmount) * 100;
                return (
                  <li
                    key={bucket}
                    className="grid grid-cols-[minmax(76px,auto)_1fr_auto] items-center gap-3 sm:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className={cn("size-2.5 shrink-0 rounded-sm", AR_BUCKET_GRADIENT[bucket])}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-numeric text-[13px] font-semibold">{bucket}</span>
                        <span className="text-muted-foreground/80 text-[10px] tracking-wider uppercase">
                          {AR_BUCKET_HINT[bucket]}
                        </span>
                      </div>
                    </div>
                    <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                      <div
                        aria-hidden
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          AR_BUCKET_GRADIENT[bucket],
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right">
                      <div className="font-numeric text-sm font-semibold whitespace-nowrap">
                        {amount > 0 ? (
                          formatMoney(amount)
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </div>
                      {found && found.count > 0 && (
                        <div className="text-muted-foreground text-[10px] tabular-nums">
                          {found.count} job{found.count === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EfficiencyRing({ pct }: { pct: number }) {
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const dashOffset = circumference * (1 - clamped / 100);
  const gradientId = "efficiency-ring-gradient";
  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          {/* Platform primary gradient (violet → fuchsia) — matches bg-gradient-primary. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-500)" />
            <stop offset="100%" stopColor="var(--fuchsia-500)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 400ms ease-out" }}
        />
      </svg>
      <span className="font-numeric text-foreground absolute text-[11px] font-bold">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
