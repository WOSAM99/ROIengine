import { Info, KeyRound, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stripInlineMarkdown } from "@/lib/text/strip-markdown";

type FreeformAnswerCardProps = {
  question: string;
  narrativeAvailable: boolean;
  narrative: string | null;
  failureReason?: string;
  uploadFilename: string;
};

export function FreeformAnswerCard({
  question,
  narrativeAvailable,
  narrative,
  failureReason,
  uploadFilename,
}: FreeformAnswerCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="text-accent-700 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
          <Sparkles className="size-3.5" />
          Your question
        </div>
        <CardTitle className="break-words">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {narrative ? (
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
              {stripInlineMarkdown(narrative)}
            </p>
          </div>
        ) : (
          <Banner available={narrativeAvailable} failureReason={failureReason} />
        )}
        <p className="text-muted-foreground text-[11px]">
          Answered from aggregated statistics of <span className="font-mono">{uploadFilename}</span>
          . No raw job-level data was sent to the model.
        </p>
      </CardContent>
    </Card>
  );
}

function Banner({ available, failureReason }: { available: boolean; failureReason?: string }) {
  const isKeyMissing = !available;
  const Icon = isKeyMissing ? KeyRound : Info;
  const message = isKeyMissing
    ? "Add ANTHROPIC_API_KEY to .env.local to enable AI answers for free-form questions."
    : failureReason === "api_error"
      ? "AI service error — try again in a moment."
      : "Couldn't produce an answer. Try rephrasing your question.";
  return (
    <div className="bg-muted text-muted-foreground flex items-start gap-2.5 rounded-xl p-3 text-xs">
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <p className="break-words">{message}</p>
    </div>
  );
}
