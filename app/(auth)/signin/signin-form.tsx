"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      const next = searchParams.get("next") ?? "/dashboard";
      router.replace(next);
      router.refresh();
    });
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
      <div className="space-y-1.5">
        <AuthFormField
          id="password"
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-accent-700 text-[12px] font-medium underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
