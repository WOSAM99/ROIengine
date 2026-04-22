import { Info, KeyRound, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsResult } from "@/lib/chat/stats";
import { formatInt, formatMoney, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { KpiTile } from "@/components/widgets/kpi-tile";

type AnswerCardProps = {
  question: string;
  narrativeAvailable: boolean;
  narrative: string | null;
  failureReason?: string;
  stats: StatsResult;
};

export function AnswerCard({
  question,
  narrativeAvailable,
  narrative,
  failureReason,
  stats,
}: AnswerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="break-words">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <NarrativeBlock
          available={narrativeAvailable}
          narrative={narrative}
          failureReason={failureReason}
        />
        <StatsView stats={stats} />
      </CardContent>
    </Card>
  );
}

function NarrativeBlock({
  available,
  narrative,
  failureReason,
}: {
  available: boolean;
  narrative: string | null;
  failureReason?: string;
}) {
  if (narrative) {
    return (
      <div className="bg-gradient-primary shadow-primary-glow relative overflow-hidden rounded-2xl p-5 text-white sm:p-6">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_70%)] opacity-[0.1]"
        />
        <div className="relative flex items-center gap-2 text-[11px] font-semibold tracking-wider text-white/90 uppercase">
          <Sparkles className="size-3.5" />
          AI narration
        </div>
        <p className="relative mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {narrative}
        </p>
      </div>
    );
  }
  const isKeyMissing = !available;
  const Icon = isKeyMissing ? KeyRound : Info;
  const message = isKeyMissing
    ? "Add ANTHROPIC_API_KEY to .env.local to enable AI narration. Stats below are computed directly from your data."
    : failureReason === "api_error"
      ? "AI narration service error. Stats below are still accurate."
      : "Narration unavailable. Stats below are computed directly from your data.";
  return (
    <div className="bg-muted text-muted-foreground flex items-start gap-2.5 rounded-xl p-3 text-xs">
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <p className="break-words">{message}</p>
    </div>
  );
}

function StatsView({ stats }: { stats: StatsResult }) {
  if (stats.questionKey === "LOST_MONEY") {
    const s = stats.stats;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Total jobs" value={formatInt(s.totalJobs)} tone="slate" />
          <KpiTile label="Unprofitable" value={formatInt(s.unprofitableJobs)} tone="warning" />
          <KpiTile label="Total loss" value={formatMoney(s.totalLoss)} tone="danger" />
          <KpiTile label="Avg loss" value={formatMoney(s.avgLoss)} tone="danger" />
        </div>
        {s.unprofitableJobs === 0 ? (
          <p className="text-muted-foreground text-sm">
            Every job was profitable. Nothing to see here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Breakdown
              title="By job type"
              rows={s.byJobType.map((r) => ({
                key: r.projectType,
                left: r.projectType,
                mid: `${r.count} jobs`,
                right: formatMoney(r.loss),
              }))}
            />
            <Breakdown
              title="By project manager"
              rows={s.byPm.map((r) => ({
                key: r.pm,
                left: r.pm,
                mid: `${r.count} jobs`,
                right: formatMoney(r.loss),
              }))}
            />
          </div>
        )}
      </div>
    );
  }

  if (stats.questionKey === "BEST_PM") {
    const s = stats.stats;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Company avg margin
          </span>
          <span className="font-numeric text-foreground">{formatPct(s.companyAvgMarginPct)}</span>
        </div>
        <div className="border-border/80 bg-muted/40 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-muted-foreground border-border border-b text-[11px] tracking-wider uppercase">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">PM</th>
                <th className="px-3 py-2.5 text-right font-semibold">Margin</th>
                <th className="px-3 py-2.5 text-right font-semibold">vs. Avg</th>
                <th className="px-3 py-2.5 text-right font-semibold">Revenue</th>
                <th className="px-3 py-2.5 text-right font-semibold">Jobs</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((row) => (
                <tr key={row.pm} className="border-border/40 bg-card border-b last:border-b-0">
                  <td className="px-3 py-2.5 break-words">{row.pm}</td>
                  <td className="font-numeric px-3 py-2.5 text-right whitespace-nowrap">
                    {formatPct(row.marginPct)}
                  </td>
                  <td
                    className={cn(
                      "font-numeric px-3 py-2.5 text-right whitespace-nowrap",
                      row.variancePct >= 0 ? "text-success-700" : "text-warning-700",
                    )}
                  >
                    {row.variancePct >= 0 ? "+" : ""}
                    {row.variancePct.toFixed(1)} pts
                  </td>
                  <td className="font-numeric px-3 py-2.5 text-right whitespace-nowrap">
                    {formatMoney(row.revenue)}
                  </td>
                  <td className="font-numeric px-3 py-2.5 text-right whitespace-nowrap">
                    {row.jobCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const s = stats.stats;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Target margin" value={formatPct(s.targetMarginPct, 0)} tone="accent" />
        <KpiTile label="Company margin" value={formatPct(s.companyAvgMarginPct)} tone="slate" />
        <KpiTile label="Jobs below" value={formatInt(s.belowTargetCount)} tone="warning" />
        <KpiTile label="Total impact" value={formatMoney(s.totalEstimatedImpact)} tone="danger" />
      </div>
      {s.drags.length === 0 ? (
        <p className="text-muted-foreground text-sm">No margin drags detected.</p>
      ) : (
        <ol className="divide-border/60 border-border/80 divide-y overflow-hidden rounded-2xl border">
          {s.drags.map((d, i) => (
            <li
              key={`${d.dimension}-${d.label}-${i}`}
              className="bg-card grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 sm:gap-4 sm:px-5"
            >
              <span className="text-muted-foreground font-mono text-sm font-semibold">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 space-y-1">
                <span className="text-accent-700 text-[10px] font-semibold tracking-wider uppercase">
                  {d.dimension === "jobType"
                    ? "Job Type"
                    : d.dimension === "pm"
                      ? "PM Variance"
                      : "A/R Aging"}
                </span>
                <p className="text-sm font-medium break-words">{d.label}</p>
              </div>
              <span className="bg-danger-50 text-danger-700 inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 font-mono text-sm font-semibold tabular-nums">
                −{formatMoney(d.impact)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; left: string; mid: string; right: string }>;
}) {
  return (
    <div className="border-border/80 bg-card rounded-xl border p-4">
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">No data.</p>
      ) : (
        <ul className="divide-border/60 divide-y">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate capitalize">{r.left}</span>
              <span className="text-muted-foreground shrink-0 text-[11px]">{r.mid}</span>
              <span className="font-numeric text-foreground shrink-0">{r.right}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
