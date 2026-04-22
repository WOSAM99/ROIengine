import Link from "next/link";
import { SignUpForm } from "./signup-form";

export const metadata = {
  title: "Create account · ROI Dashboard",
};

export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Create your account</h1>
        <p className="text-muted-foreground text-sm">Start uploading job data in under a minute.</p>
      </header>
      <SignUpForm />
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link
          className="text-foreground font-medium underline-offset-4 hover:underline"
          href="/signin"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
