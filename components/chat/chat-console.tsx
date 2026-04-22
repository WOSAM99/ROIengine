"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuestionPicker } from "./question-picker";
import { AnswerCard } from "./answer-card";
import { FreeformAnswerCard } from "./freeform-answer-card";
import { QUESTIONS, type QuestionKey } from "@/lib/chat/questions";
import type { OverviewStats, StatsResult } from "@/lib/chat/stats";

type ChatCannedResponse = {
  mode: "canned";
  questionKey: QuestionKey;
  question: string;
  narrativeAvailable: boolean;
  narrative: string | null;
  failureReason?: string;
  stats: StatsResult;
};

type ChatFreeformResponse = {
  mode: "freeform";
  question: string;
  narrativeAvailable: boolean;
  narrative: string | null;
  failureReason?: string;
  stats: OverviewStats;
};

type ChatResponse = ChatCannedResponse | ChatFreeformResponse;

type ChatConsoleProps = {
  hasUploads: boolean;
};

export function ChatConsole({ hasUploads }: ChatConsoleProps) {
  const [question, setQuestion] = useState("");
  const [active, setActive] = useState<QuestionKey | null>(null);
  const [pending, setPending] = useState<QuestionKey | "freeform" | null>(null);
  const [answer, setAnswer] = useState<ChatResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  async function callChat(body: object) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error ?? "Chat failed");
    }
    return payload as ChatResponse;
  }

  function pickCanned(key: QuestionKey) {
    if (!hasUploads) {
      toast.error("Upload a file first to ask questions.");
      return;
    }
    setPending(key);
    setActive(key);
    startTransition(async () => {
      try {
        const body = await callChat({ questionKey: key });
        setAnswer(body);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Chat failed");
      } finally {
        setPending(null);
      }
    });
  }

  function submitFreeform(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    if (!hasUploads) {
      toast.error("Upload a file first to ask questions.");
      return;
    }
    setPending("freeform");
    setActive(null);
    startTransition(async () => {
      try {
        const body = await callChat({ question: trimmed });
        setAnswer(body);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Chat failed");
      } finally {
        setPending(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          Suggested questions
        </div>
        <QuestionPicker
          active={active}
          pending={pending === "freeform" ? null : pending}
          onPick={(k) => {
            setQuestion(QUESTIONS[k].label);
            pickCanned(k);
          }}
          disabled={!hasUploads || isPending}
        />
      </div>

      <form
        onSubmit={submitFreeform}
        className="shadow-card bg-card flex flex-col gap-3 rounded-2xl border border-black/5 p-4 sm:flex-row sm:items-center sm:p-5"
      >
        <div className="text-accent-700 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase sm:shrink-0">
          <Sparkles className="size-3.5" />
          Or ask your own
        </div>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Which PM handles the most water jobs and what's their margin?"
          maxLength={500}
          disabled={!hasUploads || isPending}
          className="flex-1"
          aria-label="Ask a question about your data"
        />
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={!hasUploads || isPending || question.trim().length === 0}
          className="shrink-0"
        >
          {pending === "freeform" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send
            </>
          )}
        </Button>
      </form>

      {!hasUploads && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No uploads yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm break-words">
              Upload a CSV or XLSX to start asking questions.
            </p>
          </CardContent>
        </Card>
      )}

      {answer && answer.mode === "canned" && (
        <AnswerCard
          question={answer.question}
          narrativeAvailable={answer.narrativeAvailable}
          narrative={answer.narrative}
          failureReason={answer.failureReason}
          stats={answer.stats}
        />
      )}

      {answer && answer.mode === "freeform" && (
        <FreeformAnswerCard
          question={answer.question}
          narrativeAvailable={answer.narrativeAvailable}
          narrative={answer.narrative}
          failureReason={answer.failureReason}
          uploadFilename={answer.stats.uploadFilename}
        />
      )}
    </div>
  );
}
