import { Suspense } from "react";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot password · ROI Dashboard",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reset your password</h1>
        <p className="text-muted-foreground text-sm break-words">
          Enter your email and we&apos;ll send a reset link if an account exists for that address.
        </p>
      </header>
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
      <p className="text-muted-foreground text-sm">
        Remembered it?{" "}
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
