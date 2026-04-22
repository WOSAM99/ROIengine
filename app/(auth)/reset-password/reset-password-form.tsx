"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { FormError } from "@/components/ui/form-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        toast.error(err.message);
        return;
      }
      toast.success("Password updated. Signing you in…");
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AuthFormField
        id="password"
        label="New password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        help={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <AuthFormField
        id="confirm"
        label="Confirm new password"
        type="password"
        name="confirm"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <FormError message={error} />
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
