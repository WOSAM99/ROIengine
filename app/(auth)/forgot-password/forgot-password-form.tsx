"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthFormField } from "@/components/auth/auth-form-field";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    startTransition(async () => {
      try {
        // We ignore the body. The API always returns { ok: true } regardless of email existence.
        await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
      } catch {
        // Silent — we never leak failure details to the user.
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="bg-success-50 border-success-200 text-success-700 flex items-start gap-3 rounded-2xl border p-4 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <p className="break-words">
          If an account exists for{" "}
          <span className="font-medium">{email.trim() || "that email"}</span>, we&apos;ve sent a
          reset link. Check your inbox (and spam folder just in case).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AuthFormField
        id="email"
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
