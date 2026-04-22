import { Suspense } from "react";
import Link from "next/link";
import { SignInForm } from "./signin-form";

export const metadata = {
  title: "Sign in · ROI Dashboard",
};

function SignInFormFallback() {
  return <div className="text-muted-foreground text-center text-sm">Loading…</div>;
}

export default function SignInPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to view your dashboards.</p>
      </header>
      <Suspense fallback={<SignInFormFallback />}>
        <SignInForm />
      </Suspense>
      <p className="text-muted-foreground text-sm">
        New here?{" "}
        <Link
          className="text-foreground font-medium underline-offset-4 hover:underline"
          href="/signup"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
