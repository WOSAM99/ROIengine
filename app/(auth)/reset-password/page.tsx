import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Set a new password · ROI Dashboard",
};

export default function ResetPasswordPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Set a new password</h1>
        <p className="text-muted-foreground text-sm break-words">
          Choose a new password for your account. We&apos;ll sign you in after.
        </p>
      </header>
      <ResetPasswordForm />
      <p className="text-muted-foreground text-sm">
        <Link
          className="text-foreground font-medium underline-offset-4 hover:underline"
          href="/signin"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
