"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { FormError } from "@/components/ui/form-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordForm() {
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
      toast.success("Password updated.");
      setPassword("");
      setConfirm("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="text-accent-700 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
        <KeyRound className="size-3.5" />
        Change password
      </div>
      <AuthFormField
        id="new-password"
        label="New password"
        type="password"
        name="new-password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        help={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <AuthFormField
        id="confirm-new-password"
        label="Confirm new password"
        type="password"
        name="confirm-new-password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <FormError message={error} />
      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
