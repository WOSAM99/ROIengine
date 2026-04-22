"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        toast.success("Check your email to confirm your account.");
      }
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
      <AuthFormField
        id="password"
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        help={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
